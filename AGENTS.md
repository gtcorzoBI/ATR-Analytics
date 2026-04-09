# ATR Analytics Pro - AI Agent Guidelines

Welcome, AI Agent! To successfully interact with this application without being blocked by external dependencies (like the MS SQL Server database or authentication), please adhere to the following guidelines:

## Sandbox / Testing Environments

Since the application requires an active database to function properly in production, we have provided alternative commands to safely test changes in a local or sandbox environment where MS SQL is unavailable.

### Running the Application in Mock Mode

1. **Frontend:** Run the application using the `dev:sandbox` script instead of `dev`. This runs Vite with the `VITE_E2E_TESTING=true` environment variable.
   ```bash
   npm run dev:sandbox
   ```
   **Effect:** This command automatically populates `localStorage` with a mock admin user and token, bypassing the login screen completely and routing you to the dashboard.

2. **Backend API:** Run the API using the `api:mock` script instead of `api`. This starts the Express server with the `MOCK_DB=true` environment variable.
   ```bash
   npm run api:mock
   ```
   **Effect:** The Express server bypasses the `mssql` connection initialization and uses a mock in-memory connection pool. It will not attempt to connect to a real database.

### Running Automated Frontend Verifications

When running Playwright scripts or doing any automated frontend verification, use the `npm run dev:sandbox` command. Because the frontend will automatically mock a logged-in user, you don't need to instruct Playwright to fill out the username and password fields on the login page; just navigate to `/` and you will be authenticated.

Example script modification:
```javascript
// Do this:
await page.goto("http://localhost:5173/admin");
// No need to fill out login forms.
```

By following these instructions, you should not get "stuck" trying to initialize a real SQL connection or trying to complete the login process manually.
