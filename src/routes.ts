
import {
    type RouteConfig,
    index,
    layout,
    route,
} from "@react-router/dev/routes";

export default [
    route("/canvas", "./pages/MainFlow.tsx"),
    route("/login", "./pages/LoginForm.tsx"),

    layout("./layouts/PrivateRouteAuthed.tsx", [
        index("./pages/Home.tsx"),
        route("/resubmission/:id", "./pages/MainFlow.tsx", { id: "resubmission" }),
        route("/final_checkout", "./pages/FinalCheckout.tsx"),
        route("/checkout", "./pages/Checkout.tsx"),
        route("/jobs/:jobId", "./pages/JobSubmitted.tsx"), //config later so only owner of job or admin can access
        route("/client_view/:id", "./pages/ClientView.tsx") // Client job tracking page with SOW viewer and comments
    ]),
    layout("./layouts/PrivateRouteDamplabStaff.tsx", [
        route("/technician_view/:id", "./pages/TechnicianView.tsx"),
        route("/dashboard", "./pages/Dashboard.tsx"),
        route("/dominos", "./pages/Dominos.tsx"),
        route("/elabs", "./pages/ELabs.tsx"),
        route("/kernel", "./pages/Kernel.tsx"),
        route("/edit", "./pages/AdminEdit.tsx"),
        route("/release_notes", "./pages/ReleaseNotes.tsx"),
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
