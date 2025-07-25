import {
    type RouteConfig,
    index,
    layout,
    route,
} from "@react-router/dev/routes";

export default [
    index("./pages/LoginForm.tsx", { id: "index" }), // specify 'id' to avoid duplicating /login route's id
    route("/login", "./pages/LoginForm.tsx"),

    route("/canvas", "./pages/MainFlow.tsx"),

    layout("./layouts/PrivateRouteAuthed.tsx", [
        route("/resubmission/:id", "./pages/MainFlow.tsx", { id: "resubmission" }),
        route("/final_checkout", "./pages/FinalCheckout.tsx"),
        route("/checkout", "./pages/Checkout.tsx"),
        route("/submitted", "./pages/JobSubmitted.tsx"),
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

        /* Old comments from pre-React-Router-migration App.tsx: */
        /* <Route path = "/client_view/:id" element = {<PrivateRouteAdmin> <Tracking /> </PrivateRouteAdmin>} /> */
        /* <Route path = "/callback" element = {<PrivateRouteAdmin> <ELabs /> </PrivateRouteAdmin>} /> */
        /* <Route path="/accepted" element={wrapPrivateRoute(<Accepted />, isLoggedIn, 'accepted')} /> */
    ]),

    route("/test_page", "./pages/TestPage.tsx"),

    route("*", "./pages/NotFound.tsx"),
] satisfies RouteConfig;