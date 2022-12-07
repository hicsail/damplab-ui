import React, { useState } from 'react';
import './App.css';
import MainFlow from './pages/MainFlow';
import Checkout from './pages/Checkout';
import { BrowserRouter, HashRouter, Routes, Route,} from "react-router-dom";
import HeaderBar from './components/HeaderBar';
import { CanvasContext } from './contexts/Canvas';

function App() {

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [activeComponentId, setActiveComponentId] = useState('');
  const [nodeParams, setNodeParams] = useState([]);

  // give me code to set up routes using hashrouter


  return (
    <div className="App">
      <CanvasContext.Provider value={{ nodes: nodes, edges: edges, setNodes: setNodes, setEdges: setEdges, activeComponentId: activeComponentId, setActiveComponentId: setActiveComponentId, nodeParams: nodeParams, setNodeParams: setNodeParams }}>
      <HashRouter>
        <HeaderBar />
        <Routes>
          <Route path="/" element={<MainFlow />} />
          <Route path="/checkout" element={<Checkout />} />
        </Routes>
      </HashRouter>
      </CanvasContext.Provider>
    </div>
  );
}

export default App;
