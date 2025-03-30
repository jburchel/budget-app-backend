# Backend Development Checklist: Envelope Budgeting App

This checklist outlines the backend-specific development steps for the Envelope Budgeting App, derived from the main development plan.

**Phases:**

- [Backend Development Checklist: Envelope Budgeting App](#backend-development-checklist-envelope-budgeting-app)
  - [Phase 0: Foundation & Setup (Backend)](#phase-0-foundation--setup-backend)
  - [Phase 2: Backend Foundation & User/Budget Management](#phase-2-backend-foundation--userbudget-management)
  - [Phase 3: Core Budgeting Feature - Budget Screen (Backend)](#phase-3-core-budgeting-feature---budget-screen-backend)
  - [Phase 4: Core Budgeting Feature - Accounts & Transactions (Backend)](#phase-4-core-budgeting-feature---accounts--transactions-backend)
  - [Phase 5: Connecting the Dots - Linking, Reconciliation, Transfers (Backend)](#phase-5-connecting-the-dots---linking-reconciliation-transfers-backend)
  - [Phase 6: Enhancing the Budget - Goals & Overspending Logic (Backend)](#phase-6-enhancing-the-budget---goals--overspending-logic-backend)
  - [Phase 7: Credit Card Handling (Backend)](#phase-7-credit-card-handling-backend)
  - [Phase 8: Reporting (Backend)](#phase-8-reporting-backend)
  - [Phase 9: Platform Specifics, Polish & Deployment (Backend)](#phase-9-platform-specifics-polish--deployment-backend)
  - [Phase 10: Monetization & Post-Launch (Backend)](#phase-10-monetization--post-launch-backend)

---

## Phase 0: Foundation & Setup (Backend)

**Goal:** Prepare the development environment, repositories, and basic project structures for the backend.

**Checklist:**

*   [x] **Repository Setup:**
    *   [x] Create Git repository (Backend).
    *   [x] Establish branching strategy (e.g., Gitflow).
*   [x] **Technology Stack Installation & Configuration:**
    *   [x] Ensure developers have necessary SDKs, runtimes, IDEs for backend development.
    *   [x] Set up linters, formatters relevant to the backend stack.
*   [x] **Project Initialization:**
    *   [x] Initialize basic backend project structure via CLI/template.
*   [x] **Cloud Infrastructure Setup (Basic):**
    *   [x] Set up development database instance (PostgreSQL).
    *   [ ] Configure basic CI/CD pipeline (skeleton builds/tests for backend).
*   [x] **API Design Tool:**
    *   [x] Set up Swagger/OpenAPI or Postman collections for backend APIs.
*   [x] **Dependency Management:**
    *   [x] Initialize dependency file (`package.json`, `pom.xml`, etc.) with backend essentials.

---

## Phase 2: Backend Foundation & User/Budget Management

**Goal:** Establish the backend service, database connection, and core APIs for user authentication and basic budget management.

**Checklist:**

*   [x] **Backend: Project Setup & DB Connection:**
    *   [x] Configure backend framework (Express, NestJS, Spring Boot, etc.).
    *   [x] Establish database connection and ORM setup (Prisma, TypeORM, Hibernate, etc.).
*   [x] **Backend: Database Schema (Initial):**
    *   [x] Define and migrate schemas for `Users`, `Budgets`.
*   [x] **Backend: Authentication API Endpoints:**
    *   [x] Implement `POST /auth/register` endpoint.
    *   [x] Implement `POST /auth/login` endpoint (JWT/Session generation).
    *   [x] Implement authentication middleware for protected routes.
    *   [x] Implement basic `POST /auth/logout` endpoint.
    *   [x] Implement password reset flow APIs (request token, reset password).
*   [x] **Backend: User Profile API Endpoints:**
    *   [x] Implement `GET /user/profile` endpoint.
    *   [x] Implement `PUT /user/profile` endpoint.
    *   [x] Implement password change endpoint.
*   [x] **Backend: Basic Budget API Endpoints:**
    *   [x] Implement `GET /budgets` endpoint.
    *   [x] Implement `POST /budgets` endpoint.
    *   [x] Implement `GET /budgets/{budgetId}` endpoint.
    *   [x] Implement `PUT /budgets/{budgetId}` endpoint.
    *   [x] Implement `DELETE /budgets/{budgetId}` endpoint.
*   [ ] **Testing:**
    *   [ ] Write unit/integration tests for Backend Auth logic & APIs.

---

## Phase 3: Core Budgeting Feature - Budget Screen (Backend)

**Goal:** Implement the backend logic and APIs supporting the main budgeting interface.

**Checklist:**

*   [x] **Backend: Database Schema (Budgeting Core):**
    *   [x] Define and migrate schemas for `CategoryGroups`, `Categories`, `BudgetEntries`.
*   [x] **Backend: Budget Calculation Logic:**
    *   [x] Develop core logic to calculate `TBB`, `Activity`, `Available` per category/month. (Requires Transaction model access).
*   [x] **Backend: Budget View API Endpoint:**
    *   [x] Implement `GET /budgets/{budgetId}/budget_view?month=YYYY-MM` endpoint returning full grid state.
*   [x] **Backend: Budget Interaction APIs:**
    *   [x] Implement CRUD APIs for `CategoryGroups`.
    *   [x] Implement CRUD APIs for `Categories`.
    *   [x] Implement `POST /budgets/{budgetId}/assign` API.
    *   [x] Implement `POST /budgets/{budgetId}/move_money` API.
*   [ ] **Testing:**
    *   [ ] Write backend tests for calculation logic and budget APIs.

---

## Phase 4: Core Budgeting Feature - Accounts & Transactions (Backend)

**Goal:** Implement backend logic and APIs for managing accounts and transactions.

**Checklist:**

*   [x] **Backend: Database Schema (Accounts & Transactions):**
    *   [x] Define and migrate schemas for `Accounts`, `Transactions`, `Payees`, `SplitTransactions`.
*   [x] **Backend: Account Management APIs:**
    *   [x] Implement `GET /accounts` endpoint.
    *   [x] Implement `POST /accounts` endpoint.
    *   [x] Implement `PUT /accounts/{accountId}` endpoint.
    *   [x] Implement `DELETE /accounts/{accountId}` endpoint (Close logic).
    *   [x] Differentiate Budget vs. Tracking account logic.
*   [x] **Backend: Transaction Management APIs:**
    *   [x] Implement `POST /transactions` endpoint (handle manual, split). Update balances/activity.
    *   [x] Implement `GET /transactions` endpoint with filtering/sorting/pagination.
    *   [x] Implement `PUT /transactions/{transactionId}` endpoint.
    *   [x] Implement `DELETE /transactions/{transactionId}` endpoint.
    *   [x] Implement Payee management logic (auto-create, suggest).
    *   [x] Implement Payee CRUD APIs (`GET`, `PUT`).
*   [x] **Backend: Balance Calculation:**
    *   [x] Implement reliable logic for `Working Balance` and `Cleared Balance`.
*   [ ] **Testing:**
    *   [ ] Write backend tests for transaction logic, balance calculations, APIs.

---

## Phase 5: Connecting the Dots - Linking, Reconciliation, Transfers (Backend)

**Goal:** Implement backend integration for bank linking, reconciliation, and transfers.

**Checklist:**

*   [x] **Backend: Bank Aggregator Integration (Plaid/Finicity):**
    *   [x] Set up Plaid/aggregator developer account.
    *   [x] Implement `POST /plaid/create_link_token` endpoint.
    *   [x] Implement `POST /plaid/exchange_public_token` endpoint (secure token storage).
    *   [x] Implement `POST /plaid/sync_transactions` endpoint (fetch & process).
    *   [ ] Implement `POST /plaid/webhook` endpoint (receive updates).
    *   [x] Develop logic for processing/storing imported transactions (status, auto-categorization attempt, duplicate handling).
*   [x] **Backend: Reconciliation Logic & APIs:**
    *   [x] Add `cleared_status` (enum includes `RECONCILED` state) fields to Transactions schema.
    *   [x] Implement `POST /accounts/{accountId}/reconcile/start` API.
    *   [x] Implement API(s) to mark transactions as 'Cleared' (Use PUT /transactions/:id).
    *   [x] Implement `POST /accounts/{accountId}/reconcile/adjust` API (Use POST /transactions).
    *   [x] Implement `POST /accounts/{accountId}/reconcile/finish` API (lock transactions).
*   [x] **Backend: Transfer Logic:**
    *   [x] Implement transfer logic (via `POST /transactions` or dedicated endpoint).
    *   [x] Handle Budget<->Budget transfers (no category, no TBB impact).
    *   [x] Handle Budget<->Tracking transfers (requires category, impacts TBB).
*   [ ] **Testing:**
    *   [ ] Test Plaid integration (sandbox).
    *   [ ] Test reconciliation scenarios.
    *   [ ] Test transfer scenarios.

---

## Phase 6: Enhancing the Budget - Goals & Overspending Logic (Backend)

**Goal:** Implement backend logic for category goals and overspending handling.

**Checklist:**

*   [x] **Backend: Database Schema (Goals):**
    *   [x] Define and migrate schema for `Goals`, linked to `Categories`.
*   [x] **Backend: Goal Logic & APIs:**
    *   [x] Implement CRUD APIs for `Goals`.
    *   [x] Enhance `GET /budget_view` to include goal progress calculation.
*   [x] **Backend: Overspending Logic:**
    *   [x] Enhance `GET /budget_view` to flag negative 'Available' balances.
    *   [ ] Implement logic for consequences of *uncovered* overspending (Cash -> next TBB down; Credit -> implicit debt). **(Deferred)**
*   [ ] **Testing:**
    *   [ ] Test goal calculations.
    *   [ ] Test overspending detection and consequences.

---

## Phase 7: Credit Card Handling (Backend)

**Goal:** Implement the specific YNAB methodology for credit cards on the backend.

**Checklist:**

*   [x] **Backend: Credit Card Account Type Logic:**
    *   [x] Ensure 'Credit Card' account type exists.
    *   [x] Implement auto-creation/linking of 'Credit Card Payment' category.
*   [x] **Backend: Transaction Processing Modification:**
    *   [x] Modify transaction logic: Budgeted CC spending moves funds from spending category `Available` to CC Payment category `Available` (create/update/delete).
*   [x] **Backend: Credit Overspending Logic:**
    *   [x] Handle CC spending > category `Available`: Category goes negative, only available funds move to CC Payment category, overspending creates new debt (Basic implementation in place, requires testing).
*   [x] **Backend: Payment Transfer Logic:**
    *   [x] Ensure Cash -> CC transfers decrease CC Payment category `Available` (create/update/delete).
*   [x] **Backend: Return/Refund Logic:**
    *   [x] Handle CC refunds correctly (credit TBB/category, adjust CC Payment `Available`) (create/update/delete).
*   [ ] **Backend: API Updates:**
    *   [ ] Ensure `/budget_view` accurately reflects CC Payment category balances. *(Needs Verification)*
*   [ ] **Testing:**
    *   [ ] Test all CC scenarios: budgeted spending, overspending (covered/uncovered), payments, returns. *(TODO: Refine `revertBudgetAdjustmentForCreditSpending`)*

---

## Phase 8: Reporting (Backend)

**Goal:** Implement backend APIs for financial reports.

**Checklist:**

*   [x] **Backend: Reporting APIs:**
    *   [x] Implement `GET /reports/spending` API (by category/payee).
    *   [x] Implement `GET /reports/income-expense` API
    *   [x] Implement `GET /reports/net_worth` API
    *   [x] Implement `GET /reports/age_of_money` API (implement calculation).
      * Define response interface (`AgeOfMoneyResponse`).
      * Implement service logic to calculate AoM based on cash balances and recent spending rate (excluding transfers/CC payments).
      * Implement controller method and route.
      * Add Swagger documentation.
    *   [ ] Ensure reporting endpoints support filtering.
*   [ ] **Backend: Performance Optimization:**
    *   [ ] Implement indexing, caching, or summary tables for reports.
*   [ ] **Testing:**
    *   [ ] Validate report accuracy. Test filters. Performance test endpoints.

---

## Phase 9: Platform Specifics, Polish & Deployment (Backend)

**Goal:** Refine backend, secure, optimize, and deploy.

**Checklist:**

*   [ ] **Backend: Security Hardening & Optimization:**
    *   [ ] Conduct security review (OWASP Top 10).
    *   [x] Implement rate limiting (e.g., `express-rate-limit`).
    *   [x] Review dependencies for vulnerabilities (`npm audit`).
    *   [x] Set appropriate HTTP security headers (Helmet.js).
    *   [x] Implement Multi-Factor Authentication (MFA/2FA) option (API endpoints - TOTP).
    *   [ ] Implement MFA Recovery Codes.
    *   [x] Implement robust logging and monitoring. *(Basic logging with morgan in place, advanced setup deferred)*
      *   [ ] Implement structured logging (e.g., Winston/Pino).
      *   [ ] Integrate error tracking service (e.g., Sentry).
      *   [ ] Set up Application Performance Monitoring (APM).
*   [ ] **Backend: Synchronization:**
    *   [ ] Ensure robust real-time sync support if needed (WebSockets setup, conflict resolution logic).
*   [ ] **Deployment Pipeline:**
    *   [ ] Configure production environments (API, DB).
    *   [ ] Finalize CI/CD pipelines for staging/production deployment for backend.
*   [ ] **Testing:**
    *   [ ] Comprehensive E2E testing involving backend APIs.
    *   [ ] User Acceptance Testing (UAT) focused on backend functionality.
    *   [ ] Performance and Load testing for backend APIs.
    *   [ ] Security testing/penetration testing for backend.
*   [ ] **Polish:**
    *   [ ] Optimize API performance (queries, caching) - *This is where we'll revisit performance.*
    *   [ ] Refine error handling and provide consistent error responses. *(NODE_ENV check done; Service layer reviewed; Budget controller refactored w/ Zod)*
    *   [ ] Apply validation schemas (zod) comprehensively to all endpoints. *(Budget module mostly done)*
    *   [ ] Write comprehensive integration and end-to-end tests.
    *   [ ] Finalize API documentation (Swagger).
*   [ ] **Platform Specifics:** *(If deploying to a specific platform like AWS, Heroku, etc. - steps may vary)*
    *   [x] Configure environment variables for production.
    *   [x] Set up CI/CD pipeline. *(Acknowledged as manual/platform-specific)*

---

## Phase 10: Monetization & Post-Launch (Backend)

**Goal:** Implement backend support for subscription model and prepare for ongoing operations.

**Checklist:**

*   [ ] **Backend: Payment Provider Integration (Stripe/etc.):**
    *   [x] Integrate payment provider API (subscriptions, payments). *(Checkout & Portal sessions implemented)*
    *   [x] Implement webhooks for subscription events. *(Basic handler implemented)*
    *   [x] Update User model for subscription tracking.
    *   [x] Implement access control logic based on subscription status. *(Middleware created)*
*   [x] **Free Trial Logic:**
    *   [x] Implement backend logic for 30-34 day free trial. *(Handled via Stripe checkout trial_period_days & webhook trialEndDate update)*
*   [ ] **App Store / Play Store Receipt Validation:**
    *   [ ] Implement server-side receipt validation endpoints. *(Deferred/Native App Specific)*
*   [ ] **Post-Launch:**
    *   [ ] Set up active monitoring (performance, errors, costs) for backend services. *(Process/Planning - Covered by deferred logging/APM setup)*
    *   [ ] Establish plan for ongoing maintenance (bugs, updates, security) for backend. *(Process/Planning)*

--- 