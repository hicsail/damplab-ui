import React, { useContext, useEffect, useState, useRef } from 'react'
import { Accordion, Paper, Snackbar, TextField, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import { CanvasContext } from '../contexts/Canvas'
import { useMutation } from '@apollo/client';
import { getWorkflowsFromGraph, transformEdgesToGQL, transformNodesToGQL } from '../controllers/GraphHelpers';
import { CREATE_JOB, CREATE_WORKFLOW } from '../gql/mutations';
import WorkflowStepper from '../components/WorkflowStepper';
import FormControl from '@mui/material/FormControl';

export default function Checkout() {

    const val = useContext(CanvasContext);
    const navigate = useNavigate();

    // ui states
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(true);

    // workflow states
    const [workflows, setWorkflows] = useState(getWorkflowsFromGraph(val.nodes, val.edges));
    const [workflowNames, setWorkflowNames] = useState<any>({});
    const [checkoutWorkflow, setCheckoutWorkflow] = useState<any>([]);

    // refs for workflows
    const myRefs= useRef<any>([]);
    const jobRef = useRef<any>(null);
    const userRef = useRef<any>(null);
    const institutionRef = useRef<any>(null);
    const emailRef = useRef<any>(null);
    const notesRef = useRef<any>(null);

    const [createJob] = useMutation(CREATE_JOB, {
        onCompleted: (data) => {
            console.log('successfully created job:', data);
            navigate('/submitted', { state: { id: data.createJob.id } });
        },
        onError: (error: any) => {
            console.log('error creating job', error);
        }
    });

    useEffect(() => {
        setCheckoutWorkflow(createWorkflowObj());
    }, [val.nodes, val.edges]);

    const createWorkflowObj = () => {
        setWorkflows(getWorkflowsFromGraph(val.nodes, val.edges));
        let workflowObjs: any = [];
        workflows.forEach((workflow: any) => {
            let id = Math.random().toString(36).substring(2, 9);
            // add id and value object to workflowNames state
            setWorkflowNames({ ...workflowNames, [workflow.id]: "" });
            let obj = {
                id: id,
                name: "",
                nodes: workflow
            }
            workflowObjs.push(obj);
        });
        return workflowObjs;
    }

    const getGQLWorkflows = () => {
        
        let workflows: any = [];
        checkoutWorkflow.forEach(async (flow: any, index: number) => {

            let workflow = flow.nodes;
            let gqlWorkflows: any = transformNodesToGQL(workflow);

            let edges = val.edges.filter((edge: any) => {
                return workflow.find((node: any) => node.id === edge.source) && workflow.find((node: any) => node.id === edge.target);
            });
            let gqlEdges: any = transformEdgesToGQL(edges);

            let gqlWorkflow = {
                name: myRefs.current[index].value,  //workflowNames[flow.id],
                nodes: gqlWorkflows,
                edges: gqlEdges
            }
            workflows.push(gqlWorkflow);
        });

        return workflows;
    }
    
    return (
        <div>
            <div>
                <div>
                    <Typography variant='body1'>Checkout</Typography>
                    <Accordion key={Math.random() * 100} expanded={expanded}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"
                            onClick={() => setExpanded(!expanded)}
                        >
                            <Typography variant='body1'>Workflows Summary</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {
                                checkoutWorkflow.map((workflow: any, index: number) => {
                                    return (
                                        <div key={workflow.id} style={{ textAlign: 'start', padding: 10, overflowX: 'auto', border: '1px solid grey', borderRadius: 5, margin: 5, }}>
                                            <TextField
                                                id={workflow.id}
                                                label="Workflow Name"
                                                variant="outlined"
                                                inputRef={(el) => (myRefs.current[index] = el)}
                                                // value={namesTemp[workflow.id]}
                                                // onChange={(e) => { handleNameChange(e, workflow.id)}}
                                            />
                                            <WorkflowStepper workflow={workflow.nodes} name={workflow.name} parent="checkout"/>
                                        </div>
                                    )
                                })
                            }
                        </AccordionDetails>
                    </Accordion>
                </div>
                <div style={{ padding: 30 }}>
                    <Typography variant='body1'>Your Infomration</Typography>
                    <FormControl>
                        <TextField label="Job Name" margin="dense" variant="outlined" inputRef={jobRef}  required />
                        <TextField label="Submitter Name" margin="dense" variant="outlined" inputRef={userRef}  required />
                        <TextField label="Institution" margin="dense" variant="outlined" inputRef={institutionRef}  required />
                        <TextField label="Email" margin="dense" variant="outlined" inputRef={emailRef} required />
                        <TextField label="Notes" margin="dense" variant="outlined" inputRef={notesRef} required />
                        <Button variant="contained" onClick={() => {
                            //saveWorkflows();
                            const data = { 
                                name: jobRef.current.value, 
                                username: userRef.current.value, 
                                institute: institutionRef.current.value, 
                                email: emailRef.current.value, 
                                workflows: getGQLWorkflows(), 
                            };
                            createJob({ variables: { createJobInput: data }});
                        }}>Submit</Button>
                    </FormControl>
                </div>
            </div>
            <Snackbar
                open={open}
                autoHideDuration={6000}
                message={"Saved, find at /submitted/"}
            />
        </div>

    )
}
