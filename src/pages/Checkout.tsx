import React, { useContext, useEffect, useState, useRef } from 'react'
import { Accordion, Box, Paper, Snackbar, TextField, Typography } from '@mui/material';
import { useNavigate } from "react-router-dom";
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { GppMaybe, CheckCircleRounded, WarningRounded, DangerousRounded, HelpRounded } from '@mui/icons-material/';
import Button from '@mui/material/Button';
import { CanvasContext } from '../contexts/Canvas'
import { useMutation } from '@apollo/client';
import { getWorkflowsFromGraph, transformEdgesToGQL, transformNodesToGQL } from '../controllers/GraphHelpers';
import { CREATE_JOB, CREATE_WORKFLOW } from '../gql/mutations';
import CheckoutStepper from '../components/CheckoutStepper';
import FormControl from '@mui/material/FormControl';
import { AppContext } from '../contexts/App';

export default function Checkout() {

    const val = useContext(CanvasContext);
    const navigate = useNavigate();
    const { hazards } = useContext(AppContext);

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
            console.log('error creating job', error.networkError?.result?.errors);
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
                return workflow.find((node: any) => node.id === edge.source) 
                && workflow.find((node: any) => node.id === edge.target);
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
                    <Typography variant='h5'>Checkout</Typography>
                    <Accordion key={Math.random() * 100} expanded={expanded}>
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls="panel1a-content"
                            id="panel1a-header"
                            onClick={() => setExpanded(!expanded)}
                        >
                            <Typography variant='h6'>Job Summary</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {
                                checkoutWorkflow.map((workflow: any, index: number) => {
                                    console.log(workflow);
                                    let hazard: boolean = false;
                                    for (let node of workflow.nodes) {
                                        if (hazards.includes(node.name)){
                                            hazard = true;
                                            break;
                                        }
                                    }
                                    return (
                                        <div key={workflow.id} style={{ textAlign: 'start', 
                                        padding: 25, overflowX: 'auto', border: '1px solid grey', 
                                        borderRadius: 5, margin: 5, }}>
                                            <Box sx={{ display: 'flex' }}>
                                                <TextField
                                                    id={workflow.id}
                                                    label="Workflow Name"
                                                    variant="outlined"
                                                    inputRef={(el) => (myRefs.current[index] = el)}
                                                    style={{width: '40ch'}}
                                                    // value={namesTemp[workflow.id]}
                                                    // onChange={(e) => { handleNameChange(e, workflow.id)}}
                                                />
                                                {
                                                    hazard === true 
                                                        ? <p><GppMaybe style={{ color: "grey", verticalAlign:"middle", paddingLeft:20 }}/>
                                                            &nbsp;Note: This workflow includes a service with sequences that will undergo a security screening.</p> 
                                                        : <p/>
                                                }
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, marginTop: 3 }}>
                                                <CheckoutStepper workflow={workflow.nodes} name={workflow.name} parent="checkout" style={{}} />
                                            </Box>
                                        </div>
                                    )
                                })
                            }
                        </AccordionDetails>
                    </Accordion>
                </div>
                <div style={{ padding: 30 }}>
                    <Typography variant='body1'>Your Information</Typography>
                    <FormControl>
                        <TextField label = "Job Name" margin       = "dense" variant = "outlined" inputRef = {jobRef}  required />
                        <TextField label = "Submitter Name" margin = "dense" variant = "outlined" inputRef = {userRef}  required />
                        <TextField label = "Institution" margin    = "dense" variant = "outlined" inputRef = {institutionRef}  required />
                        <TextField label = "Email" margin          = "dense" variant = "outlined" inputRef = {emailRef} required />
                        <TextField label = "Notes" margin          = "dense" variant = "outlined" inputRef = {notesRef} required />
                        <Button variant="contained" onClick={() => {
                            console.log('submitting job');
                            const data = { 
                                name: jobRef.current.value, 
                                username: userRef.current.value, 
                                institute: institutionRef.current.value, 
                                email: emailRef.current.value, 
                                workflows: getGQLWorkflows(), 
                            };
                            console.log(getGQLWorkflows());
                            createJob({ variables: { createJobInput: data }});
                        }} style={{padding:20, marginTop: 10, fontSize:15}}>Submit</Button>
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
