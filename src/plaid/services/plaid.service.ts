import plaidClient from '../../config/plaid';
import prisma from '../../config/prisma';
import { CountryCode, Products, LinkTokenCreateRequest, TransactionsSyncRequest, Transaction as PlaidTransaction, RemovedTransaction } from 'plaid';
import { HttpException } from '../../middleware/errorHandler';
import { encrypt, decrypt } from '../../utils/encryption'; // Assume encryption utils exist
import { Account, ClearedStatus, Payee, PlaidItem, Prisma } from '@prisma/client';
import { PayeeService } from '../../transaction/services/payee.service';

interface SyncResult {
    added: number;
    modified: number;
    removed: number;
    nextCursor: string | undefined;
}

export class PlaidService {
    private payeeService = new PayeeService();

    /**
     * Create a Plaid Link token for the user to initialize the Link flow.
     */
    async createLinkToken(userId: string): Promise<string> {
        const request: LinkTokenCreateRequest = {
            user: {
                client_user_id: userId,
            },
            client_name: 'Envelope Budget App', // Replace with your app name
            // TODO: Customize products based on needs (auth, transactions, identity)
            products: [Products.Auth, Products.Transactions],
            // TODO: Define required country codes
            country_codes: [CountryCode.Us, CountryCode.Ca],
            language: 'en', // TODO: Support more languages?
            // TODO: Add webhook configuration URL from environment variable
            // webhook: process.env.PLAID_WEBHOOK_URL,
            // TODO: Add redirect URI for OAuth flows if needed
            // redirect_uri: process.env.PLAID_REDIRECT_URI,
            // Consider account filters if needed
            // account_filters: { ... }
        };

        try {
            const response = await plaidClient.linkTokenCreate(request);
            return response.data.link_token;
        } catch (error: any) {
            console.error("Error creating Plaid Link token:", error.response?.data || error.message);
            throw new HttpException(500, 'Could not create Plaid Link token');
        }
    }

    /**
     * Exchange a public token received from Plaid Link for an access token and item ID.
     * Stores the item ID and ENCRYPTED access token.
     */
    async exchangePublicToken(userId: string, publicToken: string): Promise<{ itemId: string; institutionName: string | null | undefined }> {
        try {
            const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
            const accessToken = response.data.access_token;
            const itemId = response.data.item_id;
            let institutionName: string | null | undefined = null;

            // Fetch institution details (optional, but good for display)
            let institutionId: string | null | undefined = null;
            try {
                const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
                institutionId = itemResponse.data.item.institution_id;
                if (institutionId) {
                    const instResponse = await plaidClient.institutionsGetById({
                        institution_id: institutionId,
                        country_codes: [CountryCode.Us, CountryCode.Ca] // Match country codes used
                    });
                    institutionName = instResponse.data.institution.name;
                }
            } catch (instError: any) {
                console.warn("Could not fetch institution details:", instError.response?.data || instError.message);
                // Proceed without institution details if it fails
            }

            // Encrypt the access token before storing
            const encryptedAccessToken = encrypt(accessToken);

            // Store the Plaid item linked to the user
            await prisma.plaidItem.create({
                data: {
                    userId,
                    itemId,
                    accessToken: encryptedAccessToken,
                    institutionId: institutionId ?? undefined, // Handle null possibility
                    institutionName: institutionName ?? undefined,
                    // Initialize sync cursor later if using /sync endpoint
                },
            });

            // TODO: Trigger initial account/transaction sync here?

            return { itemId, institutionName };

        } catch (error: any) {
            console.error("Error exchanging Plaid public token:", error.response?.data || error.message);
            // Consider handling specific Plaid error codes (e.g., INVALID_PUBLIC_TOKEN)
            throw new HttpException(500, 'Could not exchange Plaid public token');
        }
    }

    /**
     * Fetch and process transaction updates from Plaid for a given item.
     */
    async syncTransactions(userId: string, itemId: string): Promise<SyncResult> {
        // 1. Get PlaidItem and decrypt access token
        const plaidItem = await prisma.plaidItem.findUnique({
            where: { itemId: itemId }
        });

        if (!plaidItem) throw new HttpException(404, 'Plaid item not found');
        if (plaidItem.userId !== userId) throw new HttpException(403, 'Forbidden: Plaid item does not belong to user');

        const accessToken = decrypt(plaidItem.accessToken);
        let cursor = plaidItem.syncCursor ?? undefined;
        let addedCount = 0;
        let modifiedCount = 0;
        let removedCount = 0;

        // 2. Loop through Plaid sync pages
        let hasMore = true;
        while (hasMore) {
            const request: TransactionsSyncRequest = {
                access_token: accessToken,
                cursor: cursor,
                // count: 100, // Optional: Adjust page size
            };

            try {
                const response = await plaidClient.transactionsSync(request);
                const data = response.data;

                // 3. Process Added Transactions
                for (const plaidTx of data.added) {
                    await this.processUpsertTransaction(userId, plaidItem.id, plaidTx, true);
                    addedCount++;
                }

                // 4. Process Modified Transactions
                for (const plaidTx of data.modified) {
                    await this.processUpsertTransaction(userId, plaidItem.id, plaidTx, false);
                    modifiedCount++;
                }

                // 5. Process Removed Transactions
                for (const removedTx of data.removed) {
                    await this.processRemovedTransaction(userId, removedTx);
                    removedCount++;
                }

                // 6. Update cursor and check for more pages
                hasMore = data.has_more;
                cursor = data.next_cursor;

            } catch (error: any) {
                console.error(`Error during Plaid transaction sync for item ${itemId}:`, error.response?.data || error.message);
                // TODO: Handle specific Plaid errors (e.g., ITEM_LOGIN_REQUIRED -> requires update mode Link token)
                throw new HttpException(500, 'Failed to sync transactions from Plaid');
            }
        }

        // 7. Update PlaidItem with new cursor and sync time
        await prisma.plaidItem.update({
            where: { id: plaidItem.id },
            data: {
                syncCursor: cursor,
                lastSync: new Date(),
            },
        });

        console.log(`Sync complete for item ${itemId}: Added ${addedCount}, Modified ${modifiedCount}, Removed ${removedCount}`);
        return { added: addedCount, modified: modifiedCount, removed: removedCount, nextCursor: cursor };
    }

    /**
     * Processes a single added or modified transaction from Plaid sync.
     * Creates or updates the corresponding transaction in our DB.
     */
    private async processUpsertTransaction(userId: string, plaidItemId: string, plaidTx: PlaidTransaction, isNew: boolean): Promise<void> {
        // Need to wrap this in a transaction potentially, especially if auto-categorization involves DB lookups.
        await prisma.$transaction(async (tx) => {

            // Find the corresponding internal account
            const account = await tx.account.findUnique({ where: { plaidAccountId: plaidTx.account_id } });
            if (!account) {
                console.warn(`Skipping transaction ${plaidTx.transaction_id}: Corresponding internal account not found for Plaid account ${plaidTx.account_id}`);
                return; // Skip if no matching account linked
            }
             // Double check budget ownership (though should be implied by plaidItem linkage)
            if (!account.budgetId) { // Should have budget ID
                 console.error(`Account ${account.id} is missing budgetId`);
                 return;
            }

            // Find or Create Payee
            let payeeId: string | null = null;
            const payeeName = plaidTx.merchant_name || plaidTx.name; // Use merchant name first
            if (payeeName) {
                try {
                    const payee = await this.payeeService.findOrCreatePayeeByName(tx as Prisma.TransactionClient, account.budgetId, payeeName);
                    payeeId = payee.id;
                } catch(payeeError) {
                    console.error(`Error finding/creating payee '${payeeName}' for budget ${account.budgetId}:`, payeeError);
                    // Proceed without payee if creation fails?
                }
            }

            // TODO: Implement basic auto-categorization logic here based on payeeId, name, etc.
            let categoryId: string | null = null;
            // categoryId = await this.autoCategorize(tx, account.budgetId, payeeId, plaidTx.name);

            // Prepare data for upsert
            const transactionData: Prisma.TransactionUncheckedCreateInput = {
                accountId: account.id,
                budgetId: account.budgetId,
                date: new Date(plaidTx.date),
                amount: plaidTx.amount * -1, // Plaid amounts are inverse (positive = outflow for checking)
                memo: plaidTx.name, // Use Plaid's name as memo initially
                plaidTransactionId: plaidTx.transaction_id,
                cleared: plaidTx.pending ? ClearedStatus.UNCLEARED : ClearedStatus.CLEARED,
                approved: false, // Imported transactions require approval
                payeeId: payeeId,
                categoryId: categoryId,
                isTransfer: plaidTx.transaction_type === 'special' && (plaidTx.name.toLowerCase().includes('transfer') || (plaidTx.merchant_name || '').toLowerCase().includes('transfer')), // Basic transfer detection
                // transferAccountId: ??? // Cannot reliably determine transfer pair from Plaid sync alone
            };

            await tx.transaction.upsert({
                where: { plaidTransactionId: plaidTx.transaction_id },
                update: transactionData, // Update with latest data from Plaid
                create: transactionData, // Create if doesn't exist
            });
        });
    }

    /**
     * Processes a removed transaction ID from Plaid sync.
     * Deletes the corresponding transaction in our DB if found.
     */
    private async processRemovedTransaction(userId: string, removedTx: RemovedTransaction): Promise<void> {
        if (!removedTx.transaction_id) return;

        await prisma.$transaction(async (tx) => {
             // Find transaction by plaid ID
            const existingTransaction = await tx.transaction.findUnique({
                where: { plaidTransactionId: removedTx.transaction_id },
                include: { budget: true } // Need budget for ownership check
            });

            // Ensure transaction exists and belongs to the user before deleting
            if (existingTransaction && existingTransaction.budget.userId === userId) {
                // Note: Balance updates are handled dynamically, so no reversion needed here.
                // Need to delete splits if any
                 if (existingTransaction.isSplit) {
                    await tx.splitTransaction.deleteMany({ where: { transactionId: existingTransaction.id } });
                }
                // Delete the transaction
                await tx.transaction.delete({ where: { id: existingTransaction.id } });
                console.log(`Removed transaction corresponding to Plaid ID: ${removedTx.transaction_id}`);
            } else if (existingTransaction) {
                 console.warn(`Attempted to remove transaction ${removedTx.transaction_id} but it did not belong to user ${userId}`);
            } else {
                 console.log(`Received removal for Plaid transaction ${removedTx.transaction_id}, but no corresponding transaction found.`);
            }
        });
    }

    // --- Placeholder for Encryption Utilities --- //
    // These should be implemented properly in '../../utils/encryption'
    // private encrypt(text: string): string {
    //   // Replace with actual encryption logic (e.g., using crypto module, key management)
    //   console.warn("Encryption not implemented! Storing token in plain text (unsafe).");
    //   return text; // !! UNSAFE PLACEHOLDER !!
    // }
    //
    // private decrypt(encryptedText: string): string {
    //   // Replace with actual decryption logic
    //   console.warn("Decryption not implemented!");
    //   return encryptedText; // !! UNSAFE PLACEHOLDER !!
    // }

    // TODO: Add methods for:
    // - Syncing transactions (item/sync/transactions endpoint)
    // - Handling webhooks (optional but recommended)
    // - Removing Plaid items
    // - Updating Link token (for expired items)
}
