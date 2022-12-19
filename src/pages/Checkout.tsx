import { FireExtinguisher } from '@mui/icons-material';
import Button from '@mui/material/Button';
import React, { useContext } from 'react'
import { CanvasContext } from '../contexts/Canvas'


export default function Checkout() {

    const val = useContext(CanvasContext);

    // function that traverses over nodes and edges and returns a list of all the nodes in order
    const traverse = (nodes: any, edges: any) => {
        if (nodes.length === 0) return [];
        let node = nodes[0];
        let list = [node];
        let i = 0;
        while (i < edges.length) {
            let edge = edges[i];
            if (edge.source === node.id) {
                node = nodes.find((n: any) => n.id === edge.target);
                list.push(node);
                i = 0;
            } else {
                i++;
            }
        }
        return list;
    }

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

        // loop over start nodes and create workflows
        let workflows: any = [];
        startNodes.forEach((startNode: any) => {
            let workflow: any = [];
            const workflowId = startNode;
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
        console.log(workflows);
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
                                <div style={{ textAlign: 'start', padding: 10 }}>
                                    <div>
                                        <h4>Workflow {index+1}</h4>
                                    </div>
                                    
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    
                                    {
                                        workflow.map((node: any) => {
                                            return (
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
            <div>
               <Button onClick={()=> console.log(getWorkflowsFromGraph(val.nodes,val.edges))}>
                    Print
                </Button>  
            </div>

        </div>

    )
}
