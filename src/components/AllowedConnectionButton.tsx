import React, { useContext } from 'react'
import { Button } from '@mui/material';
import { CanvasContext } from '../contexts/Canvas';
import { addNodeToCanvasWithEdge } from '../controllers/GraphHelpers';
export default function NodeButton(data: any) {
    if (!data.node) return null;
    const node = data.node;
    const label = node.name;
    const icon = node.icon;
    return (
        <div>
            <Button variant="outlined" title={label} onClick={ ()=> addNodeToCanvasWithEdge([], 
                data.sourceId, node, data.setNodes, data.setEdges, data.sourcePosition, 
                data.setActiveComponentId) }  
                style={{ width: 194, display: 'flow', justifyContent: 'space-around', margin: 20 }}>
                <div>
                    <img src={icon} alt=" " style={{ height: 40 }} />
                </div>
                {label}
            </Button>
        </div>
    )
}
