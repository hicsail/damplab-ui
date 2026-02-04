export type NodeData = {
    id: string;
    label: string;
    price: number;
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
    /** Single value (string/number/etc.) or array of strings when allowMultipleValues is true. */
    value: any;
    required: boolean;
    dynamicAdd: boolean;
    /** When true, customer can add multiple values via plus button in sidebar. */
    allowMultipleValues?: boolean;
    tableData: any;
    paramGroups?: any[];
    paramGroupId?: string;
}