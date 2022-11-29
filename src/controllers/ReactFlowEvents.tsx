
import { NodeData, NodeParameter } from '../types/CanvasTypes';

export const generateFormDataFromParams = (paramsData: any, nodeId: string): NodeParameter[] => {

    const formData : NodeParameter[] = [];
    for (let i = 0; i < paramsData.length; i++) {
        const parameter = paramsData[i];
        const formId = Math.random().toString(36).substring(2, 9);
        formData.push({
            id: formId,
            nodeId: nodeId,
            name: parameter.name,
            type: parameter.type,
            paramType: 'input',
            value: null,
            required: true // parameter.required,
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

// if (type.resultParams) {
    //     for (let i = 0; i < type.resultParams.length; i++) {
    //         const parameter = type.resultParams[i];
            
            
    //         const formId = Math.random().toString(36).substring(2, 9);
    //         formData.push({
    //             id: formId,
    //             nodeId: nodeId,
    //             name: parameter,
    //             type: parameter.type,
    //             paramType: 'result',
    //             value: null,
    //             //setValue: setValue,
    //             required: true // parameter.required,
    //         });
    //     }
    // } 

    // {
    //     id: nodeId,
    //     name,
    //     type: 'selectorNode',
    //     position,
    //     active: true,
    // };