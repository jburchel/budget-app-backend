-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "amount" DECIMAL NOT NULL,
    "memo" TEXT,
    "cleared" TEXT NOT NULL DEFAULT 'UNCLEARED',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "isTransfer" BOOLEAN NOT NULL DEFAULT false,
    "transferAccountId" TEXT,
    "transferGroupId" TEXT,
    "isSplit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "payeeId" TEXT,
    "categoryId" TEXT,
    "budgetId" TEXT NOT NULL,
    "plaidTransactionId" TEXT,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_payeeId_fkey" FOREIGN KEY ("payeeId") REFERENCES "Payee" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "approved", "budgetId", "categoryId", "cleared", "createdAt", "date", "id", "isSplit", "isTransfer", "memo", "payeeId", "plaidTransactionId", "transferAccountId", "updatedAt") SELECT "accountId", "amount", "approved", "budgetId", "categoryId", "cleared", "createdAt", "date", "id", "isSplit", "isTransfer", "memo", "payeeId", "plaidTransactionId", "transferAccountId", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_plaidTransactionId_key" ON "Transaction"("plaidTransactionId");
CREATE INDEX "Transaction_transferGroupId_idx" ON "Transaction"("transferGroupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
