import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import MainFlow from './pages/MainFlow';
import Checkout from './pages/Checkout';
import { BrowserRouter, Routes, Route, Outlet, Link } from "react-router-dom";
import HeaderBar from './components/HeaderBar';
import { CanvasContext } from './contexts/Canvas';

function App() {

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeComponentId, setActiveComponentId] = useState('');
  const [nodeParams, setNodeParams] = useState([]);


  return (
    <div className="App">
      <CanvasContext.Provider value={{ nodes: nodes, edges: edges, setNodes: setNodes, setEdges: setEdges, activeComponentId: activeComponentId, setActiveComponentId: setActiveComponentId, nodeParams: nodeParams, setNodeParams: setNodeParams }}>
      <BrowserRouter>
        <HeaderBar />
        <Routes>
          <Route path="/" element={<MainFlow />} />
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </BrowserRouter>
      </CanvasContext.Provider>
    </div>
  );
}

export default App;
