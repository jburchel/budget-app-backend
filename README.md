# Budget App Backend

This repository contains the backend API for the Budget App, a comprehensive personal finance management application.

## Technology Stack

- Node.js
- Express.js
- PostgreSQL
- TypeScript

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database
- Docker & Docker Compose (optional, for containerized setup)

## Getting Started

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/budget-app-backend.git
   cd budget-app-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### Docker Setup

Alternatively, you can use Docker for development:

1. Start the PostgreSQL database:
   ```bash
   docker-compose up -d
   ```

2. The database will be available at localhost:5432 with the credentials from the .env file.

3. Build and run the application container (optional):
   ```bash
   docker build -t budget-app-backend .
   docker run -p 3000:3000 --env-file .env budget-app-backend
   ```

## Project Structure

```
src/
├── config/     # Configuration files
├── controllers/# Request handlers
├── models/     # Database models
├── routes/     # API routes
├── services/   # Business logic
├── utils/      # Utility functions
└── app.ts      # Express application
```

## Available Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the project
- `npm run start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run test`: Run tests

## License

MIT 