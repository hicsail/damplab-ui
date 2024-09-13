import React, { useState, useContext, useEffect } from 'react';

import { Accordion, AccordionSummary, AccordionDetails, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, IconButton, TextField, Tooltip, Select, MenuItem, FormControl, InputLabel, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon  from '@mui/icons-material/Close';
import Snackbar   from '@mui/material/Snackbar';
import { GppMaybe } from '@mui/icons-material/';

import { getServiceFromId } from '../controllers/GraphHelpers';
import Params from './Params';
import NodeButton from './AllowedConnectionButton';
import { AppContext } from '../contexts/App';
import { CanvasContext } from '../contexts/Canvas';
import { AzentaSeqOrder,       AzentaPool,          AzentaLibrary, 
         initialOrderDefaults, initialPoolDefaults, initialLibraryDefaults } from '../types/Types';
import '../App.css';

// import AzentaDropdown from './AzentaDropdown';
import SequenceDropdown from './SequenceDropdown';
import MPILoginForm from './MPILoginForm';
import RotatingIcons from './SequenceChecker';



export default function RightSidebar() {

  const api_url = process.env.REACT_APP_MPI_API || '';

  const val = useContext(CanvasContext);
  const { services, hazards } = useContext(AppContext);

  const [activeNode,         setActiveNode]         = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
  const [openToast,          setOpenToast]          = useState(false);
  const [open,               setOpen]               = useState(false);
  const [order,              setOrder]              = useState<AzentaSeqOrder>(initialOrderDefaults);
  const [orders,             setOrders]             = useState<AzentaSeqOrder[]>([initialOrderDefaults]);
  // const [searchId,           setSearchId]           = useState('');
  // const [expandedPool,       setExpandedPool]       = useState<string | false>(false);
  // const [expandedLibrary,    setExpandedLibrary]    = useState<string | false>(false);
  // const [expandedAzentaData, setExpandedAzentaData] = useState<string | false>(false);
  const [isLoggedIn,         setIsLoggedIn]         = useState<boolean>(false);

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
  }, [val.activeComponentId, val.nodes]);

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

  useEffect(() => {
    if (isLoggedIn) {
      fetchAllAzentaOrders();
    }
  }, [isLoggedIn]);

  // MPI CALLS
  const fetchAzentaOrder = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:5100/mpi/azentaSeqOrder/${id}`);
      if (!response.ok) {
        throw new Error('Azenta orders not found...');
      }
      const data = await response.json();
      console.log('fetched Azenta Order');
      setOrders(data);
    } catch (error) {
      console.error('Error fetching Azenta orders: ', error);
    }
  }; 

  const fetchAllAzentaOrders = async () => {
    try {
      const response = await fetch(`http://localhost:5100/mpi/azentaSeqOrders`);
      if (!response.ok) {
        throw new Error('Azenta orders not found...');
      }
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Error fetching Azenta orders: ', error);
    }
  }; 

  return (
    <div style={{ wordWrap: 'break-word', paddingLeft: 20, paddingRight: 20, overflow: 'scroll', height: '80vh', textAlign: 'left' }}>
      <div>
        {hazards.includes(activeNode?.data.label) &&
          <p><GppMaybe style={{ color: "grey", verticalAlign: "bottom" }} />&nbsp;Note: For this service,
            sequences provided below or produced by the process will undergo a safety screening.</p>
        }
        <h2>{activeNode?.data.label}</h2>
      </div>
      <div>
        {activeNode?.data.description && <p>{activeNode?.data.description}</p>}
      </div>
      <div><Params activeNode={activeNode} /></div>
      <br />
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
      {/* <SequenceDropdown /> */}
      <Box hidden={activeNode?.data.label !== 'Next Generation Sequencing' && activeNode?.data.label !== 'Send Sample to Sequencing'}>
        <Typography textAlign='left'><h3>Evaluate Target Sequence</h3></Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          {isLoggedIn ? (
            // <Button onClick={() => {}} variant='contained' color='success'>
            //   Evaluate Sequence
            // </Button>
            <RotatingIcons />
          ) : (
            <Button disabled variant='contained' color='success'>
                Evaluate Sequence
            </Button>
          )}
        </Box>
        <Box sx={{  display: 'flex', justifyContent: 'left', my: 4, ml: 2 }}>
          <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}/>
        </Box>
      </Box>
    </div>
  );
}
