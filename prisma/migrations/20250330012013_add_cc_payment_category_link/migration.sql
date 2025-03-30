-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "onBudget" BOOLEAN NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0,
    "clearedBalance" DECIMAL NOT NULL DEFAULT 0,
    "unclearedBalance" DECIMAL NOT NULL DEFAULT 0,
    "officialName" TEXT,
    "note" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "budgetId" TEXT NOT NULL,
    "plaidItemId" TEXT,
    "plaidAccountId" TEXT,
    "paymentCategoryId" TEXT,
    CONSTRAINT "Account_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Account_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Account_paymentCategoryId_fkey" FOREIGN KEY ("paymentCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("balance", "budgetId", "clearedBalance", "createdAt", "id", "isClosed", "name", "note", "officialName", "onBudget", "plaidAccountId", "plaidItemId", "type", "unclearedBalance", "updatedAt") SELECT "balance", "budgetId", "clearedBalance", "createdAt", "id", "isClosed", "name", "note", "officialName", "onBudget", "plaidAccountId", "plaidItemId", "type", "unclearedBalance", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_plaidAccountId_key" ON "Account"("plaidAccountId");
CREATE UNIQUE INDEX "Account_paymentCategoryId_key" ON "Account"("paymentCategoryId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
