import { useState, useCallback, useRef, useEffect, useContext } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    Controls,
    Background,
    addEdge,
    FitViewOptions,
    applyNodeChanges,
    applyEdgeChanges,
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection,
    useNodes,
    useNodesState,
    useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { generateFormDataFromParams, createNodeObject } from '../controllers/ReactFlowEvents';
import Sidebar from '../components/Sidebar';
import CustomDemoNode from '../components/CustomDemoNode';
import HeaderBar from '../components/HeaderBar';
import ContextTestComponent from '../components/ContextTestComponent';

import { CanvasContext } from '../contexts/Canvas';
import { NodeData, NodeParameter } from '../types/CanvasTypes';
import '../styles/sidebar.css';


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
    const onConnect = useCallback(
        (connection: Connection) => setEdges((eds: any) => addEdge(connection, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: any) => {

        event.preventDefault();
        const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
        let type = event.dataTransfer.getData('application/reactflow');
        type = JSON.parse(type);
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
        const data: NodeData = { id: nodeId, label: name, allowedConnections: type.allowedConnections, icon: type.icon, parameters: type.parameters, additionalInstructions: "", formData: formData };
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
                            <ContextTestComponent />
                        </div>

                    </div>
                </ReactFlowProvider>
            </div>

        </>
    )
}
