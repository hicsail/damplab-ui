import { createContext } from "react";
import { Node, Edge } from "reactflow";

type CanvasContextType = {
    nodes: Node[];
    edges: Edge[];
    nodeParams: any;
    setNodeParams: any;
    setNodes: any;
    setEdges: any;
    activeComponentId: string;
    setActiveComponentId: any;
    // bgColor: string;
    // setBgColor: (bgColor: string) => void;
};

export const CanvasContext = createContext({} as CanvasContextType);