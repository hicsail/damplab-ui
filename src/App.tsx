import { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

import { CanvasContext }             from './contexts/Canvas';
import { AppContext }                from './contexts/App';
import { UserContext }               from './contexts/UserContext';
import { GET_BUNDLES, GET_SERVICES } from './gql/queries';
// import { searchForEndService } from './controllers/GraphHelpers';
import HeaderBar          from './components/HeaderBar';
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

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeComponentId, setActiveComponentId] = useState('');
  const [nodeParams, setNodeParams] = useState([]);
  const [services, setServices] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [hazards, setHazards] = useState(Array<string>);

  const user = useContext(UserContext);

  const client = new ApolloClient({
    uri: import.meta.env.VITE_BACKEND,
    cache: new InMemoryCache(),
  });

  // initial load of services and bundles
  useEffect(() => {

    client.query({ query: GET_SERVICES }).then((result) => {
      console.log('services loaded successfully on app', result);
      setServices(result.data.services);

    }).catch((error) => {
      console.log('error when loading services on app', error);
    });

    client.query({ query: GET_BUNDLES }).then((result) => {
      console.log('bundles loaded successfully on app', result);
      setBundles(result.data.bundles);
    }).catch((error) => {
      console.log('error when loading bundles on app', error);
    });

    // TODO: Change hazards to a service attribute...
    // Matches to 'activeNode?.data.label in RightSideBar
    setHazards(['Gibson Assembly', 'Modular Cloning']);

  }, []);


  return (
    <div className="App">
      <ApolloProvider client={client}>
        <AppContext.Provider value={{ services: services, bundles: bundles, hazards: hazards }}>
          <UserContext.Provider value={ user }>
          <CanvasContext.Provider value={{ nodes: nodes, setNodes: setNodes,
                                           edges: edges, setEdges: setEdges,
                                           activeComponentId: activeComponentId, setActiveComponentId: setActiveComponentId,
                                           nodeParams: nodeParams, setNodeParams: setNodeParams }}>
              <BrowserRouter>

                <HeaderBar />

                <div style={{ padding: 20 }}>

                  <Routes>

                    <Route path = "/"                    element = {<LoginForm />} />
                    <Route path = "/login"               element = {<LoginForm />} />

                    <Route path = "/canvas"              element = {<MainFlow />} />
                    <Route path = "/resubmission/:id"    element = {<PrivateRouteAuthed> <MainFlow client={client} /> </PrivateRouteAuthed>} />
                    <Route path = "/final_checkout"      element = {<PrivateRouteAuthed> <FinalCheckout />            </PrivateRouteAuthed>} />
                    <Route path = "/checkout"            element = {<PrivateRouteAuthed> <Checkout />                 </PrivateRouteAuthed>} />
                    <Route path = "/submitted"           element = {<PrivateRouteAuthed> <JobSubmitted />             </PrivateRouteAuthed>} />

                    <Route path = "/technician_view/:id" element = {<PrivateRouteDamplabStaff> <TechnicianView />            </PrivateRouteDamplabStaff>} />
                    <Route path = "/dashboard"           element = {<PrivateRouteDamplabStaff> <Dashboard client={client} /> </PrivateRouteDamplabStaff>} />
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
              </BrowserRouter>
          </CanvasContext.Provider>
          </UserContext.Provider>
        </AppContext.Provider>
      </ApolloProvider>
    </div>
  );
}

export default App;
