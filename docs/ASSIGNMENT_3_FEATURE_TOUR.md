# Assignment 3: Feature Tour (Admin Edit -> Canvas -> Checkout -> Tracking -> Lab Monitor)

## Learning Outcome

By the end of this assignment, you will understand the main user flows in DAMPLab UI:

- how services and bundles are configured in **Admin Edit**
- how those configurations appear on the **Canvas**
- how jobs move through **Checkout** and **Submit**
- how users track submitted jobs in **My Jobs / Job Tracking**
- how staff monitor operations in **Lab Monitor North**

This assignment is intentionally hands-on and UI-focused.

---

## Before You Start

Complete Assignment 1 and Assignment 2 first.

You should already have:

- frontend and backend running locally
- MongoDB running with Docker Compose
- seed data loaded (`npm run initdb`)
- auth disabled for local development:
  - backend `.env`: `DISABLE_AUTH=true`
  - frontend `.env`: `VITE_DISABLE_AUTH=true`

Recommended check:

1. Open `http://localhost:3000/graphql` (backend up).
2. Open the UI and confirm you can access Home, `/edit`, `/canvas`, `/my_jobs`, and `/lab-monitor/north`.

---

## Deliverables

Submit:

1. Screenshot: newly created service visible in **Admin Edit > Services**.
2. Screenshot: parameter editor for that service with at least 2 parameters configured.
3. Screenshot: newly created bundle visible in **Admin Edit > Bundles**.
4. Screenshot: Canvas with your service and bundle dropped onto the graph.
5. Screenshot: Checkout page showing your workflow summary and estimated cost.
6. Screenshot: Final Checkout success flow (or Job Tracking page right after submit).
7. Screenshot: Client tracking screen (`/client_view/:id`) showing submitted job details.
8. Screenshot: Lab Monitor North (`/lab-monitor/north`) showing your service card in **Pending**.

Also include a short note (4-8 lines) describing what each screen is responsible for.

---

## Part A - Explore Admin Edit (Catalog Configuration)

Navigate to **Home -> Admin Edit (Edit Services)** or directly `/edit`.

### A1) Create a new service

1. In the Services table, click **Add new service**.
2. Fill in:
   - **Service name**: use a clear name (example: `Assignment3 - DNA QC`)
   - **Description**: 1-2 sentences
   - **How price is calculated**:
     - choose `Service price` for a fixed-price service
     - choose `Based on selected options` if pricing depends on parameter choices
   - set at least one price:
     - Internal
     - External (Academic)
     - External (Market)
     - External (No salary)
     - optional fallback price
   - **Can be combined with**: select at least 1 downstream service
3. Click **Save service**.
4. Confirm it appears in `/edit` Services table.

### A2) Configure parameters for that service

1. In `/edit`, find your service row.
2. Click **Configure (N)** in the **Parameters** column.
3. In the full parameter editor:
   - add at least 2 parameters:
     - one text/number parameter
     - one dropdown parameter
   - set **Required?** for at least one parameter
   - set **Allow multiple selections?** for at least one parameter
   - for dropdown, add at least 2 choices
   - set a price on at least one parameter or dropdown option
4. Click **Save parameter changes**.

### A3) (Optional but encouraged) Edit deliverables

1. Open the service using the row **Edit** action.
2. In **Deliverables**, add at least one deliverable item.
3. Save changes.

### A4) Create a bundle

1. Switch toolbar selector to **Bundles**.
2. Click **Add new bundle**.
3. Set:
   - **Bundle name** (example: `Assignment3 - Basic Intake Bundle`)
   - optional icon
   - select at least 2 services (include your new service)
4. Reorder services using up/down arrows.
5. Click **Save bundle**.
6. Confirm it appears in `/edit` Bundles table.

---

## Part B - Use Canvas with Your New Config

Navigate to `/canvas`.

### B1) Add a service and a bundle to canvas

1. In the left sidebar, keep toggle on **Services**:
   - search for your newly created service
   - drag it into the center canvas
2. Switch toggle to **Bundles**:
   - search for your new bundle
   - drag it into the canvas
3. You should now have multiple nodes on the graph.

### B2) Connect and inspect nodes

1. Create at least one connection between nodes.
2. Click a node and use the right sidebar to inspect:
   - description
   - parameter fields
   - estimated pricing behavior
3. Fill in parameter values for the service you created.
4. Click **Save** in the node parameter area (right sidebar).

### B3) Save canvas state

Use top-bar **Save** button to save your current canvas design.

---

## Part C - Checkout and Submit

### C1) Checkout review

1. Click cart icon (top-right) or go to `/checkout`.
2. Review:
   - workflow cards
   - service list and entered parameter values
   - estimated costs
3. If needed, click **Edit Job** to return to canvas and adjust.

### C2) Final checkout and submit

1. Click **Proceed/Continue to final checkout** (from Checkout).
2. On `/final_checkout`, complete required fields:
   - Job name
   - Institute
   - optional notes/attachments
3. Click **SUBMIT JOB**.
4. On success, app navigates to `/client_view/<jobId>`.
5. Copy the `jobId` from URL for later use.

---

## Part D - Tracking Screens (Client + Staff Views)

### D1) Client tracking view

After submission, you should be on `client_view`.

Verify you can see:

- job status chip/section (typically starts as `SUBMITTED`)
- workflow nodes and parameter values
- comments section
- any uploaded attachments listed

Then open `/my_jobs` and confirm your new job appears in the list.

### D2) Staff review view (Technician)

1. Open `/dashboard`.
2. Click your submitted job to open `/technician_view/<jobId>`.
3. Review technician-side details.
4. If job state is `SUBMITTED`, click **Review Job** and accept it.
   - This step is important because lab monitor operations are typically visible after approval.

---

## Part E - Lab Monitor North

1. Open `/lab-monitor/north`.
2. Confirm your service operation card appears in the **Pending** column.
   - Pending maps to workflow-node state `QUEUED`.
3. (Optional) Drag the card:
   - Pending -> Running
   - Running -> Completed
4. Observe card details:
   - service name
   - workflow/job reference
   - assignee
   - estimated time

Take your required screenshot while card is visible in **Pending**.

---

## Troubleshooting

### I cannot open Admin Edit or Lab Monitor routes

- Confirm frontend `.env` has `VITE_DISABLE_AUTH=true`.
- Restart frontend dev server after editing `.env`.

### My new service does not appear in Canvas

- Refresh browser after saving service.
- Check service saved successfully in `/edit`.
- Confirm categories in sidebar are loaded; use search to find service directly.

### Bundle appears but not expected services

- Edit bundle and verify selected services + order.
- Save again and refresh canvas.

### Submit button disabled on final checkout

- Fill required fields (`Job name`, `Institute`).

### Job does not appear on Lab Monitor North Pending

- Open `/technician_view/<jobId>` and ensure job was reviewed/accepted if needed.
- Refresh `/lab-monitor/north` (queries poll, but manual refresh is faster for testing).
- Confirm backend is running and seed/init state is healthy.

---

## Reflection Prompt (include in submission)

Write brief answers:

1. Which part of Admin Edit had the biggest effect on Canvas behavior?
2. How does parameter design impact checkout quality and pricing clarity?
3. What did you learn from comparing `client_view` vs `technician_view`?
4. Why is Lab Monitor useful operationally once jobs are approved?

