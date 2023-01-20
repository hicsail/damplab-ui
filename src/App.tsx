import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import MainFlow from './pages/MainFlow';
import Checkout from './pages/Checkout';
import { BrowserRouter, Routes, Route, Outlet, Link } from "react-router-dom";
import HeaderBar from './components/HeaderBar';
import { CanvasContext } from './contexts/Canvas';
import { ApolloClient, InMemoryCache, ApolloProvider, gql } from '@apollo/client';

function App() {

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeComponentId, setActiveComponentId] = useState('');
  const [nodeParams, setNodeParams] = useState([]);

  const client = new ApolloClient({
    uri: 'https://damplab-test.sail.codes/graphql',
    cache: new InMemoryCache(),
  });

  client
    .query({
      query: gql`
      query GetServices {
        services {
          _id
          name
        }
      }
    `,
    })
    .then((result) => console.log(result));

  return (
    <div className="App">
      <ApolloProvider client={client}>
        <CanvasContext.Provider value={{ nodes: nodes, edges: edges, setNodes: setNodes, setEdges: setEdges, activeComponentId: activeComponentId, setActiveComponentId: setActiveComponentId, nodeParams: nodeParams, setNodeParams: setNodeParams }}>
          <BrowserRouter>
            <HeaderBar />
            <Routes>
              <Route path="/" element={<MainFlow />} />
              <Route path="/checkout" element={<Checkout />} />
            </Routes>
          </BrowserRouter>
        </CanvasContext.Provider>
      </ApolloProvider>
    </div>
  );
}

export default App;
