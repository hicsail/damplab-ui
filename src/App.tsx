import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

import { CanvasContext }             from './contexts/Canvas';
import { AppContext }                from './contexts/App';
import { GET_BUNDLES, GET_SERVICES } from './gql/queries';
// import { searchForEndService } from './controllers/GraphHelpers';
import HeaderBar          from './components/HeaderBar';
import LoginForm          from './components/LoginForm';
import PrivateRouteAdmin  from './components/PrivateRouteAdmin';
import PrivateRouteClient from './components/PrivateRouteClient';
import MainFlow       from './pages/MainFlow';
import Checkout       from './pages/Checkout';
import TechnicianView from './pages/TechnicianView';
import Dominos        from './pages/Dominos';
import Dashboard      from './pages/Dashboard';
import JobSubmitted   from './pages/JobSubmitted';
import Screener       from './pages/Screener';
import ELabs          from './pages/ELabs';
import Kernel         from './pages/Kernel';
import ReleaseNotes   from './pages/ReleaseNotes';
import TestPage       from './pages/TestPage';
import FinalCheckout from './pages/FinalCheckout';
import Auth0Callback  from './components/Auth0Callback';
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
  const [hazards, setHazards] = useState<string[]>([]);

  const httpLink = createHttpLink({
    uri: process.env.REACT_APP_BACKEND,
  });

  const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('session_token');
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      }
    }
  });

  const client = new ApolloClient({
    link: authLink.concat(httpLink),
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

                    <Route path = "/canvas"              element = {<PrivateRouteClient> <MainFlow />                 </PrivateRouteClient>} />
                    <Route path = "/resubmission/:id"    element = {<PrivateRouteClient> <MainFlow client={client} /> </PrivateRouteClient>} />
                    <Route path = "/final_checkout"      element = {<PrivateRouteClient> <FinalCheckout />           </PrivateRouteClient>} />
                    <Route path = "/checkout"            element = {<PrivateRouteClient> <Checkout />                 </PrivateRouteClient>} />
                    <Route path = "/submitted"           element = {<PrivateRouteClient> <JobSubmitted />             </PrivateRouteClient>} />

                    <Route path = "/technician_view/:id" element = {<PrivateRouteAdmin> <TechnicianView />            </PrivateRouteAdmin>} />
                    <Route path = "/dashboard"           element = {<PrivateRouteAdmin> <Dashboard client={client} /> </PrivateRouteAdmin>} />
                    <Route path = "/dominos"             element = {<PrivateRouteAdmin> <Dominos />                   </PrivateRouteAdmin>} />
                    <Route path = "/screener"            element = {<PrivateRouteAdmin> <Screener />                  </PrivateRouteAdmin>} />
                    <Route path = "/elabs"               element = {<PrivateRouteAdmin> <ELabs />                     </PrivateRouteAdmin>} />
                    <Route path = "/kernel"              element = {<PrivateRouteAdmin> <Kernel />                    </PrivateRouteAdmin>} />
                    <Route path = "/release_notes"       element = {<PrivateRouteAdmin> <ReleaseNotes />              </PrivateRouteAdmin>} />

                    <Route path = "/test_page"           element = {<PrivateRouteAdmin> <TestPage />                  </PrivateRouteAdmin>} />
                    <Route path = "/edit"                element = {<PrivateRouteAdmin> <AdminEdit />                 </PrivateRouteAdmin>} />
                    <Route path = "/mpi/auth0_redirect"  element = {<Auth0Callback />} />
                    <Route path = "/*"                   element = {<div>Sorry, we can't find this page at the moment (404). Please double check the URL or try again later.</div>} />
                    {/* <Route path = "/client_view/:id"     element = {<PrivateRouteAdmin> <Tracking />                  </PrivateRouteAdmin>} /> */}
                    {/* <Route path = "/callback"            element = {<PrivateRouteAdmin> <ELabs />                     </PrivateRouteAdmin>} /> */}
                    {/* <Route path="/accepted" element={wrapPrivateRoute(<Accepted />, isLoggedIn, 'accepted')} /> */}

                  </Routes>

                </div>
              </BrowserRouter>
          </CanvasContext.Provider>
        </AppContext.Provider>
      </ApolloProvider>
    </div>
  );
}

export default App;
