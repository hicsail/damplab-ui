export type NodeData = {
    id: string;
    label: string;
    allowedConnections: string[];
    icon: string;
    parameters: NodeParameter[];
    additionalInstructions: string;
    formData: NodeParameter[];
    serviceId: string;
}


export type NodeParameter = {
    id: string;
    nodeId: string;
    name: string;
    type: string;
    paramType: string;
    value: any;
    required: boolean;
}