export type Parameter = {
    id: string;
    name: string;
    type: string;
    flowId?: string;
    paramType: string;
    required: boolean;
    workflowId?: string;
    description?: string;
    options?: any[];
    defaultValue?: any;
    rangeValueMin?: number;
    rangeValueMax?: number;
    dynamicAdd?: boolean;
    /** When true, customers can add multiple values for this parameter (plus button in sidebar). */
    allowMultipleValues?: boolean;
    templateFile? : string;
    tableData?: any;
    paramGroupId?: string;
};