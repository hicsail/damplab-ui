import React, { useState, useContext } from "react";
import { Service } from '../types/Service';
import Box from "@mui/material/Box";
import Stepper from "@mui/material/Stepper";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useMutation } from "@apollo/client";
import { UPDATE_WORKFLOW_STATE } from "../gql/mutations";
import { CanvasContext } from '../contexts/Canvas';
import { AppContext } from '../contexts/App';

export default function DominosStepper(workflow: any) {
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<any>([]);
    const [alignment, setAlignment] = useState('bundles');
    const {services, bundles} = useContext(AppContext);
    const [filteredServices, setFilteredServices] = useState(services);
    const {setNodes, setEdges} = useContext(CanvasContext);

    const [workflowNames, setWorkflowNames] = useState(
        workflow.workflow.map((workflow: any) => {
            return workflow.name;
        })
    );
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState({} as any);
    const [updateWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log("successfully completed workflow:", data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error completing workflow", error);
        },
    });

    const totalSteps = () => {
        return workflowNames.length;
    };

    const completedSteps = () => {
        return Object.keys(completed).length;
    };

    const isLastStep = () => {
        return activeStep === totalSteps() - 1;
    };

    const allStepsCompleted = () => {
        return completedSteps() === totalSteps();
    };

    const handleNext = () => {
        const newActiveStep =
            isLastStep() && !allStepsCompleted()
                ? workflowNames.findIndex((workflow: any, i: number) => !(i in completed))
                : activeStep + 1;
        setActiveStep(newActiveStep);
        if (allStepsCompleted()) {
            isLastStep() 
                ? setActiveStep(0)
                : setActiveStep(totalSteps() - 1)
        }
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleStep = (workflowName: any) => () => {
        setActiveStep(workflowName);
    };

    const handleComplete = () => {
        const newCompleted: any = completed;
        newCompleted[activeStep] = true;
        setCompleted(newCompleted);
        handleNext();
        // allStepsCompleted() 
        //     ? setActiveStep(0)
        //     : handleNext();
        // if (allStepsCompleted()) {
        //     // {completeWorkflow();}
        // }
    };

    const handleReset = () => {
        setActiveStep(0);
        setCompleted({});
    };

    const startWorkflow = () => {
        let updateWorkflowState = {
            workflowId: workflow.id,
            state: "IN_PROGRESS",
        };
        updateWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState },
        });
    };

    const stopWorkflow = () => {
        let updateWorkflowState = {
            workflowId: workflow.id,
            state: "QUEUED",
        };
        updateWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState },
        });
    };

    const completeWorkflow = () => {
        let updateWorkflowState = {
            workflowId: workflow.id,
            state: "COMPLETE",
        };
        updateWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState },
        });
    };

    return (
        <div style={{ padding: 25 }}>
            {/* <div>
                {workflow.parent !== "checkout" && (
                    <div>
                        <Button>
                            Start Workflow
                        </Button>
                    </div>
                )}
            </div> */}
            <div>
                <Stepper
                    nonLinear
                    activeStep={activeStep}
                    style={{ overflowX: "auto", padding: "30px"}}
                    alternativeLabel
                    sx={{
                        '& .MuiStepLabel-root .Mui-completed': {
                          color: 'green',
                        },
                        '& .MuiStepLabel-root .Mui-active': {
                          color: 'blue',
                        },
                        '& .MuiStepLabel-label.Mui-unselected.MuiStepLabel-alternativeLabel': {
                          color: 'black', // Just text label (COMPLETED)
                        },
                      }}
                >
                    {workflowNames.map((label: string, index: number) => (
                        <Step key={label} completed={completed[index]}>
                            <StepButton
                                color="inherit"
                                onClick={handleStep(index)}
                            >
                            <img
                                style={{ height: 30, }}
                                src={workflow.workflow[index].data.icon}
                                alt={workflow.workflow[index].name}
                            /><br/>
                                {label}
                            </StepButton>
                        </Step>
                    ))}
                </Stepper>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >
                        <div
                            style={{
                                    display: "flex",
                                    justifyContent: "flex-start",
                                    margin: 10,
                                }}
                        >
                            <img
                                style={{ width: 20 }}
                                src={workflow.workflow[activeStep].data.icon}
                                alt={workflow.workflow[activeStep].name}
                            />
                            <Typography>
                                &nbsp;&nbsp;&nbsp;{workflow.workflow[activeStep].name}...
                            </Typography>
                        </div>
                    </AccordionSummary>
                    <AccordionDetails>
                        <div>
                            <>

                                <Box
                                    sx={{
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: 'space-evenly'
                                    }}
                                >
                                    {allStepsCompleted() ? (
                                        <div>
                                            <Button onClick={handleReset}>
                                                Reset
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <Button
                                                color="inherit"
                                                disabled={activeStep === 0}
                                                onClick={handleBack}
                                                sx={{ mr: 1 }}
                                            >
                                                Back
                                            </Button>
                                            <Button 
                                                onClick={handleNext} 
                                                sx={{ mr: 1 }}
                                            >
                                                Next
                                            </Button>
                                            {activeStep !== workflowNames.length &&
                                                (completed[activeStep] ? (
                                                    <Typography
                                                        variant="caption"
                                                        sx={{display: "inline-block",}}
                                                    >
                                                        Step {activeStep + 1}{" "}
                                                        already completed
                                                    </Typography>
                                                ) : (
                                                    <Button onClick={handleComplete}>
                                                        {completedSteps() === totalSteps() - 1
                                                            ? "Finish"
                                                            : "Complete Step"}
                                                    </Button>
                                            ))}
                                        </div>)
                                    }
                                </Box>
                                <Box>
                                    <div
                                        className="parameters"
                                        style={{ overflow: "auto" }}
                                    >
                                        {workflow.workflow[activeStep].data.formData.map(
                                            (parameter: any) => {
                                                return (
                                                    <div
                                                        className="parameter"
                                                        style={{display: "flex",}}
                                                        key={Math.random()}
                                                    >
                                                        <div className="parameter-name">
                                                            {parameter.name}
                                                        </div>
                                                        <div
                                                            className="parameter-separator"
                                                            style={{marginLeft: 5, marginRight: 5,}}
                                                        >
                                                            :
                                                        </div>
                                                        <div className="parameter-value">
                                                            <input
                                                                type="text"
                                                                value={parameter.value
                                                                    ? parameter.value
                                                                    : ""
                                                                }
                                                                onChange={(e) =>
                                                                    (parameter.value = e.target.value)
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </Box>
                            </>
                        </div>
                    </AccordionDetails>
                </Accordion>
            </div>
        </div>
    );
}
