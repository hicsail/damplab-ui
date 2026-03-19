export type NodeData = {
    id: string;
    label: string;
    price: number | null;
    internalPrice?: number | null;
    externalPrice?: number | null;
    externalAcademicPrice?: number | null;
    externalMarketPrice?: number | null;
    externalNoSalaryPrice?: number | null;
    pricing?: {
      internal?: number | null;
      external?: number | null;
      externalAcademic?: number | null;
      externalMarket?: number | null;
      externalNoSalary?: number | null;
      legacy?: number | null;
    } | null;
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
    externalAcademicPrice?: number;
    externalMarketPrice?: number;
    externalNoSalaryPrice?: number;
    pricing?: {
      internal?: number;
      external?: number;
      externalAcademic?: number;
      externalMarket?: number;
      externalNoSalary?: number;
      legacy?: number;
    };
    /** Optional text shown to clients describing how pricing is determined. */
    pricingExplanation?: string;
    /** When true, this parameter's numeric value acts as a price multiplier. */
    isPriceMultiplier?: boolean;
    tableData: any;
    paramGroups?: any[];
    paramGroupId?: string;
}