# Hello World Assignment: Setting Up DAMP Lab UI

## Objective

In this assignment, you will clone both the frontend and backend repositories for the DAMP Lab UI project and get them running on your local machine. By the end, you should have both services running on localhost and be able to access the application in your web browser.

## Prerequisites

Before starting, ensure you have the following installed on your computer:

1. **Git** - Version control system
   - Check if installed: `git --version`
   - If not installed: [Git Installation Guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

2. **Node.js and npm** - JavaScript runtime and package manager
   - Required version: Node.js v22.14.0 or compatible
   - Check if installed: `node --version` and `npm --version`
   - If not installed: [Node.js Installation Guide](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm#using-a-node-version-manager-to-install-nodejs-and-npm)
   - Recommended: Use a Node Version Manager (nvm) for easier version management

3. **A code editor** - Visual Studio Code, WebStorm, or your preferred editor

4. **A web browser** - Chrome, Firefox, Safari, or Edge

5. **PostgreSQL** (if backend requires it) - Database server
   - Check with your instructor if a local database is needed or if you'll use a shared instance

## Part 1: Clone the Backend Repository

1. Open your terminal (Command Prompt on Windows, Terminal on Mac/Linux)

2. Navigate to a directory where you want to store the project (e.g., `Documents` or `Desktop`):
   ```console
   cd ~/Documents
   ```

3. Clone the backend repository:
   ```console
   git clone git@github.com:hicsail/damplab-backend.git
   ```
   
   **Note:** If you don't have SSH keys set up with GitHub, use HTTPS instead:
   ```console
   git clone https://github.com/hicsail/damplab-backend.git
   ```

4. Navigate into the backend directory:
   ```console
   cd damplab-backend
   ```

5. Follow the backend's README instructions to:
   - Install dependencies: `npm install` (or `yarn install` if the project uses Yarn)
   - Set up environment variables (copy `.env.example` to `.env` if available)
   - Set up the database (if required)
   - Start the backend server (typically `npm start` or `npm run dev`)

6. **Important:** Note the port the backend runs on (commonly `3000`, `4000`, or `8000`). You'll need this for the frontend configuration.

7. Verify the backend is running by checking:
   - The terminal shows the server is listening (e.g., "Server running on port 3000")
   - You can access the GraphQL endpoint (usually `http://localhost:PORT/graphql`)

## Part 2: Clone the Frontend Repository

1. Open a **new terminal window** (keep the backend running in the first terminal)

2. Navigate to the same parent directory:
   ```console
   cd ~/Documents
   ```

3. Clone the frontend repository:
   ```console
   git clone git@github.com:hicsail/damplab-ui.git
   ```
   
   Or using HTTPS:
   ```console
   git clone https://github.com/hicsail/damplab-ui.git
   ```

4. Navigate into the frontend directory:
   ```console
   cd damplab-ui
   ```

## Part 3: Configure Frontend Environment Variables

1. Copy the example environment file:
   ```console
   cp .env.example .env
   ```

2. Open the `.env` file in your code editor

3. Fill in the required values:
   ```env
   # Keycloak Configuration
   VITE_KEYCLOAK_URL=http://localhost:8080
   VITE_KEYCLOAK_REALM=damplab
   VITE_KEYCLOAK_CLIENT_ID=damplabclient

   # Backend API Configuration
   VITE_BACKEND=http://localhost:3000/graphql
   ```
   
   **Important Notes:**
   - Replace `http://localhost:8080` with your actual Keycloak URL (if you have one set up)
   - Replace `http://localhost:3000/graphql` with your backend URL and port (use the port from Part 1)
   - If you don't have Keycloak set up yet, ask your instructor for the development Keycloak URL
   - The GraphQL endpoint path might be `/graphql` or `/api/graphql` depending on your backend setup

4. Save the `.env` file

## Part 4: Install Frontend Dependencies and Start the Application

1. Install the frontend dependencies:
   ```console
   npm install
   ```
   
   This may take a few minutes. Wait for it to complete.

2. Start the development server:
   ```console
   npm start
   ```
   
   Or if that doesn't work, try:
   ```console
   npm run dev
   ```

3. The terminal should show output indicating the server is running, typically something like:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

4. Note the URL and port (commonly `http://localhost:5173` or `http://localhost:3000`)

## Part 5: Verify Everything Works

1. **Check Backend:**
   - Ensure the backend terminal shows no errors
   - Try accessing the GraphQL endpoint in your browser: `http://localhost:PORT/graphql`
   - You should see a GraphQL playground or API documentation

2. **Check Frontend:**
   - Open your web browser
   - Navigate to the URL shown in the frontend terminal (e.g., `http://localhost:5173`)
   - You should see the DAMP Lab UI application

3. **Test the Connection:**
   - Try logging in (if Keycloak is configured)
   - Or navigate through the application to verify it can communicate with the backend
   - Check the browser's developer console (F12) for any errors

## Troubleshooting

### Backend won't start
- Check if the port is already in use: `lsof -i :PORT` (Mac/Linux) or `netstat -ano | findstr :PORT` (Windows)
- Verify all dependencies are installed: `npm install`
- Check the backend's README for specific setup requirements
- Ensure the database is running (if required)

### Frontend won't start
- Verify Node.js version: `node --version` (should be v22.14.0 or compatible)
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check that the `.env` file exists and has correct values
- Verify the backend is running before starting the frontend

### Frontend can't connect to backend
- Verify the backend URL in `.env` matches the actual backend port
- Check that the backend is running
- Ensure there are no CORS errors in the browser console
- Verify the GraphQL endpoint path is correct (`/graphql` vs `/api/graphql`)

### Keycloak authentication issues
- Verify the Keycloak URL is correct
- Check that the realm and client ID match your Keycloak configuration
- Ensure Keycloak is running and accessible
- Contact your instructor for the development Keycloak credentials if needed

## Submission Checklist

Before submitting, verify:

- [ ] Backend repository cloned successfully
- [ ] Backend dependencies installed (`npm install` completed without errors)
- [ ] Backend server running without errors
- [ ] Frontend repository cloned successfully
- [ ] Frontend dependencies installed (`npm install` completed without errors)
- [ ] `.env` file created and configured with correct values
- [ ] Frontend development server running without errors
- [ ] Application accessible in web browser
- [ ] No critical errors in browser console (F12 → Console tab)

## Deliverables

Submit the following:

1. **Screenshot 1:** Terminal showing backend server running successfully
2. **Screenshot 2:** Terminal showing frontend server running successfully
3. **Screenshot 3:** Browser showing the DAMP Lab UI application loaded
4. **Screenshot 4:** Browser developer console (F12) showing no critical errors

## Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [Node.js Documentation](https://nodejs.org/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)

## Questions?

If you encounter issues not covered in this guide:
1. Check the README files in both repositories
2. Review error messages carefully
3. Ask your instructor or teaching assistant
4. Check with classmates (but write your own code!)

---

**Good luck! 🚀**
