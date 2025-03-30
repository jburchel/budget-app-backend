# Development Plan Checklist: Envelope Budgeting App (YNAB Clone)

This checklist outlines the development steps for the Envelope Budgeting App, based on the detailed specification.

**Phases:**

- [Development Plan Checklist: Envelope Budgeting App (YNAB Clone)](#development-plan-checklist-envelope-budgeting-app-ynab-clone)
  - [Phase 0: Foundation \& Setup](#phase-0-foundation--setup)
  - [Phase 1: Core UI Shell \& Authentication (Frontend Focus)](#phase-1-core-ui-shell--authentication-frontend-focus)
  - [Phase 2: Backend Foundation \& User/Budget Management](#phase-2-backend-foundation--userbudget-management)
  - [Phase 3: Core Budgeting Feature - Budget Screen](#phase-3-core-budgeting-feature---budget-screen)
  - [Phase 4: Core Budgeting Feature - Accounts \& Transactions](#phase-4-core-budgeting-feature---accounts--transactions)
  - [Phase 5: Connecting the Dots - Linking, Reconciliation, Transfers](#phase-5-connecting-the-dots---linking-reconciliation-transfers)
  - [Phase 6: Enhancing the Budget - Goals \& Overspending Logic](#phase-6-enhancing-the-budget---goals--overspending-logic)
  - [Phase 7: Credit Card Handling](#phase-7-credit-card-handling)
  - [Phase 8: Reporting](#phase-8-reporting)
  - [Phase 9: Platform Specifics, Polish \& Deployment](#phase-9-platform-specifics-polish--deployment)
  - [Phase 10: Monetization \& Post-Launch](#phase-10-monetization--post-launch)

---

## Phase 0: Foundation & Setup

**Goal:** Prepare the development environment, repositories, and basic project structures.

**Checklist:**

*   [ ] **Repository Setup:**
    *   [ ] Create Git repositories (Web FE, Backend, iOS FE, Android FE).
    *   [ ] Establish branching strategy (e.g., Gitflow).
*   [ ] **Technology Stack Installation & Configuration:**
    *   [ ] Ensure developers have necessary SDKs, runtimes, IDEs.
    *   [ ] Set up linters, formatters (ESLint, Prettier, SwiftLint, Ktlint).
*   [ ] **Project Initialization:**
    *   [ ] Initialize basic project structures via CLIs (Web, Backend, iOS, Android).
*   [ ] **Cloud Infrastructure Setup (Basic):**
    *   [ ] Set up development database instance (PostgreSQL).
    *   [ ] Configure basic CI/CD pipeline (skeleton builds/tests).
*   [ ] **API Design Tool (Optional):**
    *   [ ] Set up Swagger/OpenAPI or Postman collections.
*   [ ] **Dependency Management:**
    *   [ ] Initialize dependency files (`package.json`, `Podfile`/SPM, `build.gradle`) with essentials.

---

## Phase 1: Core UI Shell & Authentication (Frontend Focus)

**Goal:** Build the basic application structure and user interface for login and registration.

**Checklist:**

*   [ ] **Web Frontend: Basic Layout & Routing:**
    *   [ ] Implement main application layout (Header, Nav, Content, Footer).
    *   [ ] Set up client-side routing (`/login`, `/register`, `/budget`, etc.) & protected routes.
*   [ ] **Web Frontend: Authentication UI Components:**
    *   [ ] Create reusable Login form component.
    *   [ ] Create reusable Registration form component.
    *   [ ] Implement basic client-side form validation.
*   [ ] **Web Frontend: Placeholder Screens:**
    *   [ ] Create simple placeholder components for main app screens (Budget, Accounts, etc.).
*   [ ] **Web Frontend: State Management Setup:**
    *   [ ] Integrate state management library (Redux, Zustand, Pinia, etc.).
    *   [ ] Set up initial store structure for auth state & user info.
*   [ ] **(Parallel) Mobile Frontend: Basic Layout & Navigation:**
    *   [ ] Set up basic native navigation (Tab Bar, Nav Controller).
    *   [ ] Create native placeholder screens/views.
*   [ ] **(Parallel) Mobile Frontend: Authentication UI:**
    *   [ ] Build native Login screen (iOS & Android).
    *   [ ] Build native Registration screen (iOS & Android).

---

## Phase 2: Backend Foundation & User/Budget Management

**Goal:** Establish the backend service, database connection, and core APIs for user authentication and basic budget management.

**Checklist:**

*   [ ] **Backend: Project Setup & DB Connection:**
    *   [ ] Configure backend framework (Express, NestJS, etc.).
    *   [ ] Establish database connection and ORM setup (Prisma, TypeORM, etc.).
*   [ ] **Backend: Database Schema (Initial):**
    *   [ ] Define and migrate schemas for `Users`, `Budgets`.
*   [ ] **Backend: Authentication API Endpoints:**
    *   [ ] Implement `POST /auth/register` endpoint.
    *   [ ] Implement `POST /auth/login` endpoint (JWT/Session generation).
    *   [ ] Implement authentication middleware for protected routes.
    *   [ ] Implement basic `POST /auth/logout` endpoint.
    *   [ ] Implement password reset flow APIs (request token, reset password).
*   [ ] **Backend: User Profile API Endpoints:**
    *   [ ] Implement `GET /user/profile` endpoint.
    *   [ ] Implement `PUT /user/profile` endpoint.
    *   [ ] Implement password change endpoint.
*   [ ] **Backend: Basic Budget API Endpoints:**
    *   [ ] Implement `GET /budgets` endpoint.
    *   [ ] Implement `POST /budgets` endpoint.
    *   [ ] Implement `GET /budgets/{budgetId}` endpoint.
    *   [ ] Implement `PUT /budgets/{budgetId}` endpoint.
*   [ ] **Integration: Frontend <-> Backend Authentication:**
    *   [ ] Connect Frontend Login/Register forms to Backend APIs.
    *   [ ] Implement secure token storage on frontend.
    *   [ ] Implement UI updates based on auth state.
    *   [ ] Implement token passing in API request headers.
*   [ ] **Testing:**
    *   [ ] Write unit/integration tests for Backend Auth logic & APIs.
    *   [ ] Test frontend auth flow.

---

## Phase 3: Core Budgeting Feature - Budget Screen

**Goal:** Implement the main budgeting interface.

**Checklist:**

*   [ ] **Backend: Database Schema (Budgeting Core):**
    *   [ ] Define and migrate schemas for `CategoryGroups`, `Categories`, `BudgetEntries`.
*   [ ] **Backend: Budget Calculation Logic:**
    *   [ ] Develop core logic to calculate `TBB`, `Activity`, `Available` per category/month. (Requires Transaction model access - initially mock).
*   [ ] **Backend: Budget View API Endpoint:**
    *   [ ] Implement `GET /budgets/{budgetId}/budget_view?month=YYYY-MM` endpoint returning full grid state.
*   [ ] **Backend: Budget Interaction APIs:**
    *   [ ] Implement CRUD APIs for `CategoryGroups`.
    *   [ ] Implement CRUD APIs for `Categories`.
    *   [ ] Implement `POST /budgets/{budgetId}/assign` API.
    *   [ ] Implement `POST /budgets/{budgetId}/move_money` API.
*   [ ] **Web Frontend: Budget Screen UI:**
    *   [ ] Build spreadsheet-like grid component.
    *   [ ] Implement collapsible/expandable category groups.
    *   [ ] Display Category Name, Assigned (editable), Activity (display), Available (display, color-coded).
    *   [ ] Display TBB prominently, update dynamically.
    *   [ ] Implement Month Navigation UI.
*   [ ] **Web Frontend: Budget Interaction Implementation:**
    *   [ ] Connect Budget Screen grid to `GET /budget_view` API.
    *   [ ] Connect 'Assigned' inputs to `POST /assign` API.
    *   [ ] Implement 'Move Money' UI and connect to `POST /move_money` API.
    *   [ ] Implement Category/Group Add/Edit/Delete UI and connect to APIs.
    *   [ ] Implement basic "Quick Budgeting" buttons UI.
*   [ ] **(Parallel) Mobile Frontend: Budget Screen UI & Interaction:**
    *   [ ] Build native Budget Screen UI adaptation.
    *   [ ] Connect native UI to backend APIs (`/budget_view`, `/assign`, `/move_money`, Category CRUD).
*   [ ] **Testing:**
    *   [ ] Write backend tests for calculation logic and budget APIs.
    *   [ ] Write frontend component tests and E2E tests for budget interactions.

---

## Phase 4: Core Budgeting Feature - Accounts & Transactions

**Goal:** Implement screens for managing accounts and transactions.

**Checklist:**

*   [ ] **Backend: Database Schema (Accounts & Transactions):**
    *   [ ] Define and migrate schemas for `Accounts`, `Transactions`, `Payees`, `SplitTransactions`.
*   [ ] **Backend: Account Management APIs:**
    *   [ ] Implement `GET /accounts` endpoint.
    *   [ ] Implement `POST /accounts` endpoint.
    *   [ ] Implement `PUT /accounts/{accountId}` endpoint.
    *   [ ] Implement `DELETE /accounts/{accountId}` endpoint (Close logic).
    *   [ ] Differentiate Budget vs. Tracking account logic.
*   [ ] **Backend: Transaction Management APIs:**
    *   [ ] Implement `POST /transactions` endpoint (handle manual, split). Update balances/activity.
    *   [ ] Implement `GET /transactions` endpoint with filtering/sorting.
    *   [ ] Implement `PUT /transactions/{transactionId}` endpoint.
    *   [ ] Implement `DELETE /transactions/{transactionId}` endpoint.
    *   [ ] Implement Payee management logic (auto-create, suggest).
    *   [ ] Implement Payee CRUD APIs (`GET`, `PUT`).
*   [ ] **Backend: Balance Calculation:**
    *   [ ] Implement reliable logic for `Working Balance` and `Cleared Balance`.
*   [ ] **Web Frontend: Accounts Screen UI:**
    *   [ ] Build UI to list accounts (grouped by Budget/Tracking).
    *   [ ] Display Account details (Name, Type, Balances).
    *   [ ] Implement Add/Edit/Close account forms/modals.
*   [ ] **Web Frontend: Transaction Register UI:**
    *   [ ] Build transaction list/table component.
    *   [ ] Implement columns (Account, Date, Payee, Category, etc.).
    *   [ ] Implement filtering and sorting controls.
*   [ ] **Web Frontend: Transaction Entry UI:**
    *   [ ] Build manual transaction entry form/modal.
    *   [ ] Implement Payee autocomplete.
    *   [ ] Implement Category selection.
    *   [ ] Implement Split Transaction UI.
*   [ ] **Web Frontend: Integration:**
    *   [ ] Connect Accounts screen to Account APIs.
    *   [ ] Connect Transaction Register to `GET /transactions` API (implement pagination/infinite scroll).
    *   [ ] Connect Transaction Entry form to `POST /transactions` API.
    *   [ ] Ensure edits/deletes update relevant views.
*   [ ] **(Parallel) Mobile Frontend: Accounts & Transactions:**
    *   [ ] Build native Account List screen.
    *   [ ] Build native Transaction Register screen.
    *   [ ] Build native Transaction Entry/Edit forms.
    *   [ ] Connect native screens to backend APIs.
*   [ ] **Testing:**
    *   [ ] Write backend tests for transaction logic, balance calculations, APIs.
    *   [ ] Write frontend tests for display, forms, filtering. E2E test transaction lifecycle.

---

## Phase 5: Connecting the Dots - Linking, Reconciliation, Transfers

**Goal:** Integrate bank linking, reconciliation, and transfers.

**Checklist:**

*   [ ] **Backend: Bank Aggregator Integration (Plaid/Finicity):**
    *   [ ] Set up Plaid/aggregator developer account.
    *   [ ] Implement `POST /plaid/create_link_token` endpoint.
    *   [ ] Implement `POST /plaid/exchange_public_token` endpoint (secure token storage).
    *   [ ] Implement `POST /plaid/sync_transactions` endpoint (fetch & process).
    *   [ ] Implement `POST /plaid/webhook` endpoint (receive updates).
    *   [ ] Develop logic for processing/storing imported transactions (status, auto-categorization attempt, duplicate handling).
*   [ ] **Web Frontend: Bank Linking UI:**
    *   [ ] Integrate Plaid Link SDK/component.
    *   [ ] Handle communication with backend token endpoints.
    *   [ ] Display linked account status, sync trigger, error handling.
*   [ ] **Web Frontend: Imported Transaction Approval UI:**
    *   [ ] Create UI for reviewing imported transactions.
    *   [ ] Allow category assignment/confirmation & approval.
    *   [ ] Implement UI for matching imports with manual entries.
    *   [ ] Implement UI for splitting imported transactions.
*   [ ] **Backend: Reconciliation Logic & APIs:**
    *   [ ] Add `cleared_status` and `reconciliation_locked` fields to Transactions schema.
    *   [ ] Implement `POST /accounts/{accountId}/reconcile/start` API.
    *   [ ] Implement API(s) to mark transactions as 'Cleared'.
    *   [ ] Implement `POST /accounts/{accountId}/reconcile/adjust` API.
    *   [ ] Implement `POST /accounts/{accountId}/reconcile/finish` API (lock transactions).
*   [ ] **Web Frontend: Reconciliation Workflow UI:**
    *   [ ] Build step-by-step reconciliation UI (Enter balance -> Compare -> Mark cleared -> Adjust -> Finish).
*   [ ] **Backend: Transfer Logic:**
    *   [ ] Implement transfer logic (via `POST /transactions` or dedicated endpoint).
    *   [ ] Handle Budget<->Budget transfers (no category, no TBB impact).
    *   [ ] Handle Budget<->Tracking transfers (requires category, impacts TBB).
*   [ ] **Web Frontend: Transfer UI:**
    *   [ ] Update Transaction Entry form to support transfers.
*   [ ] **(Parallel) Mobile Frontend: Linking, Reconciliation, Transfers:**
    *   [ ] Implement native UIs for these features.
    *   [ ] Integrate Plaid mobile SDKs if applicable.
*   [ ] **Testing:**
    *   [ ] Test Plaid integration (sandbox).
    *   [ ] Test reconciliation scenarios.
    *   [ ] Test transfer scenarios.

---

## Phase 6: Enhancing the Budget - Goals & Overspending Logic

**Goal:** Implement category goals and overspending handling.

**Checklist:**

*   [ ] **Backend: Database Schema (Goals):**
    *   [ ] Define and migrate schema for `Goals`, linked to `Categories`.
*   [ ] **Backend: Goal Logic & APIs:**
    *   [ ] Implement CRUD APIs for `Goals`.
    *   [ ] Enhance `GET /budget_view` API to include goal progress calculations.
*   [ ] **Web Frontend: Goal UI:**
    *   [ ] Implement UI to create/edit goals (e.g., from category row).
    *   [ ] Display goal progress visually on budget grid (bars, colors, tooltips).
*   [ ] **Web Frontend: Quick Budgeting Enhancements:**
    *   [ ] Implement "Underfunded" quick budget option using goal data.
*   [ ] **Backend: Overspending Logic:**
    *   [ ] Enhance `GET /budget_view` to flag negative 'Available' balances.
    *   [ ] Implement logic for consequences of *uncovered* overspending (Cash -> next TBB down; Credit -> implicit debt).
*   [ ] **Web Frontend: Overspending UI:**
    *   [ ] Highlight overspent categories clearly (Red).
    *   [ ] Provide clear prompts/buttons to "Cover Overspending" (link to Move Money).
*   [ ] **(Parallel) Mobile Frontend: Goals & Overspending:**
    *   [ ] Implement native UIs for goal setting/viewing.
    *   [ ] Implement native UI for overspending indicators/resolution.
*   [ ] **Testing:**
    *   [ ] Test goal calculations and display.
    *   [ ] Test overspending detection, covering, and consequences.

---

## Phase 7: Credit Card Handling

**Goal:** Implement the specific YNAB methodology for credit cards.

**Checklist:**

*   [ ] **Backend: Credit Card Account Type Logic:**
    *   [ ] Ensure 'Credit Card' account type exists.
    *   [ ] Implement auto-creation/linking of 'Credit Card Payment' category.
*   [ ] **Backend: Transaction Processing Modification:**
    *   [ ] Modify transaction logic: Budgeted CC spending moves funds from spending category `Available` to CC Payment category `Available`.
*   [ ] **Backend: Credit Overspending Logic:**
    *   [ ] Handle CC spending > category `Available`: Category goes negative, only available funds move to CC Payment category, overspending creates new debt.
*   [ ] **Backend: Payment Transfer Logic:**
    *   [ ] Ensure Cash -> CC transfers decrease CC Payment category `Available`.
*   [ ] **Backend: Return/Refund Logic:**
    *   [ ] Handle CC refunds correctly (credit TBB/category, adjust CC Payment `Available`).
*   [ ] **Backend: API Updates:**
    *   [ ] Ensure `/budget_view` accurately reflects CC Payment category balances.
*   [ ] **Web Frontend: Credit Card UI:**
    *   [ ] Display CC Payment categories clearly.
    *   [ ] Ensure CC transactions behave correctly in register & budget views.
*   [ ] **(Parallel) Mobile Frontend: Credit Card UI:**
    *   [ ] Implement native UI reflecting CC logic.
*   [ ] **Testing:**
    *   [ ] Test all CC scenarios: budgeted spending, overspending (covered/uncovered), payments, returns.

---

## Phase 8: Reporting

**Goal:** Implement financial reports.

**Checklist:**

*   [ ] **Backend: Reporting APIs:**
    *   [ ] Implement `GET /reports/spending` API (by category/payee).
    *   [ ] Implement `GET /reports/income_vs_expense` API.
    *   [ ] Implement `GET /reports/net_worth` API.
    *   [ ] Implement `GET /reports/age_of_money` API (implement calculation).
    *   [ ] Ensure reporting endpoints support filtering.
*   [ ] **Backend: Performance Optimization:**
    *   [ ] Implement indexing, caching, or summary tables for reports.
*   [ ] **Web Frontend: Reporting UI:**
    *   [ ] Integrate charting library.
    *   [ ] Build UI components for each report type (charts & tables).
    *   [ ] Display AoM metric and trend.
    *   [ ] Implement filter controls.
    *   [ ] Implement CSV export.
*   [ ] **(Parallel) Mobile Frontend: Reporting UI:**
    *   [ ] Build native report screens using mobile charts/APIs.
    *   [ ] Connect to backend reporting APIs.
*   [ ] **Testing:**
    *   [ ] Validate report accuracy. Test filters. Performance test endpoints.

---

## Phase 9: Platform Specifics, Polish & Deployment

**Goal:** Refine UX, address platform specifics, secure, ensure A11y, and deploy.

**Checklist:**

*   [ ] **Web Frontend: Responsive Design & Polish:**
    *   [ ] Test and refine UI across browsers/screen sizes.
    *   [ ] Improve animations, loading states.
    *   [ ] Review/refine UI copy and help text.
*   [ ] **Mobile Frontend: Native Integration & Polish:**
    *   [ ] Implement platform features (Widgets, Push Notifications, Biometrics).
    *   [ ] Optimize performance/battery.
    *   [ ] Adhere to HIG/Material Design.
    *   [ ] Implement robust offline support.
*   [ ] **All Platforms: Accessibility (A11y):**
    *   [ ] Perform A11y audit (Keyboard, Screen Reader, Contrast, Focus).
    *   [ ] Remediate A11y issues.
*   [ ] **Backend: Security Hardening & Optimization:**
    *   [ ] Conduct security review (OWASP Top 10).
    *   [ ] Implement rate limiting, security headers.
    *   [ ] Implement Multi-Factor Authentication (MFA/2FA) option.
    *   [ ] Optimize API performance (queries, caching).
    *   [ ] Implement robust logging and monitoring.
*   [ ] **Backend: Synchronization:**
    *   [ ] Ensure robust real-time sync (WebSockets/Polling, conflict resolution).
*   [ ] **Onboarding & User Education:**
    *   [ ] Develop/refine onboarding wizard.
    *   [ ] Create tutorials/help documentation.
*   [ ] **Deployment Pipeline:**
    *   [ ] Configure production environments (Web, API, DB, Stores).
    *   [ ] Finalize CI/CD pipelines for staging/production deployment.
*   [ ] **Testing:**
    *   [ ] Comprehensive E2E testing across platforms.
    *   [ ] User Acceptance Testing (UAT).
    *   [ ] Performance and Load testing.
    *   [ ] Security testing/penetration testing.

---

## Phase 10: Monetization & Post-Launch

**Goal:** Implement subscription model and prepare for ongoing operations.

**Checklist:**

*   [ ] **Backend: Payment Provider Integration (Stripe/etc.):**
    *   [ ] Integrate payment provider API (subscriptions, payments).
    *   [ ] Implement webhooks for subscription events.
    *   [ ] Update User model for subscription tracking.
    *   [ ] Implement access control logic based on subscription status.
*   [ ] **Frontend: Subscription Management UI:**
    *   [ ] Build UI for viewing plan, billing history, updating payment method, canceling.
    *   [ ] Integrate secure payment elements (Stripe Elements).
    *   [ ] Implement UI prompts for trial/subscription status.
*   [ ] **Free Trial Logic:**
    *   [ ] Implement 30-34 day free trial logic.
*   [ ] **App Store / Play Store Setup:**
    *   [ ] Configure in-app purchase subscription items.
    *   [ ] Implement native purchase flows.
    *   [ ] Implement server-side receipt validation.
*   [ ] **Post-Launch:**
    *   [ ] Set up active monitoring (performance, errors, costs).
    *   [ ] Establish user support channels.
    *   [ ] Plan for ongoing maintenance (bugs, updates, security).
    *   [ ] Plan for future iterations based on feedback.

---