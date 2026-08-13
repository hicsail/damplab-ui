import React, { memo, useContext, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Badge, Box, Button, IconButton } from '@mui/material';
import WarningIcon     from '@mui/icons-material/Warning';
import CloseIcon       from '@mui/icons-material/Close';
import LockIcon        from '@mui/icons-material/Lock';

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

    /**
     * Job-editor decoration. These three flags are set by JobEditor and never
     * exist on the ordinary canvas, so a node with none of them renders exactly
     * as it always has.
     *
     *   diffKind — 'added' | 'changed', relative to the diff baseline
     *   ghost    — deleted in this session, kept visible so the removal is legible
     *   locked   — work already under way; not the editor's to change
     */
    const diffKind: string | undefined = data.data.diffKind;
    const isGhost = !!data.data.ghost;
    const isLocked = !!data.data.locked;

    const outline = isGhost
        ? { border: '2px dashed #9e9e9e' }
        : diffKind === 'added'
        ? { border: '2px solid #2e7d32' }
        : diffKind === 'changed'
        ? { border: '2px solid #ed6c02' }
        : {};

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
            <Box sx={{ position: 'relative', opacity: isGhost ? 0.45 : 1 }}>
                {/* A node the lab has already started is shown as held rather than deletable. */}
                {isLocked && !isGhost ? (
                    <Box
                        title={`${data.data.label} is already under way and cannot be changed`}
                        sx={{
                            position: 'absolute', top: -10, left: -10, zIndex: 5,
                            width: 20, height: 20, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: 'white', border: '1px solid', borderColor: 'divider', boxShadow: 1,
                        }}
                    >
                        <LockIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                    </Box>
                ) : null}
                {/* Diff state is carried by more than colour, so it survives a greyscale print or colour-blind viewing.
                    Sits bottom-right: the run-count Badge below owns the top-right corner. */}
                {diffKind || isGhost ? (
                    <Box
                        sx={{
                            position: 'absolute', bottom: -12, right: -6, zIndex: 5,
                            px: 0.6, borderRadius: 1, fontSize: 10, fontWeight: 700, lineHeight: '16px',
                            color: 'white',
                            backgroundColor: isGhost ? '#757575' : diffKind === 'added' ? '#2e7d32' : '#ed6c02',
                        }}
                    >
                        {isGhost ? 'Deleted' : diffKind === 'added' ? 'New' : 'Edited'}
                    </Box>
                ) : null}
                {/* Incomplete parameters are flagged in the bottom-left corner rather than
                    inside the button: as an in-flow flex child the icon stole width from the
                    label, so a node's text re-wrapped the moment it became complete. */}
                {allFilled || isGhost ? null : (
                    <Box
                        title={`${data.data.label} is missing required parameters`}
                        sx={{
                            position: 'absolute', bottom: -10, left: -10, zIndex: 5,
                            width: 20, height: 20, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: 'white', border: '1px solid', borderColor: 'divider', boxShadow: 1,
                        }}
                    >
                        <WarningIcon sx={{ fontSize: 13, color: 'red' }} />
                    </Box>
                )}
                {/* nodrag keeps a click from starting a canvas drag instead of deleting. */}
                {input.readOnly || isLocked || isGhost ? null : <IconButton
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
                    style={{ width: 250, display: 'flex', justifyContent: 'space-around', background : background, ...outline }}>
                        <div>
                            {/* URL (e.g. to Google Drive) from the DB... */}
                            {/* <img src={data.data.icon} alt=" " style={{ width: 30 }} /> */}
                            {/* Local files in src/assets/icons folder... */}
                            <img src={ImagesServicesDict[data.data.label]} alt=" " style={{ width: 30 }} />
                        </div>
                        <p style={{ fontSize: 12, marginLeft: 5, marginRight: 5, textDecoration: isGhost ? 'line-through' : 'none' }}>
                            {data.data.label}
                        </p>
                    </Button>
                </Badge>
                <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: 10, height: 10}}/>
                <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: 10, height: 10}}/>
            </Box>
        </div>
    );
});