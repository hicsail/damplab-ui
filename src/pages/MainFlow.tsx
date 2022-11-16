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
    useNodesState,
    useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

import Sidebar from '../components/Sidebar';
import CustomDemoNode from '../components/CustomDemoNode';
import HeaderBar from '../components/HeaderBar';
import ContextTestComponent from '../components/ContextTestComponent';

import { CanvasContext } from '../contexts/Canvas';

import '../styles/sidebar.css';


const nodeTypes = {
    selectorNode: CustomDemoNode,
};

const initBgColor = '#1A192B';

const fitViewOptions: FitViewOptions = {
    padding: 0.2,
    
};


export default function MainFlow() {

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [bgColor, setBgColor] = useState(initBgColor);
    let {nodes, edges, setNodes, setEdges, setActiveComponentId} = useContext(CanvasContext);
    const snapGrid = [15, 15];

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
        console.log(type);
        type = JSON.parse(type);
        const name = type.name;
        // check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
            return;
        }
        // get nodes from context
       
        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        // find active node and set it to false

        const nodeId = Math.random().toString(36).substring(2, 9);
        setActiveComponentId(nodeId);

        // generate form data 
        const formData = [];

        for (let i = 0; i < type.parameters.length; i++) {
            const parameter = type.parameters[i];
            
            
            const formId = Math.random().toString(36).substring(2, 9);
            formData.push({
                id: formId,
                nodeId: nodeId,
                name: parameter.name,
                type: parameter.type,
                paramType: 'input',
                value: null,
                //setValue: setValue,
                required: true // parameter.required,
            });
        }

        if (type.resultParams) {
            for (let i = 0; i < type.resultParams.length; i++) {
                const parameter = type.resultParams[i];
                
                
                const formId = Math.random().toString(36).substring(2, 9);
                formData.push({
                    id: formId,
                    nodeId: nodeId,
                    name: parameter,
                    type: parameter.type,
                    paramType: 'result',
                    value: null,
                    //setValue: setValue,
                    required: true // parameter.required,
                });
            }
        }

        const newNode = {
            id: nodeId,
            name,
            type: 'selectorNode',
            position,
            active: true,
            data: { id: nodeId, label: name, allowedConnections: type.allowedConnections, icon: type.icon, parameters: type.parameters, additionalInstructions: "", formData: formData },
        };

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
