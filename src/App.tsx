import { Routes, Route } from "react-router";
// import { searchForEndService } from './controllers/GraphHelpers';
import LoginForm          from './components/LoginForm';
import PrivateRouteDamplabStaff  from './components/PrivateRouteDamplabStaff';
import PrivateRouteAuthed from './components/PrivateRouteAuthed';
import MainFlow       from './pages/MainFlow';
import Checkout       from './pages/Checkout';
import TechnicianView from './pages/TechnicianView';
import Dominos        from './pages/Dominos';
import Dashboard      from './pages/Dashboard';
import JobSubmitted   from './pages/JobSubmitted';
import ELabs          from './pages/ELabs';
import Kernel         from './pages/Kernel';
import ReleaseNotes   from './pages/ReleaseNotes';
import TestPage       from './pages/TestPage';
import FinalCheckout from './pages/FinalCheckout';
// import Tracking       from './pages/ClientView';
// import Accepted       from './pages/Accepted';
import './App.css';
import './styles/dominos.css';
import { AdminEdit } from './pages/AdminEdit';

function App() {

  return (
    <div className="App">

                  <Routes>

                    <Route path = "/"                    element = {<LoginForm />} />
                    <Route path = "/login"               element = {<LoginForm />} />

                    <Route path = "/canvas"              element = {<MainFlow />} />
                    <Route path = "/resubmission/:id"    element = {<PrivateRouteAuthed> <MainFlow />                 </PrivateRouteAuthed>} />
                    <Route path = "/final_checkout"      element = {<PrivateRouteAuthed> <FinalCheckout />            </PrivateRouteAuthed>} />
                    <Route path = "/checkout"            element = {<PrivateRouteAuthed> <Checkout />                 </PrivateRouteAuthed>} />
                    <Route path = "/submitted"           element = {<PrivateRouteAuthed> <JobSubmitted />             </PrivateRouteAuthed>} />

                    <Route path = "/technician_view/:id" element = {<PrivateRouteDamplabStaff> <TechnicianView />            </PrivateRouteDamplabStaff>} />
                    <Route path = "/dashboard"           element = {<PrivateRouteDamplabStaff> <Dashboard />                 </PrivateRouteDamplabStaff>} />
                    <Route path = "/dominos"             element = {<PrivateRouteDamplabStaff> <Dominos />                   </PrivateRouteDamplabStaff>} />
                    <Route path = "/elabs"               element = {<PrivateRouteDamplabStaff> <ELabs />                     </PrivateRouteDamplabStaff>} />
                    <Route path = "/kernel"              element = {<PrivateRouteDamplabStaff> <Kernel />                    </PrivateRouteDamplabStaff>} />

                    <Route path = "/release_notes"       element = {<ReleaseNotes />} />
                    <Route path = "/test_page"           element = {<TestPage />} />
                    <Route path = "/edit"                element = {<PrivateRouteDamplabStaff> <AdminEdit />                 </PrivateRouteDamplabStaff>} />
                    <Route path = "/*"                   element = {<div>Sorry, we can't find this page at the moment (404). Please double check the URL or try again later.</div>} />
                    {/* <Route path = "/client_view/:id"     element = {<PrivateRouteAdmin> <Tracking />                  </PrivateRouteAdmin>} /> */}
                    {/* <Route path = "/callback"            element = {<PrivateRouteAdmin> <ELabs />                     </PrivateRouteAdmin>} /> */}
                    {/* <Route path="/accepted" element={wrapPrivateRoute(<Accepted />, isLoggedIn, 'accepted')} /> */}

                  </Routes>

    </div>
  );
}

export default App;
