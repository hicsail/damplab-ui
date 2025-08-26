export type NodeData = {
    id: string | null;
    label: string;
    price?: number;
    allowedConnections?: string[];
    icon?: string;
    parameters?: NodeParameter[];
    additionalInstructions?: string;
    formData?: NodeParameter[];
    serviceId: string;
    description?: string;
    paramGroups?: any[];
    dbNodeId?: string; // DB reference such that existing backend _id doesn't clash with new node creation
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