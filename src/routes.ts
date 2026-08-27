import {
    type RouteConfig,
    index,
    layout,
    route,
} from "@react-router/dev/routes";

/**
 * Routes are grouped by the permission required to reach them. `layout()` takes a
 * file path rather than props, so each permission tier gets its own tiny layout
 * file (all of which delegate to `layouts/PermissionRoute.tsx`).
 *
 * `PrivateRouteAuthed` is the baseline tier: every authenticated user reaches it,
 * because `BASELINE_PERMISSIONS` in the backend grants the client set to everyone,
 * including a user carrying no roles at all.
 *
 * `PrivateRouteDamplabStaff` is now the *administrator* tier — it gates on
 * `customers:manage` rather than on the staff boolean — and holds everything the
 * matrix does not place lower, including the pages absent from the matrix (Q8).
 */
export default [
    route("/canvas", "./pages/MainFlow.tsx"),
    route("/login", "./pages/LoginForm.tsx"),
    layout("./layouts/PrivateRouteAuthed.tsx", [
        index("./pages/Home.tsx"),
        route("/training", "./pages/Training.tsx"),
        route("/training/canvas", "./pages/TrainingCanvas.tsx"),
        route("/services-catalog", "./pages/AdminServicesCatalog.tsx"),
        route("/admin/services-catalog", "./pages/AdminServicesCatalog.tsx", { id: "admin-services-catalog-legacy" }),
        route("/bugs", "./pages/Bugs.tsx"),
        // Static page, no queries behind it, and the matrix gives it to everyone.
        route("/release_notes", "./pages/ReleaseNotes.tsx"),
        route("/resubmission/:id", "./pages/MainFlow.tsx", { id: "resubmission" }),
        // Both roles use the same editor; the page itself picks jobById vs
        // ownJobById and the server enforces who may save.
        route("/job_editor/:id", "./pages/JobEditor.tsx"),
        route("/final_checkout", "./pages/FinalCheckout.tsx"),
        // Q7: gated by job:submit-for-client at the page level, not here — the real
        // check has always been StaffJobSubmit's own redirect, so moving the route
        // would not have changed anything.
        route("/staff_submit", "./pages/StaffJobSubmit.tsx"),
        route("/checkout", "./pages/Checkout.tsx"),
        route("/jobs/:jobId", "./pages/JobSubmitted.tsx"), //config later so only owner of job or admin can access
        route("/client_view/:id", "./pages/ClientView.tsx"), // Client job tracking page with SOW viewer and comments
        route("/my_jobs", "./pages/MyJobs.tsx"), // List of current user's submitted jobs
    ]),
    layout("./layouts/PrivateRouteInventoryBook.tsx", [
        route("/book-inventory", "./pages/BookInventory.tsx") // Customer: book inventory (machines by time, consumables by qty)
    ]),
    layout("./layouts/PrivateRouteBugBacklog.tsx", [
        route("/backlog", "./pages/Backlog.tsx"),
    ]),
    layout("./layouts/PrivateRouteJobsViewAll.tsx", [
        route("/dashboard", "./pages/Dashboard.tsx"),
    ]),
    layout("./layouts/PrivateRouteBench.tsx", [
        route("/technician_bench", "./pages/TechnicianBench.tsx"),
    ]),
    layout("./layouts/PrivateRouteInventoryRead.tsx", [
        route("/inventory", "./pages/Inventory.tsx"),
    ]),
    layout("./layouts/PrivateRouteInventorySchedule.tsx", [
        route("/inventory-calendar", "./pages/InventoryCalendar.tsx"),
    ]),
    layout("./layouts/PrivateRouteLabMonitor.tsx", [
        route("/lab-monitor/:screen", "./pages/LabMonitor.tsx"),
    ]),
    layout("./layouts/PrivateRouteProtocolLibrary.tsx", [
        route("/protocol-map", "./pages/ProtocolMap.tsx"),
    ]),
    layout("./layouts/PrivateRouteLabAssistant.tsx", [
        route("/lab-assistant", "./pages/LabStatusAssistant.tsx"),
    ]),
    layout("./layouts/PrivateRouteLabLayout.tsx", [
        route("/stations", "./pages/Stations.tsx"),
    ]),
    layout("./layouts/PrivateRouteCatalogEditor.tsx", [
        route("/edit", "./pages/AdminEdit.tsx"),
        route("/edit/services/new", "./pages/AdminNewService.tsx"),
        route("/edit/services/:serviceId/parameters", "./pages/AdminEditServiceParameters.tsx"),
        route("/edit/services/:serviceId", "./pages/AdminEditService.tsx"),
        route("/edit/bundles/new", "./pages/AdminNewBundle.tsx"),
        route("/edit/bundles/:bundleId", "./pages/AdminEditBundle.tsx"),
        route("/edit/sow-sections/:sectionKey", "./pages/AdminEditSowSection.tsx"),
        route("/edit/inventory/new", "./pages/AdminNewInventoryItem.tsx"),
        route("/edit/inventory/:id", "./pages/AdminEditInventoryItem.tsx"),
    ]),
    layout("./layouts/PrivateRouteDamplabStaff.tsx", [
        route("/lab-status-tv", "./pages/LabStatusTV.tsx"),
        route("/technician_view/:id", "./pages/TechnicianView.tsx"),
        route("/usage-billing", "./pages/UsageBilling.tsx"),
        route("/customer-management", "./pages/CustomerManagement.tsx"),
        route("/api-keys", "./pages/ApiKeys.tsx"),
        route("/dominos", "./pages/Dominos.tsx"),
        route("/elabs", "./pages/ELabs.tsx"),
        route("/kernel", "./pages/Kernel.tsx"),
        route("/training/admin-edit", "./pages/TrainingAdminEdit.tsx"),
        route("/edit_announcements", "./pages/Announcements.tsx"),
        route("/data_translation", "./pages/DataTranslation.tsx"),

        /* Old comments from pre-React-Router-migration App.tsx: */
        /* <Route path = "/client_view/:id" element = {<PrivateRouteAdmin> <Tracking /> </PrivateRouteAdmin>} /> */
        /* <Route path = "/callback" element = {<PrivateRouteAdmin> <ELabs /> </PrivateRouteAdmin>} /> */
        /* <Route path="/accepted" element={wrapPrivateRoute(<Accepted />, isLoggedIn, 'accepted')} /> */
    ]),

    route("/test_page", "./pages/TestPage.tsx"),

    route("*", "./pages/NotFound.tsx"),
] satisfies RouteConfig;
