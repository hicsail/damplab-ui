import { useState } from "react";
import { useContext } from "react";
import { CanvasContext } from "../contexts/Canvas";
import { getWorkflowsFromGraph } from "../controllers/GraphHelpers";
import CanvasPreview from "./CanvasPreview";

// TODO: Remove this component when done developing canvas preview.
// This is a simple test component to see how canvas preview is called and used.
export default function ExamplePreviewUsage()  {
	// There needs to be two states to control canvas preview, an isOpen to control if it is open, and a state to store the current selected workflow.
	const [workflow, setWorkFlow] = useState<Node[]>([]); 
	const [isOpen, setIsOpen] = useState(false);

	// We need canvas context so we can call getWorkflowsFromGraph.
	const { nodes, edges } = useContext(CanvasContext);

	const openPreview = (index: number) => {
		const workflows = getWorkflowsFromGraph(nodes, edges);
        setWorkFlow(workflows[index]);
		setIsOpen(true);
	}

	const closePreview = () => {
		setIsOpen(false);
	}

	return(
		<>
			<div onClick={() => openPreview(0)}>Workflow 1</div>
			<div onClick={() => openPreview(1)}>Workflow 2</div>
			<div onClick={() => openPreview(2)}>Workflow 3</div>
			<CanvasPreview workflow={workflow} isOpen={isOpen} onClose={closePreview}/>
		</>
	)
}
