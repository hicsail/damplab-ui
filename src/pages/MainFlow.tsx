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
import CustomDemoNode from '../components/CanvasNode';
import RightSidebar from '../components/RightSidebar';
import { CanvasContext } from '../contexts/Canvas';
import { NodeData, NodeParameter } from '../types/CanvasTypes';
import '../styles/sidebar.css';
import { isValidConnection } from '../controllers/GraphHelpers';
import { AppContext } from '../contexts/App';
import { useParams } from 'react-router-dom';
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery, useLazyQuery, useMutation } from '@apollo/client';
import { GET_JOB_BY_ID } from '../gql/queries';
import { MUTATE_JOB_STATE } from '../gql/mutations';
import { addNodesAndEdgesFromServiceIdsAlt } from '../controllers/ResubmissionHelpers';


const nodeTypes = {
    selectorNode: CustomDemoNode,
};

const fitViewOptions: FitViewOptions = {
    padding: 0.2,   
};

export default function MainFlow( client: any /*data: any*/) {
    const { id } = useParams();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    let {nodes, edges, setNodes, setEdges, setActiveComponentId} = useContext(CanvasContext);
    let {services} = useContext(AppContext);
    let workflows: any[] = [];
    // const [services, setServices] = useState(data.services);

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
        if (!isValidConnection(services, nodes, customConnection.source, customConnection.target)) {
            customConnection.label = 'invalid connection';
            customConnection.style = { stroke: 'red' };
        }
        else customConnection.style = { stroke: 'green' };
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
        console.log(type)
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
        const data: NodeData = { id: nodeId, label: name , description: type.description ,allowedConnections: type.allowedConnections, icon: type.icon, parameters: type.parameters, additionalInstructions: "", formData: formData, serviceId: serviceId };
        const newNode = createNodeObject(nodeId, name, type.type, position, data);

        setNodes((nds: any) => nds.concat(newNode));
    }, [reactFlowInstance, nodes]);

    // TODO: Need to finish job status update
    const [updateJobMutation] = useMutation(MUTATE_JOB_STATE, {
        variables: { ID: id, State: 'SUBMITTED' },
        onCompleted: (data) => {
            console.log('successfully updated job state:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error updated job state', error);
        }
    });

    useEffect(() => {
        if (id !== undefined) {
            client.client.query({ query: GET_JOB_BY_ID, variables: { id: id } }).then((result: any) => {
                console.log('job loaded successfully', result);
                if (workflows.length === 0) {
                    workflows = result.data.jobById.workflows;
                    workflows.map((workflow: any) => {
                        let s   : any[] = [];
                        let sIds: any[] = [];
                        workflow.nodes.map((node: any) => {
                            s.push(node);
                            sIds.push(node.id);
                        })
                        addNodesAndEdgesFromServiceIdsAlt(s, sIds, setNodes, setEdges);
                    });
                };
            }).catch((error: any) => {
                console.log('error when loading job', error);
            });
        }
    }, []);


    return (
        <>
            <div style={{ height: '100vh' }}>
                <ReactFlowProvider>
                    <div className="reactflow-wrapper" style={{ height: '85vh', display: 'flex' }} ref={reactFlowWrapper}>
                        <div style={{ maxWidth: '15%', textAlign: 'center', minWidth: 230, borderRight: 'solid 1px' }}>
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
                        <div style={{ minWidth: '10%', width: 450, borderLeft: 'solid 1px' }}>
                            <RightSidebar />
                        </div>
                    </div>
                </ReactFlowProvider>
            </div>
        </>
    )
}
