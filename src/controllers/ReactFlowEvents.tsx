
import { NodeData, NodeParameter } from '../types/CanvasTypes';


export const generateFormDataFromParams = (paramsData: any, nodeId: string): NodeParameter[] => {

    const formData : NodeParameter[] = [];

    for (let i = 0; i < paramsData.length; i++) {
        const parameter = paramsData[i];
        const formId    = Math.random().toString(36).substring(2, 9);
        formData.push({
            id              : formId,
            nodeId          : nodeId,
            name            : parameter.name,
            type            : parameter.type,
            options         : parameter.options ? parameter.options    : null,
            description     : parameter.description,
            paramType       : parameter.paramType ? parameter.paramType: null,
            resultParamValue: "",
            value           : null,
            required        : parameter.required,
            dynamicAdd : parameter.dynamicAdd ? parameter.dynamicAdd : null,
            tableData : parameter.tableData ? parameter.tableData : null,
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