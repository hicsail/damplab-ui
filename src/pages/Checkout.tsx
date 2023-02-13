import React, { useContext, useEffect, useState } from 'react'
import { Accordion, Paper, Snackbar, TextField, Typography } from '@mui/material';
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
    const [workflowName, setWorkflowName] = useState<string>('');
    const [username, setUserName] = useState('');
    const [institution, setInstitution] = useState('');
    const [email, setEmail] = useState('');
    const [open, setOpen] = useState(false);
    let workflowIds : string[] = [];
    const [workflows, setWorkflows] = useState(getWorkflowsFromGraph(val.nodes, val.edges));
    const [expanded, setExpanded] = useState(true);
    const [workflowNames, setWorkflowNames] = useState<any>({});
    const [checkoutWorkflow, setCheckoutWorkflow] = useState<any>([]);

    const createWorkflowObj = () => {
        setWorkflows(getWorkflowsFromGraph(val.nodes, val.edges));
        let workflowObjs: any = [];
        workflows.forEach((workflow: any) => {
            let id = Math.random().toString(36).substring(2, 9);
            // add id and value object to workflowNames state
            setWorkflowNames({ ...workflowNames, [workflow.id]: "" });
            let obj =
            {
                id: id,
                name: "",
                nodes: workflow
            }
            workflowObjs.push(obj);
        });
        return workflowObjs;
    }

    useEffect(() => {
        console.log('rerender');
        setCheckoutWorkflow(createWorkflowObj());
    }, [val.nodes, val.edges]);

    useEffect(() => {
        console.log('workflowNames', workflowNames);
    }, [workflowNames]);

    const [createWorkflow] = useMutation(CREATE_WORKFLOW, {
        onCompleted: (data) => {
            console.log('successfully created workflow:', data.createWorkflow.id);
            workflowIds.push(data.createWorkflow.id);
            if (workflowIds.length === workflows.length && workflowIds.length > 0) {
                console.log('creating job', { name: workflowName, username: username, institution: institution, email: email, workflowIds: workflowIds });
                createJob({ variables: { createJobInput: { name: workflowName, username: username, institute: institution, email: email, workflows: workflowIds, } } });
            }
        },
        onError: (error: any) => {
            console.log('error creating workflow', error);
        }
    });

    const [createJob] = useMutation(CREATE_JOB, {
        onCompleted: (data) => {
            console.log('successfully created job:', data);
            setOpen(true);
            workflowIds = [];
        },
        onError: (error: any) => {
            console.log('error creating job', error);
        }
    });

    const saveWorkflows = async () => {
        let flows = checkoutWorkflow;
        flows.forEach(async (flow: any) => {
            let workflow = flow.nodes;
            let gqlWorkflows: any = transformNodesToGQL(workflow);
            let edges = val.edges.filter((edge: any) => {
                return workflow.find((node: any) => node.id === edge.source) && workflow.find((node: any) => node.id === edge.target);
            });

            let gqlEdges: any = transformEdgesToGQL(edges);
            let gqlWorkflow = {
                name: workflowNames[flow.id],
                nodes: gqlWorkflows,
                edges: gqlEdges
            }
            console.log('creating workflow', gqlWorkflow);
            const res = await createWorkflow({ variables: { createWorkflowInput: gqlWorkflow } });
        });
    }

    const [namesTemp, setNamesTemp] = useState<any>({});

    const handleNameChange = (e: any, id: number) => {
        setNamesTemp({ ...namesTemp, [id]: e.target.value });
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
                                checkoutWorkflow.map((workflow: any) => {
                                    console.log('inside checkout workflow map');
                                    return (
                                        <div key={workflow.id} style={{ textAlign: 'start', padding: 10, overflowX: 'auto', border: '1px solid grey', borderRadius: 5, margin: 5, }}>
                                            <TextField
                                                id="outlined-basic"
                                                label="Workflow Name"
                                                variant="outlined"
                                                value={namesTemp[workflow.id]}
                                                onChange={
                                                    (e) => {
                                                        // let newObject = { ...workflowNames };
                                                        // newObject[workflow.id] = e.target.value;
                                                        // setWorkflowNames(newObject);
                                                        handleNameChange(e, workflow.id);
                                                    }
                                                }
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
                        <TextField label="Job Name" margin="dense" variant="outlined" onChange={(e) => setWorkflowName(e.target.value)} required />
                        <TextField label="Submitter Name" margin="dense" variant="outlined" onChange={(e) => setUserName(e.target.value)} required />
                        <TextField label="Institution" margin="dense" variant="outlined" onChange={(e) => setInstitution(e.target.value)} required />
                        <TextField label="Email" margin="dense" variant="outlined" onChange={(e) => setEmail(e.target.value)} required />
                        <Button variant="contained" onClick={() => {
                            console.log(workflowName);
                            console.log(username);
                            console.log(institution);
                            saveWorkflows();
                        }}>Submit</Button>
                    </FormControl>
                </div>
            </div>
            <Snackbar
                open={open}
                autoHideDuration={6000}
                message={"Saved, find at /submitted/" + { workflowName }}
            />
        </div>

    )
}
