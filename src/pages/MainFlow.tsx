import { useState, useCallback, useRef, useEffect } from 'react';
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
import Context from '@mui/base/TabsUnstyled/TabsContext';

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
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [bgColor, setBgColor] = useState(initBgColor);

    useEffect((): any => {
        const onChange = (event: any) => {
            setNodes((nds) =>
                nds.map((node) => {
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

        setNodes(
            [
                {
                    id: '1',
                    data: { label: 'Node 1' },
                    type: 'input',
                    position: { x: 250, y: 5 },
                    sourcePosition: 'right',
                },
                {
                    id: '2',
                    data: { label: 'Node 2' },
                    position: { x: 5, y: 100 },
                    targetPosition: 'left',
                },
                {
                    id: '3',
                    type: 'selectorNode',
                    data: { onChange: onChange, color: initBgColor },
                    style: { border: '1px solid #777', padding: 10 },
                    position: { x: 300, y: 50 },
                },
            ]
        )

        setEdges(
            [{ id: 'e1-2', source: '1', target: '2' }]
        );
    }, []);

    const onNodesChange = useCallback(

        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );
    const onConnect = useCallback(
        (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
        [setEdges]
    );

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback((event: any) => {

        event.preventDefault();
        const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow');

        // check if the dropped element is valid
        if (typeof type === 'undefined' || !type) {
            return;
        }

        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
            id: Math.random().toString(36).substring(2, 9),
            type,
            position,
            data: { label: `${type} node` },
        };

        setNodes((nds) => nds.concat(newNode));
        console.log(JSON.stringify(nodes));
        console.log(JSON.stringify(edges));
    }, [reactFlowInstance]);


    return (
        <>
            <CanvasContext.Provider value="Hello">
                <HeaderBar />
                <div style={{ height: '100vh' }}>
                    <ReactFlowProvider>
                        <div className="reactflow-wrapper" style={{ height: '90vh', display: 'flex' }} ref={reactFlowWrapper}>
                            <Sidebar />
                            <ReactFlow
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onInit={setReactFlowInstance}
                                onDrop={onDrop}
                                nodeTypes={nodeTypes}
                                onDragOver={onDragOver}
                                fitView
                                fitViewOptions={fitViewOptions}
                            >
                                <Background />
                                <Controls />
                            </ReactFlow>
                            <ContextTestComponent />
                        </div>
                    </ReactFlowProvider>
                </div>
            </CanvasContext.Provider>

        </>
    )
}
