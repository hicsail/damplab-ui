import { useState, useEffect } from 'react';
import './App.css';
import MainFlow from './pages/MainFlow';
import Checkout from './pages/Checkout';
import Submitted from './pages/Submitted';
import { BrowserRouter, Routes, Route, Outlet, Link } from "react-router-dom";
import HeaderBar from './components/HeaderBar';
import { CanvasContext } from './contexts/Canvas';
import { AppContext } from './contexts/App';
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client';
import { GET_BUNDLES, GET_SERVICES } from './gql/queries';
import Accepted from './pages/Accepted';

function App() {

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeComponentId, setActiveComponentId] = useState('');
  const [nodeParams, setNodeParams] = useState([]);
  const [services, setServices] = useState([]);
  const [bundles, setBundles] = useState([]);

  const client = new ApolloClient({
    uri: 'https://damplab-test.sail.codes/graphql',
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
  }, []);

  return (
    <div className="App">
      <ApolloProvider client={client}>
        <AppContext.Provider value={{ services: services, bundles: bundles }}>
          <CanvasContext.Provider value={{ nodes: nodes, edges: edges, setNodes: setNodes, setEdges: setEdges, activeComponentId: activeComponentId, setActiveComponentId: setActiveComponentId, nodeParams: nodeParams, setNodeParams: setNodeParams }}>
            <BrowserRouter>
              <HeaderBar />
              <div style={{ padding: 20 }}>
                <Routes>
                  <Route path="/" element={<MainFlow />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/submitted/:id" element={<Submitted />} />
                  <Route path="/accepted" element={<Accepted />} />
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
