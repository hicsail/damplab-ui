export type NodeData = {
    id: string;
    label: string;
    allowedConnections: string[];
    icon: string;
    parameters: NodeParameter[];
    additionalInstructions: string;
    formData: NodeParameter[];
    serviceId: string;
    description: string;
    paramGroups?: any[];
}


export type NodeParameter = {
    id: string;
    nodeId: string;
    name: string;
    type: string;
    options?: any[];
    description: string;
    paramType: string;
    resultParamValue: string;
    value: any;
    required: boolean;
    dynamicAdd: boolean;
    tableData: any;
    paramGroups?: any[];
    paramGroupId?: string;
}