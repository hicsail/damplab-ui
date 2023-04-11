export type Parameter = {
    id: string;
    name: string;
    type: string;
    flowId?: string;
    paramType: string;
    required: boolean;
    workflowId?: string;
};