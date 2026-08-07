import React, { memo, useContext, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Badge, Box, Button, IconButton } from '@mui/material';
import WarningIcon     from '@mui/icons-material/Warning';
import CloseIcon       from '@mui/icons-material/Close';

import { CanvasContext } from '../contexts/Canvas';
import { ImagesServicesDict } from '../assets/icons';
import { RUN_COUNT_PARAM_ID } from '../utils/servicePricing';


type Input = {
    /** ReactFlow node id, supplied to every custom node. */
    id: string;
    isConnectable: boolean;
    data: any;
    /** Set on non-editable canvases (e.g. CanvasPreview) to hide the delete control. */
    readOnly?: boolean;
};

// const style = {
//     position: 'absolute' as 'absolute',
//     top: '50%',
//     left: '50%',
//     transform: 'translate(-50%, -50%)',
//     width: 400,
//     bgcolor: 'background.paper',
//     border: '2px solid #000',
//     boxShadow: 24,
//     p: 4,
// };
 
export default memo((input: Input) => {

    const { setActiveComponentId, activeComponentId } = useContext(CanvasContext);
    const { deleteElements } = useReactFlow();
    const [background, setBackground] = useState('white');
    const [allFilled, setAllFilled] = useState(false);
    const isConnectable = input.isConnectable;
    const data = input;

    const handleOpen = () => {
        setActiveComponentId(data.data.id);
    };

    // Routed through ReactFlow rather than editing nodes directly, so this takes
    // the same path as the Delete key -- connected edges are cleaned up too.
    const handleDelete = (event: React.MouseEvent) => {
        event.stopPropagation();
        deleteElements({ nodes: [{ id: input.id }] });
    };

    useEffect(() => {

        if (activeComponentId === data.data.id) {
            setBackground('rgb(153, 255, 204)');
        } else {
            setBackground('white');
        }
        setAllFilled(checkIfDataFilled(data.data.formData))
    }, [activeComponentId, data.data.id, data.data.formData]);

    const checkIfDataFilled = (formData: any) => {

        let filled = true;
        formData.forEach((obj: any) => {
            if (obj.paramType === 'result') {
                if (obj.value === false && obj.required === true && ( obj.resultParamValue=== null || obj.resultParamValue === '')) {
                    filled = false;
                }
            }
            else if (obj.required === true) {
                const isMulti = obj.allowMultipleValues === true || Array.isArray(obj.value);
                if (isMulti) {
                    const arr = obj.value;
                    const hasValue = Array.isArray(arr) && arr.some((v: any) => v != null && String(v).trim() !== '');
                    if (!hasValue) filled = false;
                } else if (obj.value === '' || obj.value === undefined || obj.value === null) {
                    filled = false;
                }
            }
        });

        return filled;
    }

    const runCountEntry = Array.isArray(data.data.formData)
        ? data.data.formData.find((p: any) => p?.id === RUN_COUNT_PARAM_ID)
        : undefined;
    const runCountRaw = runCountEntry?.value;
    const runCount = typeof runCountRaw === 'number' ? runCountRaw
        : typeof runCountRaw === 'string' && runCountRaw.trim() !== '' ? Number(runCountRaw)
        : 1;
    const showBadge = Number.isFinite(runCount) && runCount > 1;

    return (
        <div>
            <Box sx={{ position: 'relative' }}>
                {/* nodrag keeps a click from starting a canvas drag instead of deleting. */}
                {input.readOnly ? null : <IconButton
                    className="nodrag"
                    size="small"
                    title={`Delete ${data.data.label}`}
                    aria-label={`Delete ${data.data.label}`}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={handleDelete}
                    sx={{
                        position: 'absolute',
                        top: -10,
                        left: -10,
                        zIndex: 5,
                        width: 20,
                        height: 20,
                        padding: 0,
                        backgroundColor: 'white',
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: 1,
                        '&:hover': { backgroundColor: 'error.main', color: 'white' },
                    }}
                >
                    <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>}
                <Badge
                    badgeContent={showBadge ? `×${runCount}` : undefined}
                    color="primary"
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    invisible={!showBadge}
                    sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 'bold', minWidth: 20, height: 20 } }}
                >
                    <Button variant="outlined" title={data.data.label} onClick={handleOpen} sx={{boxShadow: 2}}
                    style={{ width: 250, display: 'flex', justifyContent: 'space-around', background : background }}>
                        <div>
                            {/* URL (e.g. to Google Drive) from the DB... */}
                            {/* <img src={data.data.icon} alt=" " style={{ width: 30 }} /> */}
                            {/* Local files in src/assets/icons folder... */}
                            <img src={ImagesServicesDict[data.data.label]} alt=" " style={{ width: 30 }} />
                        </div>
                        <p style={{ fontSize: 12, marginLeft: 5, marginRight: 5 }}>
                            {data.data.label}
                        </p>
                        <div>
                            { allFilled ? null : <WarningIcon style={{ color: 'red' }} />}
                        </div>
                    </Button>
                </Badge>
                <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: 10, height: 10}}/>
                <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: 10, height: 10}}/>
            </Box>
        </div>
    );
});