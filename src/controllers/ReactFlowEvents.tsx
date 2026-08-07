
import { NodeData, NodeParameter } from '../types/CanvasTypes';
import { RUN_COUNT_PARAM_ID } from '../utils/servicePricing';


export const generateFormDataFromParams = (paramsData: any, nodeId: string): NodeParameter[] => {

    const formData : NodeParameter[] = [];

    for (let i = 0; i < paramsData.length; i++) {
        const parameter = paramsData[i];
        const formId    = Math.random().toString(36).substring(2, 9);
        const allowMultipleValues = !!parameter.allowMultipleValues;
        formData.push({
            id              : parameter.id ?? formId,
            nodeId          : nodeId,
            name            : parameter.name,
            type            : parameter.type,
            options         : parameter.options ? parameter.options    : null,
            description     : parameter.description,
            paramType       : parameter.paramType ? parameter.paramType: null,
            resultParamValue: "",
            value           : allowMultipleValues ? [''] : null,
            required        : parameter.required,
            dynamicAdd : parameter.dynamicAdd ? parameter.dynamicAdd : null,
            allowMultipleValues: allowMultipleValues || undefined,
            tableData : parameter.tableData ? parameter.tableData : null,
            paramGroups: parameter.paramGroups ? parameter.paramGroups : null,
            paramGroupId: parameter.paramGroupId ? parameter.paramGroupId : null,
        });
    }

    // Inject a universal run-count entry unless the service already defines one.
    if (!formData.some((p) => p.id === RUN_COUNT_PARAM_ID)) {
        formData.push({
            id               : RUN_COUNT_PARAM_ID,
            nodeId           : nodeId,
            name             : 'Number of runs',
            type             : 'number',
            options          : undefined,
            description      : 'Price = base price × this number.',
            paramType        : 'input',
            resultParamValue : '',
            value            : 1,
            required         : false,
            dynamicAdd       : false,
            allowMultipleValues: undefined,
            tableData        : null,
            isPriceMultiplier: true,
        });
    }

    return formData;
}

export const createNodeObject = (id: string, name: string, type: string, position: any, data: NodeData) => {

    const newNode = {
        id: id,
        name,
        type: 'selectorNode',
        position,
        active: true,
        data: data,
    };

    return newNode;
}