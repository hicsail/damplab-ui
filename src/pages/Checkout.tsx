import React, { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client";
import {
  Accordion,
  Box,
  Button,
  Snackbar,
  styled,
  TextField,
  Typography,
} from "@mui/material";

import {
  getWorkflowsFromGraph,
  transformEdgesToGQL,
  transformNodesToGQL,
} from "../controllers/GraphHelpers";
import { CREATE_JOB } from "../gql/mutations";
import { CanvasContext } from "../contexts/Canvas";
import { AppContext } from "../contexts/App";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ReactFlow, { ReactFlowProvider } from "reactflow";
import CustomDemoNode from "../components/CanvasNode";

const nodeTypes = {
  selectorNode: CustomDemoNode,
};

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

export default function Checkout() {
  // contexts
  const val = useContext(CanvasContext);
  const { hazards } = useContext(AppContext);
  // ui states
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  // workflow states
  const [workflows, setWorkflows] = useState(
    getWorkflowsFromGraph(val.nodes, val.edges)
  );
  const [workflowNames, setWorkflowNames] = useState<any>({});
  const [checkoutWorkflow, setCheckoutWorkflow] = useState<any>([]);
  // refs for workflows
  const myRefs         = useRef<any>([]);
  const jobRef         = useRef<any>(null);
  const userRef        = useRef<any>(null);
  const institutionRef = useRef<any>(null);
  const emailRef       = useRef<any>(null);
  const notesRef       = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const navigate = useNavigate();

  const [createJob] = useMutation(CREATE_JOB, {
    onCompleted: (data) => {
      console.log("successfully created job:", data);
      navigate("/submitted", { state: { id: data.createJob.id } });
      let fileName = `${data.createJob.id}_${new Date().toLocaleString()}`;
      let file = {
        fileName: fileName,
        nodes: val.nodes,
        edges: val.edges,
      };
      localStorage.setItem(fileName, JSON.stringify(file));
    },
    onError: (error: any) => {
      console.log("error creating job", error.networkError?.result?.errors);
    },
  });

  useEffect(() => {
    setCheckoutWorkflow(createWorkflowObj());
  }, [val.nodes, val.edges]);

  useEffect(() => {

    // scroll to selected node in parameters div without scrolling the whole page
    if (selectedNode) {
      let node = document.getElementById(selectedNode.id);
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    
  },[selectedNode]);

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
        nodes: workflow,
      };
      workflowObjs.push(obj);
    });
    return workflowObjs;
  };

  const getGQLWorkflows = () => {
    let workflows: any = [];
    checkoutWorkflow.forEach(async (flow: any, index: number) => {
      let workflow = flow.nodes;
      let gqlWorkflows: any = transformNodesToGQL(workflow);
      let edges = val.edges.filter((edge: any) => {
        return (
          workflow.find((node: any) => node.id === edge.source) &&
          workflow.find((node: any) => node.id === edge.target)
        );
      });
      let gqlEdges: any = transformEdgesToGQL(edges);

      let gqlWorkflow = {
        name: "", // myRefs.current[index].value, // workflowNames[flow.id],
        nodes: gqlWorkflows,
        edges: gqlEdges,
      };
      workflows.push(gqlWorkflow);
    });
    return workflows;
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    console.log("hello world");
    console.log(getGQLWorkflows());
    if (e.target.checkValidity()) {
      const date = new Date(Date.now()).toString();
      const data = {
        name: jobRef.current.value,
        username: userRef.current.value,
        institute: institutionRef.current.value,
        email: emailRef.current.value,
        notes: notesRef.current.value,
        workflows: getGQLWorkflows(),
        // submitted: date
      };
      createJob({ variables: { createJobInput: data } });
    } else {
      alert("Form is incomplete.  Please fill out all required fields...");
    }
  };

  // function that returns list of parameters on services
  const getParameters = (nodeId: string) => {
    let service = val.nodes.find((node: any) => node.id === nodeId);
    if (service && service.data) return service.data.formData;
    else return [];
  };

  const onNodeClick = (event: any, node: any) => {
    setSelectedNode(node);
  };

  // function that renders parameters for each service in a list
  const renderParameters = (node: any) => {
    let parameters = getParameters(node.id);

    // return node name and parameters
    return (
      <div>
        <Typography variant="h6">{node.name}</Typography>
        {parameters.map((param: any, index: number) => (
          <Accordion key={index}>
            <Box>
              <Typography variant="body1">{param.label}</Typography>
              <TextField
                required
                label={param.name}
                margin="dense"
                variant="outlined"
                inputRef={myRefs.current[index]}
                value={param.value}
                size="small"
              />
            </Box>
          </Accordion>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div>
        <div
          style={{
            width: "100%",
          }}
        >
          <div>
            <Typography variant="h6">Review flow</Typography>
          </div>
          <div>
            
              <div
                className="reactflow-wrapper"
                style={{
                  height: "80vh",
                  display: "flex",
                  width: "100%",
                  border: "solid 1px",
                }}
              >
                <ReactFlow
                  nodes={val.nodes}
                  edges={val.edges}
                  onNodeClick={onNodeClick}
                  nodeTypes={nodeTypes}
                  fitView
                />
                <div
                  style={{
                    width: "50%",
                    overflowY: "scroll",
                    border: "solid 1px",
                  }}
                  className="parameters"
                >
                  {
                    // render parameters for each service
                    val.nodes.map((node: any) => {
                      return (
                        <div
                          key={node.id}
                          ref={(ref) => myRefs.current.push(ref)}
                          id={node.id}
                          style={{
                            marginBottom: 40,
                          }}
                        >
                          {renderParameters(node)}
                        </div>
                      );
                    })
                  }
                </div>
              </div>
           
          </div>
        </div>
        <div
          style={{
            padding: 30,
            textAlign: "center",
            alignItems: "center",
            width: "40%",
            marginLeft: 100,
            marginTop: 50,
            marginBottom: 150,
          }}
        >
          <div
            style={{
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <Typography variant="h4">Submit Job</Typography>
            <Box height={50} />
            <Box>
              <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Box height={300}>
                <Typography variant="body1">Submitter Details</Typography>
                  <TextField
                    required
                    label="Submitter Name"
                    margin="dense"
                    variant="outlined"
                    inputRef={userRef}
                  />
                  <TextField
                    required
                    label="Institution"
                    margin="dense"
                    variant="outlined"
                    inputRef={institutionRef}
                  />
                  <TextField
                    required
                    label="Email"
                    margin="dense"
                    variant="outlined"
                    inputRef={emailRef}
                  />
                </Box>
                <Box height={300}>
                  <Typography variant="body1">Job Details</Typography>
                  <TextField
                    required
                    label="Job Name"
                    margin="dense"
                    variant="outlined"
                    inputRef={jobRef}
                  />
                  <TextField
                    label="Notes"
                    margin="dense"
                    variant="outlined"
                    inputRef={notesRef}
                  />
                  <Box height={20} />
                  <Button
                    component="label"
                    role={undefined}
                    variant="contained"
                    tabIndex={-1}
                    startIcon={<CloudUploadIcon />}
                  >
                    Upload file
                    <VisuallyHiddenInput type="file" />
                  </Button>
                </Box>
              </Box>
              <Button
                variant="contained"
                fullWidth
                style={{ padding: 20, marginTop: 10, fontSize: 15 }}
                onClick={handleSubmit}
              >
                Submit
              </Button>
            </Box>
          </div>
        </div>
      </div>
      <Snackbar
        open={open}
        autoHideDuration={6000}
        message={"Saved, find at /submitted/"}
      />
    </div>
  );
}
