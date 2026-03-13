# Assignment 2: MongoDB, Backend Connection, and Seed Data

## Objective

In this assignment you will:

1. Run **MongoDB** locally using **Docker Compose** (no system-wide MongoDB install).
2. Connect the **DAMP Lab backend** to MongoDB and confirm it is running.
3. Use **disabled auth** for local development (no Keycloak required).
4. Capture **Milestone 1** screenshots: empty services on the **Canvas** and empty data on the **Admin Edit** screen.
5. Run the backend **database initialization script** to load services, categories, and bundles.
6. Capture **Milestone 2** screenshots: services visible on the Canvas and data visible on the Admin Edit screen.

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

For this assignment we **disable authentication** so you do not need Keycloak or any auth configuration.

1. In the **backend** repo root (`damplab-backend`), create or edit `.env`.

2. Set at least:
   ```env
   MONGO_URI=mongodb://localhost:27017/damplab
   DISABLE_AUTH=true
   ```
   - `MONGO_URI` matches the Docker Compose MongoDB port. If your instructor gives a different URL, use that instead.
   - `DISABLE_AUTH=true` tells the backend to allow all requests without checking JWT tokens or roles.

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

## Part 4: Frontend Environment Variables (Auth Disabled)

So the frontend does not require login, we use a **dev bypass** that matches the backend’s disabled auth.

1. In the **frontend** repo root (`damplab-ui`), create or edit `.env`.

2. Set:
   ```env
   VITE_BACKEND=http://localhost:3000/graphql
   VITE_DISABLE_AUTH=true
   ```
   - `VITE_BACKEND` must match the URL and port where your backend GraphQL endpoint runs.
   - `VITE_DISABLE_AUTH=true` makes the app treat you as a logged-in staff user **without** Keycloak. You can open all pages (Home, Canvas, Admin Edit) without signing in.

3. Save `.env`. **Restart the frontend dev server** if it is already running so it picks up the new variables.

4. Start the frontend (`npm start` or `npm run dev`) and open the app in your browser. You should go straight to the **Home** page (no login screen). From there you can open the Canvas and Admin Edit.

---

## Part 5: Milestone 1 – Empty State Screenshots

With the backend running, MongoDB up, and frontend configured with auth disabled:

1. Open the app in your browser. You should see the Home page without logging in.
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

## Part 6: Populate the Database (Services, Categories, Bundles)

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

## Part 7: Milestone 2 – Loaded Data Screenshots

With the database populated and the backend running:

1. **Refresh** the frontend in your browser.
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

### Redirected to login or cannot open Home / Canvas / Admin Edit

- Ensure the frontend `.env` has `VITE_DISABLE_AUTH=true`.
- Restart the frontend dev server after changing `.env` (Vite only loads env at startup).

### “No token found” or 401 from GraphQL

- With auth disabled, the backend should not require a token. Confirm the backend `.env` has `DISABLE_AUTH=true` and restart the backend.

### `npm run initdb` fails

- Ensure MongoDB is running (`docker compose ps` in `damplab-backend`).
- Ensure you run `npm run initdb` from the **backend repo root** (the script uses `cd ./scripts` internally).
- If you use a custom database URL, run:  
  `npm run initdb -- -d <your_mongo_url>`.

### Canvas or sidebar still empty after initdb

- Restart the backend after running initdb.
- Refresh the browser.

---

## Submission Checklist

- [ ] MongoDB running via Docker Compose from `damplab-backend`.
- [ ] Backend `.env` has `MONGO_URI` and `DISABLE_AUTH=true`.
- [ ] Backend starts and connects to MongoDB without errors.
- [ ] Frontend `.env` has `VITE_BACKEND` and `VITE_DISABLE_AUTH=true`.
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

---

## Summary of Key Paths and Commands

| Item | Location / Command |
|------|--------------------|
| MongoDB (Docker) | From `damplab-backend`: `docker compose up -d` |
| Backend .env | `damplab-backend/.env` — `MONGO_URI`, `DISABLE_AUTH=true` |
| Frontend .env | `damplab-ui/.env` — `VITE_BACKEND`, `VITE_DISABLE_AUTH=true` |
| Start backend | In `damplab-backend`: `npm run start:dev` |
| Load seed data | In `damplab-backend`: `npm run initdb` |
| Canvas (empty/loaded) | Navigate to `/canvas` |
| Admin Edit (empty/loaded) | Navigate to `/edit` |

Good luck.
