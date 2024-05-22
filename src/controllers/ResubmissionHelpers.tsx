import { createNodeObject, generateFormDataFromParams } from './ReactFlowEvents';

import { NodeData, NodeParameter } from '../types/CanvasTypes';
import { Service }                 from '../types/Service';
import { services }                from '../data/services';


export const addNodesAndEdgesFromServiceIdsAlt = (services: any[], 
                                                  serviceIds: string[], 
                                                  setNodes: any, 
                                                  setEdges: any) => {
    let previousNodeId: any = null;
    let baseX = 0;
    let baseY = 0;

    serviceIds.forEach((serviceId: string, index: number) => {
        const service = getServiceFromIdAlt(services, serviceId);
        if (index === 0) {
            baseX = Math.floor(Math.random() * 1000);
            baseY = Math.floor(Math.random() * 1000);
            const sourcePosition = { x: baseX, y: baseY };

            previousNodeId = addNodeToCanvasWithEdgeAlt(services, 'source', service, 
                                                        setNodes, setEdges, sourcePosition, null);
        } else {
            const sourcePosition = { x: baseX, y: baseY + (index * 150) };
            previousNodeId = addNodeToCanvasWithEdgeAlt(services, previousNodeId, 
                                                        service, setNodes, setEdges, 
                                                        sourcePosition, null);
        }
    });
}


export const getServiceFromIdAlt = (services: any, id: string) => {
    // console.log('service val: ', services.find((service: any) => service.id === id));
    return services.find((service: any) => service.id === id);
}


export const addNodeToCanvasWithEdgeAlt = (services: any[], sourceId: string, service: any, 
                                            setNodes: any, setEdges: any, 
                                            sourcePosition: any, setActiveComponentId: any) => {
    console.log('service: ', service);
    const position = { x: sourcePosition.x, y: sourcePosition.y + 150 };
    const nodeId = Math.random().toString(36).substring(2, 9);
    // const formData: NodeParameter[] = generateFormDataFromParamsAlt(service.service.parameters, nodeId);
    // const formData: NodeParameter[] = service.formData;
    
    const formData = [];
    const paramsData = service.service.parameters;
    const formValues = service.formData;
    for (let i = 0; i < paramsData.length; i++) {
        const parameter = paramsData[i];
        const formId = Math.random().toString(36).substring(2, 9);
        formData.push({
            id: formId,
            nodeId: nodeId,
            name: parameter.name,
            type: parameter.type,
            options: parameter.options ? parameter.options : null,
            description: parameter.description,
            paramType: parameter.paramType ? parameter.paramType : null,
            resultParamValue: "",
            value: formValues[i].value,
            required: true // parameter.required,
        });
    };

    // console.log(formData[0].value);

    const nodeData = {
        id: nodeId,
        label: service.service.name,
        allowedConnections: service.service.allowedConnections,
        icon: service.service.icon,
        parameters: service.service.parameters,
        additionalInstructions: service.additionalInstructions,
        formData: formData,
        serviceId: service.service.id
    }

    const newNode = createNodeObjectAlt(nodeId, service.service.name, 'selectorNode', position, nodeData);
    // console.log("newNode: ", newNode);

    if (sourceId !== 'source') {
        const newEdge = {
            id: Math.random().toString(36).substring(2, 9),
            source: sourceId,
            target: nodeId,
            animated: true,
            arrowHeadType: 'arrowclosed',
            labelStyle: { fill: '#f6ab6c', fontWeight: 700 },
            style: { stroke: 'green' },
        };
        setEdges((eds: any) => eds.concat(newEdge));
    }

    setNodes((nds: any) => nds.concat(newNode));
    if (setActiveComponentId) {
        setActiveComponentId(nodeId);
        // console.log('setactivecomponentid set');
    }
    // console.log('nodeId: ', nodeId);

    return nodeId;
}


export const createNodeObjectAlt = (id: string, name: string, type: string, 
                                    position: any, data: NodeData) => {
  const newNode = {
        id      : id,
        name,
        type    : 'selectorNode',
        position,
        active  : true,
        data    : data,
    };
    // console.log('newNode: ', newNode);

    return newNode;
}


export const generateFormDataFromParamsAlt = (paramsData: any, nodeId: string): NodeParameter[] => {

    const formData : NodeParameter[] = [];

    for (let i = 0; i < paramsData.length; i++) {
        const parameter = paramsData[i];
        const formId    = Math.random().toString(36).substring(2, 9);
        formData.push({
            id              : formId,
            nodeId          : nodeId,
            name            : parameter.name,
            type            : parameter.type,
            options         : parameter.options ? parameter.options    : null,
            description     : parameter.description,
            paramType       : parameter.paramType ? parameter.paramType: null,
            resultParamValue: "",
            value           : null,
            required        : true  // parameter.required,
        });
    }

    return formData;
}
