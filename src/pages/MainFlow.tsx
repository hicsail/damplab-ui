import { useState, useCallback, useRef, useEffect, useContext } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    Controls,
    Background,
    addEdge,
    FitViewOptions,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
    Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateFormDataFromParams, createNodeObject } from '../controllers/ReactFlowEvents';
import Sidebar from '../components/Sidebar';
import CustomDemoNode from '../components/CustomDemoNode';
import RightSidebar from '../components/RightSidebar';
import { CanvasContext } from '../contexts/Canvas';
import { NodeData, NodeParameter } from '../types/CanvasTypes';
import '../styles/sidebar.css';
import { isValidConnection } from '../controllers/GraphHelpers';

const nodeTypes = {
    selectorNode: CustomDemoNode,
};

const fitViewOptions: FitViewOptions = {
    padding: 0.2,   
};


export default function MainFlow() {

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    let {nodes, edges, setNodes, setEdges, setActiveComponentId} = useContext(CanvasContext);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds: any) => applyNodeChanges(changes, nds)),
        [setNodes]
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds: any) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );
    const onConnect = useCallback((connection: Connection) => {
        let customConnection: any = connection;
        // if (!isValidConnection(nodes, customConnection.source, customConnection.target)) {
        //     customConnection.label = 'invalid connection';
        //     customConnection.style = { stroke: 'red' };
        // }
        setEdges((eds: any) => addEdge(customConnection, eds))
    },[setEdges, nodes]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: any) => {

        event.preventDefault();
        const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
        let type = event.dataTransfer.getData('application/reactflow');
        type = JSON.parse(type);
        
        const serviceId = type.id
        const name = type.name;
        // check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
            return;
        }
       
        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        const nodeId = Math.random().toString(36).substring(2, 9);
        setActiveComponentId(nodeId);

        const formData: NodeParameter[] = generateFormDataFromParams(type.parameters, nodeId);
        const data: NodeData = { id: nodeId, label: name, allowedConnections: type.allowedConnections, icon: type.icon, parameters: type.parameters, additionalInstructions: "", formData: formData, serviceId: serviceId };
        const newNode = createNodeObject(nodeId, name, type.type, position, data);

        setNodes((nds: any) => nds.concat(newNode));
    }, [reactFlowInstance, nodes]);


    return (
        <>
            <div style={{ height: '100vh' }}>
                <ReactFlowProvider>
                    <div className="reactflow-wrapper" style={{ height: '85vh', display: 'flex' }} ref={reactFlowWrapper}>
                        <div style={{ maxWidth: '15%', borderRight: 'solid 1px' }}>
                            <Sidebar />
                        </div>

                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            //snapToGrid={true}
                            snapGrid={[25, 25]}
                            nodeTypes={nodeTypes}
                            onDragOver={onDragOver}
                            fitView
                            fitViewOptions={fitViewOptions}
                            style={{ width: '70%', height: '100%'}}
                        >
                            <Background />
                            <Controls />
                        </ReactFlow>
                        <div style={{ minWidth: '15%', borderLeft: 'solid 1px' }}>
                            <RightSidebar />
                        </div>

                    </div>
                </ReactFlowProvider>
            </div>

        </>
    )
}
