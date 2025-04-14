import { useContext, useRef } from "react";
import { Dialog, DialogContent, IconButton } from "@mui/material";
import ReactFlow, { ReactFlowProvider, Background, Controls } from "reactflow";
import CustomDemoNode from './CanvasNode';
import { CanvasContext } from "../contexts/Canvas";
import CloseIcon from '@mui/icons-material/Close';
import RightSidebar   from './RightSidebar';

interface CanvasPreviewProps {
    workflow: any;  // Array of node objects used in workflow
    isOpen: boolean;    // Controls if dialog is open
    onClose: () => void;    // Closes dialog
}

// Defines node type used in preview. 
const nodeTypes = {
    selectorNode: CustomDemoNode,
};

// This component must be called with an array of nodes for its workflow
export default function CanvasPreview(props: CanvasPreviewProps) {
    const { workflow, isOpen, onClose } = props;
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const { edges } = useContext(CanvasContext);    // We need edges from canvas context as edges aren't passed in via props for simplicity.

    
    return (
        <>
            <Dialog
                open={isOpen}
                onClose={onClose}
                PaperProps={{
                    style: {
                        // This width and height affects the overall size of dialog
                        width: '85vw', 
                        height: '85vh', 
                        maxWidth: 'none', 
                        borderRadius: '12px',
                    }
                }}
            >
                <IconButton 
                    onClick={onClose} 
                    style={{
                        position: 'absolute', 
                        top: '8px', 
                        right: '8px',
                        zIndex: 10,
                    }}
                >
                    <CloseIcon />
                </IconButton>
                <DialogContent style={{ padding: 0, height: '100%', width: '100%', display: 'flex' }}>
                    {/* Here the react flow and right sidebar have a 70% 30% width split within dialog, with right sidebar having a min width of 500px */}
                    <ReactFlowProvider>
                        <div ref={reactFlowWrapper} style={{ width: '70%', height: '100%' }}>
                            <ReactFlow
                                nodes={workflow}
                                edges={edges}
                                nodeTypes={nodeTypes}
                                nodesDraggable={false}
                                nodesConnectable={false}
                                fitView
                                fitViewOptions={{padding: 0.2,}}
                                style={{ width: '100%', height: '100%' }}
                            >
                                <Background gap={16} size={1} />

                                <Controls />
                            </ReactFlow>
                        </div>
                    </ReactFlowProvider>
                  
                    <div style={{width: '30%', minWidth:'500px'}}>
                        <RightSidebar noMouseEvents/>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
