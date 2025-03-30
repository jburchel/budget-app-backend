# Phase 0: Foundation & Setup Checklist - Detailed Actions

**Goal:** Establish secure, consistent, and efficient development environments, repositories, and basic project structures for all platforms (Web, iOS, Android, Backend) to enable parallel development and smooth integration later.

**Deliverables:**
*   Configured Git repositories for all project components.
*   Standardized local development environments for all team members.
*   Initialized base project structures for Web, iOS, Android, and Backend.
*   Basic CI/CD pipeline configured for automated builds/linting.
*   Development database ready.
*   Initial API documentation structure set up.
*   Project management board initialized.

---

**Checklist Items & Actions:**

*   [x] **1. Repository Setup:**
    *   [x] **1.1. Create Repositories:**
        *   [x] Create Git repo: `budget-app-backend` (e.g., on GitHub, GitLab).
        *   [x] Create Git repo: `budget-app-frontend-web`
        *   [x] Create Git repo: `budget-app-frontend-ios`
        *   [x] Create Git repo: `budget-app-frontend-android`
        *   *(Decision: Confirm if separate repos or a monorepo structure will be used. This checklist assumes separate repos).*
    *   [x] **1.2. Establish Branching Strategy:**
        *   [x] Define and document the branching strategy (e.g., Gitflow with `main`, `develop`, `feature/`, `release/`, `hotfix/` branches).
        *   [x] Communicate the strategy to the entire development team.
    *   [x] **1.3. Configure Basic Repo Settings:**
        *   [ ] Protect the `main` and `develop` branches (require pull requests, status checks to pass).
        *   [x] Add a standard `.gitignore` file to each repository suitable for the respective technology (Node.js, React/Vue/Angular, Swift/Xcode, Kotlin/Android Studio).
        *   [x] Add a basic `README.md` to each repo explaining its purpose and setup instructions.
        *   [x] Add a `LICENSE` file (e.g., MIT, Apache 2.0).

*   [x] **2. Technology Stack Installation & Configuration:**
    *   [x] **2.1. Document Required Tools:**
        *   [x] Create a document listing required versions of Node.js, npm/yarn, Python/Ruby (if applicable), Java/Kotlin JDK, Android Studio, Xcode, specific Web framework CLIs (React/Vue/Angular), Git.
    *   [ ] **2.2. Ensure Developer Installs:**
        *   [ ] Verify all developers have installed the required tools locally.
        *   [ ] Recommend version managers (like `nvm`, `sdkman`, `rbenv`/`rvm`) for consistency.
    *   [x] **2.3. Setup Linters & Formatters:**
        *   [x] Configure ESLint + Prettier for Backend (Node.js) and Web Frontend (JS/TS). Include config files (`.eslintrc.json`, `.prettierrc.json`).
        *   [ ] Configure SwiftLint for iOS project. Include config file (`.swiftlint.yml`).
        *   [ ] Configure Ktlint (or Android Studio's formatter) for Android project.
        *   [x] Integrate linters/formatters into IDEs for auto-formatting on save.
        *   [x] Add linting/formatting scripts to `package.json` / build scripts.
    *   [x] **2.4. Environment Variable Management:**
        *   [x] Establish a convention for environment variables (e.g., using `.env` files).
        *   [x] Add `.env.example` files to each repo with placeholder variables needed (e.g., `DATABASE_URL`, `API_BASE_URL`, `PLAID_CLIENT_ID`). Ensure `.env` is in `.gitignore`.

*   [x] **3. Project Initialization:**
    *   [x] **3.1. Initialize Backend Project:**
        *   [x] Use framework CLI (`npm init`, `nest new`, `django-admin startproject`, etc.) to create the basic backend structure.
        *   [x] Install core dependencies (framework, ORM, basic utilities).
        *   [x] Set up initial folder structure (e.g., `src/`, `config/`, `routes/`, `controllers/`, `services/`, `models/`, `tests/`).
        *   [x] Create a basic "health check" endpoint (e.g., `GET /health`).
    *   [x] **3.2. Initialize Web Frontend Project:**
        *   [x] Use framework CLI (`create-react-app`, `vue create`, `ng new`) to create the basic web app structure.
        *   [x] Install core dependencies (framework, router, state management library, HTTP client like axios).
        *   [x] Set up initial folder structure (e.g., `src/`, `components/`, `pages/` or `views/`, `services/`, `store/`, `assets/`, `utils/`).
        *   [x] Create a basic App shell component.
    *   [ ] **3.3. Initialize iOS Project:**
        *   [ ] Create a new project in Xcode (e.g., using App template, Swift, SwiftUI/UIKit).
        *   [ ] Initialize dependency management (CocoaPods `Podfile` or Swift Package Manager `Package.swift`).
        *   [ ] Add essential pods/packages (e.g., Alamofire for networking, potentially UI libraries).
        *   [ ] Set up initial folder structure (e.g., `Views/`, `ViewModels/` or `Controllers/`, `Models/`, `Services/`, `Utils/`, `Resources/`).
    *   [ ] **3.4. Initialize Android Project:**
        *   [ ] Create a new project in Android Studio (e.g., Empty Activity, Kotlin, Compose/XML).
        *   [ ] Configure `build.gradle` files (app and project level).
        *   [ ] Add essential dependencies (e.g., Retrofit/Ktor for networking, ViewModel, LiveData/Flow, Coroutines, Dagger/Hilt for DI, UI libraries).
        *   [ ] Set up initial folder structure (e.g., `ui/`, `data/`, `domain/`, `di/`, `utils/` following common Android patterns like MVVM).

*   [x] **4. Cloud Infrastructure Setup (Basic - Dev Environment):**
    *   [x] **4.1. Development Database:**
        *   [x] Provision a PostgreSQL database instance accessible for development (can be local Docker container defined in `docker-compose.yml`, or a shared cloud dev instance like AWS RDS free tier).
        *   [x] Create the initial database schema/user specifically for the application.
        *   [x] Document connection details and provide them securely (e.g., via `.env` files).
    *   [x] **4.2. Basic CI/CD Pipeline:**
        *   [x] Choose CI/CD platform (GitHub Actions, GitLab CI, Jenkins, etc.).
        *   [x] Configure initial pipeline for each repository:
            *   [x] Trigger on pushes/merges to `develop` and `feature/*`.
            *   [x] Steps: Checkout code -> Install dependencies -> Run Linter -> Run Formatter Check -> Build project (compile code).
            *   [x] *(Actual tests will be added later, but the structure is set up).*
    *   [x] **4.3. Local Development Environment Setup:**
        *   [x] Document clear steps for developers to run each project component locally (e.g., `npm run dev` for backend/web, running from Xcode/Android Studio).
        *   [x] Ensure local setups use the `.env` configurations.

*   [ ] **5. API Design Tool (Optional but Recommended):**
    *   [ ] **5.1. Choose Tool:** Select Swagger/OpenAPI or Postman.
    *   [ ] **5.2. Initial Setup:**
        *   [ ] Set up the project/collection within the chosen tool.
        *   [ ] Define the initial Authentication endpoints (`/auth/register`, `/auth/login`) based on Phase 2 requirements as a starting point.
        *   [ ] Share access/link to the API documentation with the team.

*   [x] **6. Dependency Management:**
    *   [x] **6.1. Initial Dependencies:**
        *   [x] Ensure core framework and utility dependencies identified in Step 3 are installed in each project.
        *   [x] Install basic testing frameworks (Jest, XCTest, JUnit/Espresso).
    *   [x] **6.2. Lock Files:**
        *   [x] Verify that lock files (`package-lock.json`, `yarn.lock`, `Podfile.lock`, relevant Gradle files) are generated and committed to Git in each respective repository. This ensures consistent dependency versions across developer machines and CI.

*   [ ] **7. Project Management & Communication:**
    *   [ ] **7.1. Project Board:**
        *   [ ] Set up a project management board (Jira, Trello, Asana, GitHub Projects).
        *   [ ] Create initial Epics/User Stories based on the high-level phases and features defined in the specification.
        *   [ ] Populate the board with tasks derived from this Phase 0 checklist.
    *   [ ] **7.2. Communication Channel:**
        *   [ ] Establish primary communication channel (e.g., Slack, Microsoft Teams) for the development team.
        *   [ ] Set up relevant channels (e.g., `#backend`, `#frontend-web`, `#ios`, `#android`, `#general`).

---