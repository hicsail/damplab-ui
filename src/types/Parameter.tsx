export type Parameter = {
    id: string;
    name: string;
    type: string;
    flowId?: string;
    paramType: string;
    required: boolean;
    workflowId?: string;
    description?: string;
    /**
     * Optional text shown to clients describing how pricing is determined for this parameter.
     * Used for transparency when pricing is not purely programmatic.
     */
    pricingExplanation?: string;
    options?: any[];
    defaultValue?: any;
    rangeValueMin?: number;
    rangeValueMax?: number;
    dynamicAdd?: boolean;
    /** When true, customers can add multiple values for this parameter (plus button in sidebar). */
    allowMultipleValues?: boolean;
    /** Optional per-parameter price used when service pricingMode is PARAMETER. */
    price?: number;
    templateFile? : string;
    tableData?: any;
    paramGroupId?: string;
};