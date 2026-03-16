import React, { useState, useContext, useEffect } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, Link as MuiLink } from '@mui/material';
import Snackbar   from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import CloseIcon  from '@mui/icons-material/Close';
import { GppMaybe } from '@mui/icons-material';

import { getServiceFromId } from '../controllers/GraphHelpers';
import Params from './Params';
import NodeButton from './AllowedConnectionButton';
import { AppContext }    from '../contexts/App';
import { CanvasContext } from '../contexts/Canvas'
import { trunc } from '../utils';
import { calculateServiceCost } from '../utils/servicePricing';

import { RecState } from '../types/Types';

interface SidebarProps {
    noMouseEvents?: boolean;
}

export default function ContextTestComponent(props: SidebarProps) {
    const {noMouseEvents} = props;

    const api_url = import.meta.env.VITE_MPI_API || '';
    
    const val                   = useContext(CanvasContext);
    const { services, hazards } = useContext(AppContext);

    const [ID, setID]                 = useState('');
    const [activeNode, setActiveNode] = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
    const [openToast,  setOpenToast]  = useState(false);
    const [open,       setOpen]       = useState(false);
    const [, setPricingTick]          = useState(0);
    const [record,     setRecord]     = useState<RecState>({ id: "", sequence: { name: "", type: "unknown", seq: "", annotations: [] },  // from Database
                                                             azentaLibs: undefined, azentaOrder: undefined, azentaSample: undefined });
    const [pool,      setPool]      = useState<string>('');
    const [libCnt,    setLibCnt]    = useState<string>('');
    const [species,   setSpecies]   = useState<string>('');
    const [volume,    setVolume]    = useState<string>('');
    const [conc,      setConc]      = useState<string>('');
    const [libKit,    setLibKit]    = useState<string>('');
    const [fluor,     setFluor]     = useState<string>('');
    const [electro,   setElectro]   = useState<string>('');
    const [poolStrat, setPoolStrat] = useState<string>('');
    const [comments,  setComments]  = useState<string>('');

    const get = () => {fetch(api_url.concat('/records/', ID), {method: 'GET'})
        .then(response => response.json())
        .then((json) => setRecord({'id': json.id, 'sequence': {'name': json.sequence.name, 'type': json.sequence.type, 
                                                               'seq': json.sequence.seq,   'annotations': json.sequence.annotations}}))
        .catch(error => console.error(error));
    };

    // UPDATE record on MongoDB database
    const put = () => {fetch(api_url.concat('/records/', ID), {method: 'PUT', headers: new Headers({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ 'azentaSample': { 'pool': pool } })
        })
          .then(response => response.json())
          .then(() => (console.log('pool: ', pool)))
          .catch(error => console.error(error));
    };


    const fieldArray  = [   pool,    libCnt,    species,    volume,    conc,    libKit,    fluor,    electro,    poolStrat,    comments];
    const setterArray = [setPool, setLibCnt, setSpecies, setVolume, setConc, setLibKit, setFluor, setElectro, setPoolStrat, setComments];
    const textArray = [
        "Pool Name: ",
        "Num Pool Libraries: ",
        "Species: ",
        "Volume (µL): ",
        "Concentration (nM or ng/uL): ",
        "Library Prep Kit: ",
        "Fluorescence Method: ",
        "Electrophoresis Method: ",
        "Pooling Strategy: ",
        "Special Comments: "
    ];



    const handleClose = () => {
        // put logic to discard changes here
        setOpen(false);
    };

    const handleSave = () => {
        handleClose();
        setOpenToast(true);
    };

    const handleCloseToast = (event: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpenToast(false);
    };

    useEffect(() => {
        setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
    }, [val.activeComponentId]);

    const normalizePrice = (value: unknown): number | undefined => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
    };

    const hasPricingConfigured = (node: any): boolean => {
        if (!node?.data) return false;
        const pricingMode = node.data.pricingMode ?? 'SERVICE';
        if (pricingMode !== 'PARAMETER') {
            return normalizePrice(node.data.price) !== undefined;
        }

        const params: any[] = Array.isArray(node.data.parameters) ? node.data.parameters : [];
        return params.some((p) => {
            if (normalizePrice(p?.price) !== undefined) return true;
            const options = Array.isArray(p?.options) ? p.options : [];
            return options.some((o: any) => normalizePrice(o?.price) !== undefined);
        });
    };

    const getSelectedPricingExplanations = (node: any): string[] => {
        const params: any[] = Array.isArray(node?.data?.parameters) ? node.data.parameters : [];

        const notes: string[] = [];

        for (const param of params) {
            if (!param) continue;

            // Parameter-level note
            const paramNote =
                typeof param.pricingExplanation === 'string' ? param.pricingExplanation.trim() : '';
            if (paramNote) {
                notes.push(`${param.name ?? param.id}: ${paramNote}`);
            }

            // Option-level notes for dropdown/enum params
            if (
                typeof param.type === 'string' &&
                (param.type === 'dropdown' || param.type === 'enum') &&
                Array.isArray(param.options)
            ) {
                for (const opt of param.options as any[]) {
                    if (!opt) continue;
                    const optNote =
                        typeof opt.pricingExplanation === 'string'
                            ? opt.pricingExplanation.trim()
                            : '';
                    if (!optNote) continue;
                    const label = `${param.name ?? param.id} – ${opt.name ?? opt.id}`;
                    notes.push(`${label}: ${optNote}`);
                }
            }
        }

        // De-dupe while preserving order
        const seen = new Set<string>();
        return notes.filter((n) => {
            if (seen.has(n)) return false;
            seen.add(n);
            return true;
        });
    };

    const estimatedCost = activeNode
        ? calculateServiceCost(
            {
                pricingMode: activeNode.data?.pricingMode,
                price: activeNode.data?.price,
                parameters: activeNode.data?.parameters,
            },
            activeNode.data?.formData,
            activeNode.data?.price
        )
        : 0;
    const showPending = activeNode ? !hasPricingConfigured(activeNode) : false;
    const pricingNotes = activeNode ? getSelectedPricingExplanations(activeNode) : [];

    const action = (
        <React.Fragment>
            <Button onClick={handleCloseToast} color="secondary" size="small">
                UNDO
            </Button>
            <IconButton onClick={handleCloseToast} size="small" color="inherit" aria-label="close">
                <CloseIcon fontSize="small" />
            </IconButton>
        </React.Fragment>
    );

    return (
        <div style={{ wordWrap: 'break-word', paddingLeft: 20, paddingRight: 20, overflow: 'scroll', height: '80vh', textAlign: 'left' }}>
            <div style={{pointerEvents: noMouseEvents ? 'none' : 'auto'}}>
                <div>
                    {
                        hazards.includes(activeNode?.data.label) 
                        ? (<p><GppMaybe style={{color: "grey", verticalAlign:"bottom"}}/>&nbsp;Note: For this service, 
                        sequences provided below or produced by the process will undergo a safety screening.</p>)
                        : ""
                    }
                    <h2>
                        {activeNode?.data.label}
                    </h2>
                </div>
                <div>
                    {activeNode?.data.protocolsIoId && (
                        <p style={{ marginTop: 4, marginBottom: 8, fontSize: 13 }}>
                            <b>Protocol:</b>{' '}
                            <MuiLink
                                href={activeNode.data.protocolsIoUrl || activeNode.data.protocolsIoMetadata?.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                underline="hover"
                                sx={{ fontWeight: 500 }}
                            >
                                {activeNode.data.protocolsIoMetadata?.title || `protocols.io ID ${activeNode.data.protocolsIoId}`}
                            </MuiLink>
                        </p>
                    )}
                    {
                        activeNode?.data.description 
                        ? <p>{activeNode?.data.description}</p>
                        : null
                    }
                </div>
                {
                    activeNode
                    ? (
                        <div style={{ marginTop: 8, marginBottom: 12 }}>
                            <p style={{ margin: 0 }}>
                                <b>Estimated price:</b>{' '}
                                {showPending ? '[Price Pending Review]' : `$${estimatedCost.toFixed(2)}`}
                            </p>
                            {pricingNotes.length > 0 ? (
                                <div style={{ marginTop: 6 }}>
                                    <b>Pricing notes</b>
                                    <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                                        {pricingNotes.map((note) => (
                                            <li key={note} style={{ fontSize: 13 }}>
                                                {note}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                    )
                    : null
                }
                {
                    activeNode?.data.formData 
                    ? (
                        <div>
                            <Params
                                activeNode={activeNode}
                                onFormDataChange={() => setPricingTick((t) => t + 1)}
                            />
                        </div>
                    )
                    : null
                }
                        <br />
                <Box hidden={activeNode?.data.label === 'Next Generation Sequencing' ? false : true}>
                    <b>Sample/Pool Info</b> <br />
                    <div>{textArray.map((field: any, index: number) => {
                            // console.log('active node label: ', activeNode?.data.label)
                            if (activeNode?.data.label === 'Next Generation Sequencing') {
                                return(
                                    <div style={{ margin: 20 }}>
                                        <label>
                                            {field} &nbsp;
                                            <input type = "text" value = {fieldArray[index]} style={{marginTop: 5}}
                                                    onChange = {(e) => setterArray[index](e.target.value)} />
                                        </label>
                                    </div>
                                )
                            } else {
                                return null;
                            }
                    })}</div>
                    <Box sx={ { flexDirection:'column', textAlign: 'left' } }>
                        <input name = "id" onChange = { e => { console.log(e.target.value); setID(e.target.value); }} />
                        <Button onClick = {() => { ID ? get() : console.log('No ID set...') }}>Retrieve Record</ Button>
                    </Box>
                    <div style = {{ textAlign: "left", fontSize: 16, width: 100, margin: 5, minHeight: 100 }}>
                        <pre className={"data"}>ID: {record?record.id:''}</pre>
                        <pre className={"data"}>Name: {trunc(record?.sequence?.name ?? '')}</pre>
                        <pre className={"data"}>Type: {trunc(record?.sequence?.type ?? '')}</pre>
                        <pre className={"data"}>Sequence: {trunc(record?.sequence?.seq ?? '')}</pre>
                        <pre className={"data"}>Annotations: {trunc(JSON.stringify(record?.sequence?.annotations ?? ''))}</pre>
                    </div>
                    <b>Library Info</b> <br /><br />
                    <div style={{marginLeft: 20}}>
                        <label>Pool Name: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label><br />
                        <label>Library Name: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label><br />
                        <label>i7 Index Seq: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label><br />
                        <label>i5 Index Seq: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label><br />
                        <label>Custom Read 1: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label><br />
                        <label>Custom Read 2: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label><br />
                        <label>Custom Index 1: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label><br />
                        <label>Custom Index 2: <br />
                            <input type = "text" onChange = {(e) => {}} style={{marginTop: 5}}/>
                        </label>
                    </div>
                    <Button onClick = {() => { }} sx = {{ ml: 2 }}>+ Add Library</ Button>
                    <br />
                    <Button variant='contained' onClick = {() => { put() }} sx = {{ ml: 2 }}>Send to MPI Record {ID}</ Button>
                </Box>
                <div>
                    {
                        // return header with text Allowed Connections if allowedConnections list is not empty
                        activeNode && activeNode.data.allowedConnections && activeNode.data.allowedConnections.length > 0 
                        ? <h3>Allowed Connections</h3>
                        : null
                    }
                    {
                        activeNode 
                        && activeNode.data.allowedConnections 
                        && activeNode.data.allowedConnections.length > 0 
                        ? (activeNode.data.allowedConnections.map((connection: any) => {
                            return (
                                <NodeButton 
                                    key                  = {Math.random().toString(36).substring(2, 9)}
                                    node                 = {getServiceFromId(services, connection.id)}
                                    sourceId             = {val.activeComponentId}
                                    setNodes             = {val.setNodes}
                                    setEdges             = {val.setEdges}
                                    sourcePosition       = {activeNode.position}
                                    setActiveComponentId = {val.setActiveComponentId}
                                />
                            )
                        })) 
                        : null
                    }
                </div>
                <div>
                    {
                        activeNode 
                        ? (
                            <>
                                <Snackbar
                                    open             = {openToast}
                                    autoHideDuration = {3000}
                                    onClose          = {handleCloseToast}
                                    message          = "Parameters Saved"
                                    action           = {action}
                                    key              = {'bottomright'}
                                    anchorOrigin     = {{ vertical: 'bottom', horizontal: 'right' }}
                                />
                                <Dialog
                                    open             = {open}
                                    onClose          = {handleClose}
                                    aria-labelledby  = "alert-dialog-title"
                                    aria-describedby = "alert-dialog-description"
                                >
                                    <DialogContent>
                                        <DialogContentText id="alert-dialog-description">
                                            There are unsaved changes. Do you want to save them?
                                        </DialogContentText>
                                    </DialogContent>
                                    <DialogActions>
                                        <Button onClick={handleClose}>Discard</Button>
                                        <Button onClick={handleSave} autoFocus>
                                            Save
                                        </Button>
                                    </DialogActions>
                                </Dialog>
                            </>
                        ) 
                        : <div><br />Drag a node from the left to the canvas to see its properties here.</div>
                    }
                </div>
                <div>
                    {/* <Button onClick={ ()=> console.log(JSON.stringify(val.nodes), JSON.stringify(val.edges))}><br/>Print</Button> */}
                </div>
            </div>
        </div>
    )
}
