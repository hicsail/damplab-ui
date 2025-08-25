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

type BundleCanvasPopupProps = {
  open: boolean;
  onClose: () => void;
  bundle: {
    id: string;
    label: string;
    nodes: { id: string; label: string }[];
    edges?: { id: string; source: string; target: string }[];
  } | null;
  allServices: any[];
  onSave: (result: { 
    nodes: { id: string; label: string }[];
    edges: { id: string; source: string; target: string }[];
  }) => void;
};

const BundleCanvasContent: React.FC<{
  bundle: NonNullable<BundleCanvasPopupProps['bundle']>;
  allServices: any[];
  onSave: (services: any[]) => void;
  onClose: () => void;
}> = ({ bundle, allServices, onSave, onClose }) => {
  const [nodes, setNodes] = useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false); // Implement this feat in case admin closes before saving
  const { fitView } = useReactFlow();


  useEffect(() => {
    if (bundle && bundle.services) {
      const initialNodes = bundle.services.map((service, index) => {
        // Grid layout like the MainFLow Canvas
        const cols = 4;
        const nodeSpacing = { x: 200, y: 150 };
        const position = { 
          x: (index % cols) * nodeSpacing.x + 50, 
          y: Math.floor(index / cols) * nodeSpacing.y + 50 
        };
        
        const nodeId = service.id || `service-${index}`;
        const data: NodeData = {
          id: nodeId,
          label: service.name || service.label || 'Unnamed Service',
          serviceId: service.id,
          icon: service.icon,
          price: service.price,
          description: service.description,
          parameters: service.parameters || [],
          allowedConnections: service.allowedConnections || [],
          formData: [],
          paramGroups: service.paramGroups || [],
          additionalInstructions: '',
        };
        
        return createNodeObject(nodeId, data.label, 'selectorNode', position, data);
      });
      setNodes(initialNodes);
      setEdges([]);
      setHasChanges(false);
      
      setTimeout(() => fitView({ padding: 0.1 }), 100); // Fit view after nodes are rendered
    }
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
        const existingNode = nodes.find(node => node.data.serviceId === service.id);
        if (existingNode) return;

        const newNodeId = `service-${service.id}-${Date.now()}`; // Random spawn pos so services aren't on top of each other
        const position = { 
            x: Math.random() * 300 + 50, 
            y: Math.random() * 200 + 50 
        };

        const data: NodeData = {
            id: newNodeId,
            label: service.name || service.label || 'Unnamed Service',
            serviceId: service.id,
            icon: service.icon,
            price: service.price,
            description: service.description,
            parameters: service.parameters || [],
            allowedConnections: service.allowedConnections || [],
            formData: [],
            paramGroups: service.paramGroups || [],
            additionalInstructions: '',
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
    const updatedNodes = nodes.map((node) => ({
      id: node.id,
      serviceId: node.data.serviceId,
      label: node.data.label,
    }));

    const updatedEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      reactEdge: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        animated: edge.animated || false,
        style: edge.style || {},
        label: edge.label || '',
      }
    }));

    onSave({
      nodes: updatedNodes,
      edges: updatedEdges,
    });
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