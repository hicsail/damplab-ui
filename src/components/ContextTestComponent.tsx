import React, { useState, useContext, useEffect } from 'react'
import { CanvasContext } from '../contexts/Canvas'
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import NodeButton from './NodeButton';
import { services } from '../data/services';
import { Button, Input } from '@mui/material';

export default function ContextTestComponent() {

    const val = useContext(CanvasContext);
    const [activeNode, setActiveNode] = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));

    const [nodeParams, setNodeParams] = useState<Array<any>>([]);

    useEffect(() => {
        setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
    }, [val.activeComponentId]);


    const getNodeFromId = (id: string) => {
        return services.find((node: any) => node.id === id);
    }

    const addParamFromInput = (event: any, nodeParam: any) => {
        let value: any = event.target.value;
        let param: any = nodeParam.id;
        if (value && value.length > 0) {
            // if value exists in nodeParams, update it, otherwise add it
            if (nodeParams.find((nodeParam: any) => nodeParam.id === param)) {
                setNodeParams((nodeParams: any) => nodeParams.map((nodeParam: any) => {
                    if (nodeParam.id === param) {
                        return {
                            ...nodeParam,
                            value: value
                        }
                    } else {
                        return nodeParam;
                    }
                }))
            } else {
                setNodeParams((nodeParams: any) => [...nodeParams, { id: param, value: value }]);
            }
        } else {
            // if value is empty, remove it from nodeParams
            setNodeParams((nodeParams: any) => nodeParams.filter((nodeParam: any) => nodeParam.id !== param));
        }
    }

    const save = async () => {
        // save nodeParams to activeNode.data.inputParams
        setActiveNode((activeNode: any) => {
            const nodeTemp = {
                ...activeNode,
                data: {
                    ...activeNode.data,
                    inputBaseParams: nodeParams
                }
            }

            val.setNodes((nodes: any) => nodes.map((node: any) => {
                if (node.id === activeNode?.id) {
                    console.log('node', nodeTemp);
                    return nodeTemp;
                } else {
                    return node;
                }
            }));
            return nodeTemp;
        });
    }

    const print = () => {
        // find node in val.nodes and update it using setNodes
        console.log(val.nodes);
    }

    return (
        <div style={{ wordWrap: 'break-word', padding: 10, overflow: 'scroll', height: '80vh' }}>
            <h2>
                {activeNode?.data.label}
            </h2>
            <div>
                {
                    activeNode && activeNode.data.parameters.length > 0 ? (
                        <h3>Params</h3>
                    ) : null
                }
                {
                    activeNode && activeNode.data.parameters.length > 0 ? (activeNode.data.parameters.map((param: any) => {
                        if (param.type === 'string') return (
                            <div style={{ margin: 5 }}>
                                <TextField id="outlined-basic" label={param.name} variant="outlined" style={{ width: 200 }} onChange={(e) => addParamFromInput(e, param)} />
                            </div>
                        )

                        if (param.type === 'number') return (
                            <div style={{ margin: 5 }}>
                                <TextField id="outlined-basic" label={param.name} variant="outlined" type="number" onChange={(e) => addParamFromInput(e, param)} />
                            </div>
                        )

                    })) : null
                }
            </div>
            <div>
                {
                    activeNode && activeNode.data.resultParams && activeNode.data.resultParams.length > 0 ? (
                        <h3>Result Params</h3>
                    ) : null
                }
                <FormGroup>
                    {
                        activeNode && activeNode.data.resultParams && activeNode.data.resultParams.length > 0 ? (activeNode.data.resultParams.map((param: any) => {
                            return (
                                <FormControlLabel control={<Checkbox />} label={param} />
                            )
                        })) : null
                    }
                </FormGroup>
                {
                    activeNode && activeNode.data.resultParams && activeNode.data.resultParams.length > 0 ? (
                        <div>
                            <h3>Additional Instructions</h3>
                            <Input multiline rows={4} />
                        </div>

                    ) : null
                }
            </div>
            <div>
                {
                    // return header with text Allowed Connections if allowedConnections list is not empty
                    activeNode && activeNode.data.allowedConnections && activeNode.data.allowedConnections.length > 0 ? (
                        <h3>
                            Allowed Connections
                        </h3>
                    ) : null
                }

                {
                    activeNode && activeNode.data.allowedConnections && activeNode.data.allowedConnections.length > 0 ? (activeNode.data.allowedConnections.map((connection: string) => {
                        return (
                            <NodeButton node={getNodeFromId(connection)} />
                        )
                    })) : null
                }
            </div>
            <div>
                {
                    activeNode ? (
                        <>
                            <Button onClick={() => save() }>
                                Save
                            </Button>
                            <Button onClick={() => print() }>
                                print
                            </Button>
                        </>
                    ) : (
                        <div>
                            Drag a node from the left to the canvas to see its properties here.
                        </div>
                    )
                }
            </div>
        </div>
    )
}
