import React, { useState, useEffect, useCallback } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogActions, 
  DialogTitle,
  Button, 
  Typography,
  Box,
  Chip
} from '@mui/material';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  Background,
  Controls,
  useReactFlow,
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodeData } from '../../types/CanvasTypes';
import { createNodeObject } from '../../controllers/ReactFlowEvents';
import { Bundle, BundleNode, BundleEdge } from '../../gql/graphql';
import { transformEdgesToGQL } from '../../controllers/GraphHelpers';

type BundleCanvasPopupProps = {
  open: boolean;
  onClose: () => void;  
  bundle: Bundle;
  allServices: any[];
  onSave: (result: { nodes: BundleNode[]; edges: BundleEdge[] }) => void;
};

const BundleCanvasContent: React.FC<{
  bundle: NonNullable<BundleCanvasPopupProps['bundle']>;
  allServices: any[];
  onSave:  (bundle: { nodes: BundleNode[]; edges: BundleEdge[] }) => void;
  onClose: () => void;
}> = ({ bundle, allServices, onSave, onClose }) => {
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false); // ImplemeserviceIdnt this feat in case admin closes before saving
  const { fitView } = useReactFlow();


  useEffect(() => {
    if (!bundle) return;

    const getRandomPosition = () => ({
      x: Math.random() * 300 + 50,
      y: Math.random() * 200 + 50,
    });

    // Creating nodes with separate canvas IDs
    const nodesFromBundle: Node<NodeData>[] = bundle.nodes.map((node, index) => {
      const canvasId = `canvas-${node.id}-${Date.now()}-${index}`;
      const position = node.position ?? getRandomPosition(); // Use existing coords if they exist; new nodes create random
      console.log('Position: ', position)
      
      console.log(node)
      const data: NodeData = {
        id: node.id,
        label: node.label || 'Unnamed Service',
        serviceId: node.service?.id, 
      };

      return createNodeObject(canvasId, data.label, 'selectorNode', position, data);
    });

    const edgesFromBundle = bundle.edges?.map(e => {
      const sourceCanvas = `canvas-${e.source}`;
      const targetCanvas = `canvas-${e.target}`;

      return {
        ...e,
        source: sourceCanvas,
        target: targetCanvas,
        reactEdge: e.reactEdge || { id: e.id, source: sourceCanvas, target: targetCanvas },
      };
    }) || [];

    setNodes(nodesFromBundle);
    setEdges(edgesFromBundle);
    setHasChanges(false);

    setTimeout(() => fitView({ padding: 0.1 }), 100);
  }, [bundle, fitView]);


    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((nds) => applyNodeChanges(changes, nds));
        setHasChanges(true);
    }, []);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
        setEdges((eds) => applyEdgeChanges(changes, eds));
        setHasChanges(true);
    }, []);

    const onConnect = useCallback((connection: Connection) => {
        setEdges((eds) => addEdge(connection, eds));
        setHasChanges(true);
    }, []);


    const addServiceToCanvas = (service: any) => {
      const exists = nodes.find(n => n.data.serviceId === service.id);
      if (exists) return;

      const newNodeId = `service-${service.id}-${Date.now()}`; // Only for ReactFlow ID
      const backendNodeId = null;                              // Assigned by backend
      const position = { x: Math.random() * 300 + 50, y: Math.random() * 200 + 50 };

      const data: NodeData = {
        id: backendNodeId,
        label: service.name || service.label || 'Unnamed Service',
        serviceId: service.id,
      };

      const newNode = createNodeObject(newNodeId, data.label, 'selectorNode', position, data);
      setNodes((nds) => [...nds, newNode]);
      setHasChanges(true);
  };


  const removeServiceFromCanvas = (serviceId: string) => {
    setNodes((nds) => nds.filter(node => node.data.serviceId !== serviceId));
    setEdges((eds) => eds.filter(edge => 
      !nodes.some(node => node.data.serviceId === serviceId && (edge.source === node.id || edge.target === node.id))
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!bundle) return;

    const updatedNodes = nodes.map((node) => ({
      id: node.data.id || `node-${node.data.serviceId}-${Date.now()}`, 
      serviceId: node.data.serviceId,          
      label: node.data.label,
      position: node.position ? { x: node.position.x, y: node.position.y } : null,
    }));

    const updatedEdges = transformEdgesToGQL(edges);
    
    onSave({ nodes: updatedNodes, edges: updatedEdges } as any);
  };

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // First find which services are alr on Canvas, then filter to only display unused services
  // Only problem currently is after you add a service, you can't find it in Available again... also UI sucks
  const availableServices = allServices.filter(service => 
    !nodes.some(node => node.data.serviceId === service.id)
  );

  return (
    <>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Edit Bundle: {bundle.label}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ height: '70vh', display: 'flex', flexDirection: 'column', p: 0 }}>
        {/* Available Services Panel */}
        {availableServices.length > 0 && (
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#f5f5f5' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Available Services:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {availableServices.slice(0, 10).map((service) => (
                <Chip
                  key={service.id}
                  label={service.name || service.label}
                  onClick={() => addServiceToCanvas(service)}
                  size="small"
                  variant="outlined"
                  sx={{ cursor: 'pointer' }}
                />
              ))}
              {availableServices.length > 10 && (
                <Typography variant="caption" color="text.secondary">
                  +{availableServices.length - 10} more...
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Canvas */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            style={{ width: '100%', height: '100%' }}
            minZoom={0.1}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </Box>

        {/* Current Services List */}
        {nodes.length > 0 && (
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: '#f9f9f9' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Services in Bundle: {nodes.length}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {nodes.map((node) => (
                <Chip
                  key={node.id}
                  label={node.data.label}
                  onDelete={() => removeServiceFromCanvas(node.data.serviceId)}
                  size="small"
                  color="primary"
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="secondary">
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={nodes.length === 0}
        >
          Save Bundle
        </Button>
      </DialogActions>
    </>
  );
};


export const BundleCanvasPopup: React.FC<BundleCanvasPopupProps> = ({open, onClose, bundle, allServices, onSave}) => {
  if (!bundle) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="xl"
    >
      <ReactFlowProvider>
        <BundleCanvasContent
          bundle={bundle}
          allServices={allServices}
          onSave={onSave}
          onClose={onClose}
        />
      </ReactFlowProvider>
    </Dialog>
  );
};