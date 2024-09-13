import React, { useState, useContext, useEffect } from 'react';

import { Accordion, AccordionSummary, AccordionDetails, Box, Button, IconButton, TextField, Tooltip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { GppMaybe } from '@mui/icons-material/';

import Params from './Params';
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
  const { hazards } = useContext(AppContext);

  const [activeNode,         setActiveNode]         = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
  const [order,              setOrder]              = useState<AzentaSeqOrder>(initialOrderDefaults);
  const [orders,             setOrders]             = useState<AzentaSeqOrder[]>([initialOrderDefaults]);
  // const [searchId,           setSearchId]           = useState('');
  // const [expandedPool,       setExpandedPool]       = useState<string | false>(false);
  // const [expandedLibrary,    setExpandedLibrary]    = useState<string | false>(false);
  // const [expandedAzentaData, setExpandedAzentaData] = useState<string | false>(false);
  const [isLoggedIn,         setIsLoggedIn]         = useState<boolean>(false);


  useEffect(() => {
    setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
  }, [val.activeComponentId, val.nodes]);

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
      <Box hidden={activeNode?.data.label !== 'Next Generation Sequencing'}>
        <Box sx={{ my: 4 }}>
          <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}/>
        </Box>
        <Box sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
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
      </Box>
      {/* <SequenceDropdown /> */}
    </div>
  );
}
