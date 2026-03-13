# Assignment 2: MongoDB, Backend Connection, and Seed Data

## Objective

In this assignment you will:

1. Run **MongoDB** locally using **Docker Compose** (no system-wide MongoDB install).
2. Connect the **DAMP Lab backend** to MongoDB and confirm it is running.
3. Use **environment variables** (provided separately, e.g. via Slack) to authenticate with **Keycloak** using your **BU Gmail**.
4. Apply **code changes** so your Keycloak user (as external/customer) can access all relevant pages and APIs.
5. Capture **Milestone 1** screenshots: empty services on the **Canvas** and empty data on the **Admin Edit** screen.
6. Run the backend **database initialization script** to load services, categories, and bundles.
7. Capture **Milestone 2** screenshots: services visible on the Canvas and data visible on the Admin Edit screen.

You should have already completed the first assignment (Hello World) so that both the frontend and backend repositories are cloned and you can run them locally.

---

## Prerequisites

- **Assignment 1** completed: `damplab-backend` and `damplab-ui` cloned and dependencies installed.
- **Docker** and **Docker Compose** installed so you can run MongoDB in a container.
  - Check: `docker --version` and `docker compose version`.
  - Install: [Docker Desktop](https://docs.docker.com/get-docker/) (includes Compose).
- **Node.js** v22.14.0 or compatible (as in Assignment 1).

---

## Part 1: Run MongoDB with Docker Compose

The backend uses **MongoDB** (not PostgreSQL). The repo includes a `docker-compose.yml` that runs only MongoDB for local development.

1. Open a terminal and go to the **backend** repo root:
   ```bash
   cd path/to/damplab-backend
   ```

2. Start MongoDB in the background:
   ```bash
   docker compose up -d
   ```
   You should see the `mongo` service start. MongoDB will listen on **port 27017** on your machine.

3. (Optional) Confirm the container is running:
   ```bash
   docker compose ps
   ```
   The `mongo` service should show as “Up”.

4. **Leave this terminal as-is** (no need to run the backend here yet). You will start the backend in Part 3 after setting environment variables.

---

## Part 2: Backend Environment Variables

Environment variables are posted **separately** (e.g. in Slack). You will copy those into a `.env` file in the **backend** repo so the backend can connect to MongoDB and to Keycloak for authentication.

1. In the **backend** repo root (`damplab-backend`), create or edit `.env`.

2. Ensure at least the following are set (values come from your instructor/Slack):

   **MongoDB (required for this assignment):**
   ```env
   MONGO_URI=mongodb://localhost:27017/damplab
   ```
   This matches the Docker Compose MongoDB port. If your instructor gives a different URL, use that instead.

   **Authentication (from Slack / instructor):**  
   Copy the variables they provide. Typically they will include things like:
   - `JWKS_ENDPOINT` – URL where the backend fetches keys to verify JWT tokens.
   - Keycloak-related variables if the backend talks to Keycloak (e.g. `KEYCLOAK_SERVER_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`).

   **Do not** set `DISABLE_AUTH=true` unless your instructor says so; for this assignment you will authenticate with Keycloak and then adjust code so your user can access everything.

3. Save `.env` and **do not commit it** (it should already be in `.gitignore`).

---

## Part 3: Start the Backend and Verify MongoDB Connection

1. In the **backend** repo root:
   ```bash
   npm run start:dev
   ```
   Or, if you use `npm start`, ensure it runs the dev server.

2. Watch the terminal. You should see:
   - No MongoDB connection errors (e.g. “MongoServerSelectionError”).
   - The Nest/GraphQL server listening (e.g. on port 3000).

3. In a browser, open the GraphQL endpoint (adjust port if yours is different):
   ```
   http://localhost:3000/graphql
   ```
   If the backend is up, you will see the GraphQL playground or API interface.

4. **Leave the backend running** in that terminal. You will use it for the rest of the assignment.

---

## Part 4: Frontend Environment Variables and Keycloak

1. In the **frontend** repo root (`damplab-ui`), ensure you have a `.env` file (from Assignment 1 or create from `.env.example`).

2. Set (or update) these; **use the values provided in Slack** for Keycloak and backend URL:
   ```env
   VITE_KEYCLOAK_URL=<Keycloak URL from Slack>
   VITE_KEYCLOAK_REALM=damplab
   VITE_KEYCLOAK_CLIENT_ID=damplabclient

   VITE_BACKEND=http://localhost:3000/graphql
   ```
   Replace the placeholder with the actual Keycloak URL and port if different. Use the same realm and client ID as given by your instructor.

3. Save `.env`. Restart the frontend dev server if it is already running so it picks up the new variables.

4. **Authenticate with Gmail (BU email):**
   - Start the frontend (`npm start` or `npm run dev`) and open the app in your browser.
   - When prompted to log in, use **Keycloak** and sign in with your **BU Gmail** account (or the identity provider configured for the class).
   - After login, you should see the home page and have a valid session.

If Keycloak is not yet set up for your BU email, follow your instructor’s instructions to register or get access.

---

## Part 5: Give Your User Access to All Pages and APIs

By default, some routes and GraphQL operations are restricted to **DAMPLab staff**. Your Keycloak user is likely an **external customer** (or internal customer). So you need two kinds of changes:

- **Backend:** Allow the **external customer** (and optionally internal customer) role on resolvers that are currently staff-only.
- **Frontend:** Allow users with **external** or **internal customer** role to access pages that are currently **staff-only** (e.g. Admin Edit, Lab Monitor).

### 5.1 Backend: Allow Customer Roles on Staff-Only Resolvers

The backend uses `@Roles(Role.DamplabStaff)` on many resolvers. For this assignment, add `Role.ExternalCustomer` and `Role.InternalCustomer` so that any authenticated customer can call those APIs.

**Files to edit (add the two extra roles next to `Role.DamplabStaff`):**

1. **`damplab-backend/src/workflow/resolvers/node.resolver.ts`**  
   - Find every `@Roles(Role.DamplabStaff)` and change to:
     ```ts
     @Roles(Role.DamplabStaff, Role.InternalCustomer, Role.ExternalCustomer)
     ```
   - Do the same for the `labMonitorStaffList` resolver if it has `@Roles(Role.DamplabStaff)`.

2. **`damplab-backend/src/workflow/workflow.resolver.ts`**  
   - Replace each `@Roles(Role.DamplabStaff)` with:
     ```ts
     @Roles(Role.DamplabStaff, Role.InternalCustomer, Role.ExternalCustomer)
     ```

3. **`damplab-backend/src/job/job.resolver.ts`**  
   - Same replacement for every `@Roles(Role.DamplabStaff)`.

4. **`damplab-backend/src/services/damplab-services.resolver.ts`**  
   - Same for `updateService`, `deleteService`, `createService`.

5. **`damplab-backend/src/categories/categories.resolver.ts`**  
   - Same for `updateCategory`, `deleteCategory`, `createCategory`.

6. **`damplab-backend/src/bundles/bundles.resolver.ts`**  
   - Same for `updateBundle`.

7. **`damplab-backend/src/announcements/announcement.resolver.ts`**  
   - Same for `createAnnouncement`, `updateAnnouncement`.

**Quick way:** In each file, you can do a find-and-replace:
- Find: `@Roles(Role.DamplabStaff)`
- Replace: `@Roles(Role.DamplabStaff, Role.InternalCustomer, Role.ExternalCustomer)`

Restart the backend after editing so the changes are loaded.

### 5.2 Frontend: Allow Customers on Staff-Only Routes

The **Admin Edit** screen (`/edit`) and other staff pages are protected by `PrivateRouteDamplabStaff`, which only allows `isDamplabStaff`. You will allow **internal** and **external** customers as well.

1. Open **`damplab-ui/src/layouts/PrivateRouteDamplabStaff.tsx`**.

2. Replace the condition so that staff **or** internal **or** external customer can access the route:
   ```tsx
   return (userProps?.isDamplabStaff || userProps?.isInternalCustomer || userProps?.isExternalCustomer)
     ? <Outlet />
     : <Navigate to="/login" />;
   ```

3. Save the file. The frontend dev server will hot-reload.

After this, logging in with your BU Gmail (as external or internal customer) should let you open **Home → Admin Edit (Edit Services)** and reach the **Admin Edit** screen at `/edit`, and the canvas at `/canvas` will work with the same user.

---

## Part 6: Milestone 1 – Empty State Screenshots

With the backend running, MongoDB up, frontend configured, and code changes applied:

1. Log in to the app with your BU Gmail (Keycloak).
2. Go to the **Canvas** (workflow builder):
   - From Home, click the button that opens the canvas (e.g. “Canvas” or “Build workflow”).
   - Or navigate directly to **`/canvas`**.
3. Take a **screenshot** showing:
   - The **canvas** page with the **left sidebar**: the **services** (and categories/bundles) list should be **empty** because the database has not been seeded yet.
4. Go to the **Admin Edit** screen:
   - From Home, use the link/button for “Admin Edit” or “Edit Services” (or go to **`/edit`**).
5. Take a **screenshot** showing:
   - The **Admin Edit** screen with the **Services** (and optionally Categories/Bundles) tabs: tables should be **empty**.

These two screenshots are your **Milestone 1** deliverables: empty canvas sidebar and empty admin edit section.

---

## Part 7: Populate the Database (Services, Categories, Bundles)

The backend repo includes a **database initialization script** that loads **services**, **categories**, and **bundles** from JSON assets into MongoDB.

1. **Stop the backend** temporarily (Ctrl+C in the terminal where it is running). The script will connect to the same MongoDB; having the backend stopped avoids any connection conflicts (optional but recommended).

2. From the **backend** repo root (`damplab-backend`), run:
   ```bash
   npm run initdb
   ```
   This script:
   - Goes into the `scripts` folder.
   - Installs script dependencies, builds the scripts, and runs `load all`.
   - Uses `MONGO_URI` from your backend `.env` (or the default `mongodb://localhost:27017/damplab`).

3. If your MongoDB is not at the default URL, you can pass the database URL:
   ```bash
   npm run initdb -- -d mongodb://localhost:27017/damplab
   ```
   Replace with your actual URL if different.

4. Wait for the command to finish. You should see no errors and the script should exit normally.

5. **Start the backend again**:
   ```bash
   npm run start:dev
   ```

6. (Optional) To **reset** the database and reload from scratch later, you can use the scripts directly:
   ```bash
   cd scripts
   npm install
   npm run build
   node --env-file=../.env ./bin/dev reset
   node --env-file=../.env ./bin/dev load all
   cd ..
   ```

---

## Part 8: Milestone 2 – Loaded Data Screenshots

With the database populated and the backend running:

1. **Refresh** the frontend (or reopen the app) and stay logged in.
2. Go to the **Canvas** again (`/canvas`).
3. Take a **screenshot** showing:
   - The **left sidebar** with **services** (and/or categories and bundles) **loaded** from the database (e.g. categories with service names, or bundles listed).
4. Go to the **Admin Edit** screen (`/edit`).
5. Take a **screenshot** showing:
   - The **Services** tab (and optionally Categories/Bundles) with **data** in the tables (rows of services, categories, or bundles).

These two screenshots are your **Milestone 2** deliverables: canvas with services loaded and admin edit with data visible.

---

## Troubleshooting

### MongoDB connection errors (backend won’t start)

- Ensure Docker is running and `docker compose up -d` was run from `damplab-backend`.
- Check that nothing else is using port 27017:  
  `lsof -i :27017` (Mac/Linux) or `netstat -ano | findstr :27017` (Windows).
- Confirm `MONGO_URI=mongodb://localhost:27017/damplab` in the backend `.env`.

### “No token found” or 401 from GraphQL

- Ensure you are **logged in** in the frontend (Keycloak).
- Check that the frontend `.env` has the correct `VITE_BACKEND` and Keycloak settings.
- Ensure the backend has the correct `JWKS_ENDPOINT` (and Keycloak env vars) from Slack so it can verify your JWT.

### 403 Forbidden on some operations

- Confirm you applied the **backend** role changes: every staff-only resolver should include `Role.InternalCustomer` and `Role.ExternalCustomer`.
- Restart the backend after editing.
- Confirm your Keycloak user has the **external-customer** (or internal-customer) role in the realm.

### Cannot open Admin Edit (`/edit`) – redirected to login

- Apply the **frontend** change in `PrivateRouteDamplabStaff.tsx` so that `isInternalCustomer` and `isExternalCustomer` are allowed.
- Hard-refresh or restart the frontend dev server so the updated layout is used.

### `npm run initdb` fails

- Ensure MongoDB is running (`docker compose ps` in `damplab-backend`).
- Ensure you run `npm run initdb` from the **backend repo root** (the script uses `cd ./scripts` internally).
- If you use a custom database URL, run:  
  `npm run initdb -- -d <your_mongo_url>`.

### Canvas or sidebar still empty after initdb

- Restart the backend after running initdb.
- Refresh the browser (and ensure you’re logged in so the frontend sends the JWT to the backend).

---

## Submission Checklist

- [ ] MongoDB running via Docker Compose from `damplab-backend`.
- [ ] Backend `.env` has `MONGO_URI` and auth variables (from Slack).
- [ ] Backend starts and connects to MongoDB without errors.
- [ ] Frontend `.env` has Keycloak and `VITE_BACKEND` set.
- [ ] Logged in with BU Gmail (Keycloak).
- [ ] Backend resolvers updated to allow `InternalCustomer` and `ExternalCustomer` where needed.
- [ ] Frontend `PrivateRouteDamplabStaff` updated to allow customer roles.
- [ ] **Milestone 1:** Screenshot of canvas with **empty** services/sidebar.
- [ ] **Milestone 1:** Screenshot of Admin Edit with **empty** Services (and/or Categories/Bundles) tables.
- [ ] `npm run initdb` run successfully from backend root.
- [ ] **Milestone 2:** Screenshot of canvas with **services/categories/bundles loaded** in the sidebar.
- [ ] **Milestone 2:** Screenshot of Admin Edit with **data** in the Services (and/or Categories/Bundles) tables.

---

## Deliverables

Submit the following:

1. **Milestone 1**
   - Screenshot 1: Canvas page with empty services/sidebar.
   - Screenshot 2: Admin Edit screen with empty tables.
2. **Milestone 2**
   - Screenshot 3: Canvas page with services (and/or categories/bundles) loaded in the sidebar.
   - Screenshot 4: Admin Edit screen with data in the tables.

If your instructor asks for code changes, submit the modified files (or a patch) for:

- Backend: the resolver files where you added `Role.InternalCustomer` and `Role.ExternalCustomer`.
- Frontend: `PrivateRouteDamplabStaff.tsx`.

---

## Summary of Key Paths and Commands

| Item | Location / Command |
|------|--------------------|
| MongoDB (Docker) | From `damplab-backend`: `docker compose up -d` |
| Backend .env | `damplab-backend/.env` (MONGO_URI, JWKS_ENDPOINT, Keycloak vars from Slack) |
| Frontend .env | `damplab-ui/.env` (VITE_KEYCLOAK_*, VITE_BACKEND) |
| Start backend | In `damplab-backend`: `npm run start:dev` |
| Load seed data | In `damplab-backend`: `npm run initdb` |
| Canvas (empty/loaded) | Navigate to `/canvas` |
| Admin Edit (empty/loaded) | Navigate to `/edit` (after frontend role change) |

Good luck.
