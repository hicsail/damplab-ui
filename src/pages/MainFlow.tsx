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
    // const [nodes, setNodes] = useState<Node[]>([]);
    // const [edges, setEdges] = useState<Edge[]>([]);
    const [bgColor, setBgColor] = useState(initBgColor);

    let {nodes, edges, setNodes, setEdges, setActiveComponentId} = useContext(CanvasContext);
    // const nodes = canvasContext.nodes;
    // const edges = canvasContext.edges;
    // const setNodes = canvasContext.setNodes;
    // const setEdges = canvasContext.setEdges;

    const snapGrid = [15, 15];

    useEffect(() => {
        
    }, [nodes])


    useEffect((): any => {
        const onChange = (event: any) => {
            console.log('hit');
            setNodes((nds: any) =>
                nds.map((node: any) => {
                    if (node.id !== '2') {
                        return node;
                    }

                    const color = event.target.value;

                    setBgColor(color);

                    return {
                        ...node,
                        data: {
                            ...node.data,
                            color,
                        },
                    };
                })
            );
        };

        // setNodes(
        //     [
        //         {
        //             id: '1',
        //             data: { label: 'Node 1' },
        //             type: 'input',
        //             position: { x: 250, y: 5 },
        //             sourcePosition: 'right',
        //         },
        //         {
        //             id: '2',
        //             data: { label: 'Node 2' },
        //             position: { x: 5, y: 100 },
        //             targetPosition: 'left',
        //         },
        //         {
        //             id: '3',
        //             type: 'selectorNode',
        //             data: { onChange: onChange, color: initBgColor, label: 'Node 3' },
        //             style: { border: '1px solid #777', padding: 10 },
        //             position: { x: 300, y: 50 },
        //         },
        //     ]
        // )

        // setEdges(
        //     [{ id: 'e1-2', source: '1', target: '2' }]
        // );
    }, []);

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
        // get nodes from context
       
        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        // find active node and set it to false

        const nodeId = Math.random().toString(36).substring(2, 9);
        setActiveComponentId(nodeId);

        const newNode = {
            id: nodeId,
            name,
            type: 'selectorNode',
            position,
            active: true,
            data: { id: nodeId, label: name, allowedConnections: type.allowedConnections, icon: type.icon, parameters: type.parameters, resultParams: type.resultParams, inputBaseParams: [], inputResultParams: [] },
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
