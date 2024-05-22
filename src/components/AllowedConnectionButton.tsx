import React, { useContext } from 'react'
import { Button } from '@mui/material';
import { CanvasContext } from '../contexts/Canvas';
import { addNodeToCanvasWithEdge } from '../controllers/GraphHelpers';
import { ImagesServicesDict } from '../assets/icons';

export default function NodeButton(data: any) {
    if (!data.node) return null;
    const node = data.node;
    const label = node.name;
    // URL (e.g. to Google Drive) from the DB...
    // const icon = node.icon;
    // Local files in src/assets/icons folder...
    const icon = ImagesServicesDict[label];

    return (
        <div>
            <Button variant="outlined" title={label} onClick={ ()=> addNodeToCanvasWithEdge([], 
                data.sourceId, node, data.setNodes, data.setEdges, data.sourcePosition, 
                data.setActiveComponentId) }  
                style={{ width: 194, display: 'flow', justifyContent: 'space-around', margin: 20 }} sx={{boxShadow: 2}}>
                <div>
                    <img src={icon} alt=" " style={{ height: 60 }} />
                </div>
                {label}
            </Button>
        </div>
    )
}
