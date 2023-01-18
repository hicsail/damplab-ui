import React, { useContext } from 'react'
import { Accordion } from '@mui/material';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import { CanvasContext } from '../contexts/Canvas'


export default function Checkout() {

    const val = useContext(CanvasContext);

    // function that traverses over nodes and edges and returns a list of all the nodes in order

    const getWorkflowsFromGraph = (nodes: any, edges: any) => {

        if (nodes.length === 0) return [];
        // loop over edges and identify start nodes
        let startNodes: any = [];
        // if edge.source is not in edges.target, then it is a start node
        edges.forEach((edge: any) => {
            let isStartNode = true;
            edges.forEach((e: any) => {
                if (edge.source === e.target) {
                    isStartNode = false;
                }
            });
            if (isStartNode) {
                startNodes.push(edge.source);
            }
        });

        // add start nodes that are not in edges.source or destination
        nodes.forEach((node: any) => {
            let isStartNode = true;
            edges.forEach((e: any) => {
                if (node.id === e.source || node.id === e.target) {
                    isStartNode = false;
                }
            });
            if (isStartNode) {
                startNodes.push(node.id);
            }
        });



        // loop over start nodes and create workflows
        let workflows: any = [];
        startNodes.forEach((startNode: any) => {
            let workflow: any = [];
            let node = nodes.find((n: any) => n.id === startNode);
            workflow.push(node);
            let i = 0;
            while (i < edges.length) {
                let edge = edges[i];
                if (edge.source === node.id) {
                    node = nodes.find((n: any) => n.id === edge.target);
                    workflow.push(node);
                    i = 0;
                } else {
                    i++;
                }
            }
            workflows.push(workflow);
        });
        
        return workflows;
    }

    return (
        <div>
            <div>
                <div>
                    <h1>Checkout</h1>
                    {
                        // print workflows side by side
                        getWorkflowsFromGraph(val.nodes, val.edges).map((workflow: any, index: number) => {
                            return (
                                <div style={{ textAlign: 'start', padding: 10, overflowX: 'auto' }}>
                                    <div>
                                        <h4>Workflow {index+1}</h4>
                                    </div>
                                    
                                <div style={{ display: 'flex', justifyContent: 'flex-start', height: 'fit-content' }}>
                                    
                                    {
                                        workflow.map((node: any) => {
                                            return (
                                                <Accordion>
                                                <AccordionSummary
                                                expandIcon={<ExpandMoreIcon />}
                                                >
                                                <div style={{ border: 'solid 1px', width: 'fit-content', margin: 10, padding: 10 }}>
                                                    <div>
                                                        <img src={node.data.icon} alt={node.name} style={{ width: 30 }} />
                                                    </div>
                                                    <div>
                                                        <h3>
                                                            {node.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    <div>
                                                        <h4>Details</h4>
                                                        <div>
                                                            <h5>Node ID: {node.id}</h5>
                                                        </div>
                                                        <div>
                                                            <h5>Node Name: {node.name}</h5>
                                                        </div>
                                                        <div>
                                                            <h5>Parameters</h5>
                                                            <div>
                                                                {
                                                                    node.data.formData.map((parameter: any) => {
                                                                
                                                                        return (
                                                                            <div style={{display: 'flex', justifyItems: 'flex-start'}}>
                                                                                <h6>{parameter.name + ' : '} </h6>
                                                                                <div>
                                                                                    <h6>{' ' + parameter.value}</h6>
                                                                                </div> {
                                                                                    parameter.paramType === 'result' ? <h6>Alternate: { parameter.resultParamValue }</h6> : null
                                                                                }
                                                                            </div>
                                                                        )
                                                                    })
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </AccordionDetails>
                                                
                                                </Accordion>
                                            )
                                        })
                                    
                                    }
                                </div>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>

    )
}
