export type NodeData = {
    id: string;
    label: string;
    price: number | null;
    internalPrice?: number | null;
    externalPrice?: number | null;
    pricingMode?: 'SERVICE' | 'PARAMETER';
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
    /** Optional per-parameter price used when pricingMode is PARAMETER. */
    price?: number;
    internalPrice?: number;
    externalPrice?: number;
    /** Optional text shown to clients describing how pricing is determined. */
    pricingExplanation?: string;
    /** When true, this parameter's numeric value acts as a price multiplier. */
    isPriceMultiplier?: boolean;
    tableData: any;
    paramGroups?: any[];
    paramGroupId?: string;
}