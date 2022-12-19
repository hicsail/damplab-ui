import { services } from '../data/services';
import { createNodeObject, generateFormDataFromParams } from './ReactFlowEvents';
import { NodeData, NodeParameter } from '../types/CanvasTypes';


const getServiceFromId = (id: string) => {
    return services.find((service: any) => service.id === id);
}

export const isValidConnection = (nodes: any, sourceId: any, targetId: any) => {

    // loop over nodes to find source and target
    const sourceNode = nodes.find((node: any) => node.data.id === sourceId);
    const targetNode = nodes.find((node: any) => node.data.id === targetId);

    // get service data from source and target
    const sourceService = getServiceFromId(sourceNode?.data.serviceId);
    const targetService = getServiceFromId(targetNode?.data.serviceId);

    // if targetService is in sourceService.allowedConnections, return true
    if (targetService && sourceService?.allowedConnections?.includes(targetService.id)) {
        return true;
    }
    return false;
    
}

export const addNodeToCanvas = (val: any, setVal: any, node: any, position: any) => {
    const newNode = {
        id: node.id,
        name: node.name,
        type: 'selectorNode',
        position,
        active: true,
        data: node,
    };

    setVal({
        ...val,
        nodes: [...val.nodes, newNode]
    });
}

export const addNodeToCanvasWithEdge = (sourceId: string, service: any, setNodes: any, setEdges: any, sourcePosition: any, setActiveComponentId: any) => {
    console.log('addNodeToCanvasWithEdge');
    console.log(sourcePosition);
    const position = { x: sourcePosition.x + 300, y: sourcePosition.y };
    const nodeId = Math.random().toString(36).substring(2, 9);
    const formData: NodeParameter[] = generateFormDataFromParams(service.parameters, nodeId);
    // create node data { id: nodeId, label: name, allowedConnections: type.allowedConnections, icon: type.icon, parameters: type.parameters, additionalInstructions: "", formData: formData, serviceId: serviceId }
    const nodeData = {
        id: nodeId,
        label: service.name,
        allowedConnections: service.allowedConnections,
        icon: service.icon,
        parameters: service.parameters,
        additionalInstructions: "",
        formData: formData,
        serviceId: service.id
    }

    // create node object
    const newNode = createNodeObject(nodeId, service.name, 'selectorNode', position, nodeData);
    
    // create new edge
    if (sourceId !== 'source'){

        const newEdge = {
            id: Math.random().toString(36).substring(2, 9),
            source: sourceId,
            target: nodeId,
            animated: true,
            arrowHeadType: 'arrowclosed',
            label: 'added w click',
            labelStyle: { fill: '#f6ab6c', fontWeight: 700 },
            style: { stroke: '#f6ab6c' },
            type: 'smoothstep',
        };
        setEdges((eds: any) => eds.concat(newEdge));

    }

    setNodes((nds: any) => nds.concat(newNode));
    
    if (setActiveComponentId) setActiveComponentId(nodeId);
    return nodeId;
    // canvasContext.setNodes([...canvasContext.nodes, newNode]);
    // canvasContext.setEdges([...canvasContext.edges, newEdge]);
}

export const addNodesAndEdgesFromServiceIds = (serviceIds: string[], setNodes: any, setEdges: any) => {

    // loop over serviceIds
    let previousNodeId : any = null;
    let baseX = 0;
    let baseY = 0;
    serviceIds.forEach((serviceId: string, index: number) => {
        // get service from serviceId
        const service = getServiceFromId(serviceId);
        // if index === 0, add node to canvas with edge
        if (index === 0) {
            // calculate random position on visible screen
            // x = random between 0 and 1000
            // y = random between 0 and 1000
            baseX = Math.floor(Math.random() * 1000);
            baseY = Math.floor(Math.random() * 1000);
            const sourcePosition = { x: baseX, y: baseY};
            
            previousNodeId = addNodeToCanvasWithEdge('source', service, setNodes, setEdges, sourcePosition, null);
        } else {
            // else, add node to canvas
            const sourcePosition = { x: baseX + (index * 100), y: baseY + (index * 100) };
            previousNodeId = addNodeToCanvasWithEdge(previousNodeId, service, setNodes, setEdges, sourcePosition, null);
        }
    });
}

export const addNodesAndEdgesFromBundle = (bundle: any, setNodes: any, setEdges: any) => {

    // get serviceIds from bundle
    const serviceIds = bundle.services.map((service: any) => service.id);
    // call addNodesAndEdgesFromServiceIds
    addNodesAndEdgesFromServiceIds(serviceIds, setNodes, setEdges);
}




