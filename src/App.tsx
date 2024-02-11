import { useState, useEffect, useContext } from 'react';
import './App.css';
import './styles/dominos.css';
import MainFlow from './pages/MainFlow';
import Checkout from './pages/Checkout';
import Submitted from './pages/Submitted';
import Dominos from "./pages/Dominos";
import { BrowserRouter, Routes, Route, } from "react-router-dom";
import HeaderBar from './components/HeaderBar';
import { CanvasContext } from './contexts/Canvas';
import { AppContext } from './contexts/App';
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client';
import { GET_BUNDLES, GET_SERVICES } from './gql/queries';
import Accepted from './pages/Accepted';
import JobSubmitted from './pages/JobSubmitted';
import ELabs from './pages/ELabs';
import { searchForEndService } from './controllers/GraphHelpers';
import Tracking from './pages/Tracking';

function App() {

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeComponentId, setActiveComponentId] = useState('');
  const [nodeParams, setNodeParams] = useState([]);
  const [services, setServices] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [hazards, setHazards] = useState(Array<string>);

  const client = new ApolloClient({
    uri: 'https://damplab-test.sail.codes/graphql',
    cache: new InMemoryCache(),
  });

  // initial load of services and bundles
  useEffect(() => {
    client.query({ query: GET_SERVICES }).then((result) => {
      console.log('services loaded successfully on app', result);
      setServices(result.data.services);
      // let array: any = [];
      // console.log(searchForEndService('seq', 'dpn1', result.data.services, array));
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
          <CanvasContext.Provider value={{ nodes: nodes, edges: edges, 
                                           setNodes: setNodes, setEdges: setEdges, 
                                           activeComponentId: activeComponentId, 
                                           setActiveComponentId: setActiveComponentId, 
                                           nodeParams: nodeParams, setNodeParams: setNodeParams }}>
              <BrowserRouter>
                <HeaderBar />
                <div style={{ padding: 20 }}>
                  <Routes>
                    <Route path="/" element={<MainFlow /*services={services}*//>} />
                    <Route path="/resubmission/:id" element={<MainFlow client={client} /*services={services}*//>} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/submitted/:id" element={<Submitted />} />
                    <Route path="/submitted" element={<JobSubmitted />} />
                    <Route path="/tracking/:id" element={<Tracking />} />
                    <Route path="/accepted" element={<Accepted />} />
                    <Route path="/dominos" element={<Dominos />} />
                    <Route path="/elabs" element={<ELabs />} />
                    <Route path="/callback" element={<ELabs />} />
                    <Route path="/*" element={<div>404 Route not found</div>} />
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
