import React, { useState, useContext, useEffect } from 'react';

import { Accordion, AccordionSummary, AccordionDetails, Box, Button, IconButton, TextField, Tooltip } from '@mui/material';
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


export default function RightSidebar() {

  const api_url = process.env.REACT_APP_MPI_API || '';

  const val = useContext(CanvasContext);
  const { hazards } = useContext(AppContext);

  const [activeNode,         setActiveNode]         = useState(val.nodes.find((node: any) => node.id === val.activeComponentId));
  const [order,              setOrder]              = useState<AzentaSeqOrder>(initialOrderDefaults);
  const [searchId,           setSearchId]           = useState('');
  const [expandedPool,       setExpandedPool]       = useState<string | false>(false);
  const [expandedLibrary,    setExpandedLibrary]    = useState<string | false>(false);
  const [expandedAzentaData, setExpandedAzentaData] = useState<string | false>(false);


  useEffect(() => {
    setActiveNode(val.nodes.find((node: any) => node.id === val.activeComponentId));
  }, [val.activeComponentId, val.nodes]);


  // HANDLERS
  const handleAddPool = () => {
    setOrder(prevOrder => ({
      ...prevOrder,
      pools: [...prevOrder.pools, initialPoolDefaults]
    }));
  };

  const handleRemovePool = () => {
    setOrder(prevOrder => ({
      ...prevOrder,
      pools: prevOrder.pools.slice(0, -1)
    }));
  };

  const handleAddLibrary = (poolIndex: number) => {
    const newPools = [...order.pools];
    newPools[poolIndex].libraries.push(initialLibraryDefaults);
    setOrder({ ...order, pools: newPools });
  };

  const handleRemoveLibrary = (poolIndex: number) => {
    const newPools = [...order.pools];
    newPools[poolIndex].libraries.pop();
    setOrder({ ...order, pools: newPools });
  };
  
  const handleSearchClick = () => {
    if (searchId) {
      fetchAzentaOrder(searchId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handlePoolChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPool(isExpanded ? panel : false);
  };
  
  const handleLibraryChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedLibrary(isExpanded ? panel : false);
  }; 


  // MPI CALLS
  const fetchAzentaOrder = async (orderId: string) => {
    try {
      const response = await fetch(api_url.concat(`/azenta/seqOrder/${orderId}`));
      if (!response.ok) {
        throw new Error('Azenta order not found...');
      }
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Error fetching Azenta order data: ', error);
    }
  }; 

  const updateAzentaOrder = async () => {
    try {
      console.log('order id: ', order?.id ?? '', order ?? '')
      const { id, ...orderData } = order;
      const response = await fetch(api_url.concat(`/azenta/seqOrder/${order.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
  
      if (!response.ok) {
        throw new Error('Error updating Azenta order...');
      }
  
      const data = await response.json();
      console.log('Update successful:', data);
    } catch (error) {
      console.error('Error updating Azenta order: ', error);
    }
  };
  // const updateAzentaOrder = () => {fetch(api_url.concat('/azenta/SeqOrder/', ID), {method: 'PUT', headers: new Headers({ 'Content-Type': 'application/json' }),
  //   body: JSON.stringify({ 'azentaSample': { 'pool': pool } })
  //   })
  //     .then(response => response.json())
  //     .then(() => (console.log('pool: ', pool)))
  //     .catch(error => console.error(error));
  // };


  // RENDERERS
  const renderLibraries = (libraries: AzentaLibrary[], poolIndex: number) => (
    libraries.map((library, libraryIndex) => (
      <Box key={libraryIndex} sx={{ mt: 1, mb: 1 }}>
        <Accordion
          expanded={expandedLibrary === `library-${poolIndex}-${libraryIndex}`}
          onChange={handleLibraryChange(`library-${poolIndex}-${libraryIndex}`)}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ flex: 1, mt: 1 }}>Library {libraryIndex + 1}</Box>
            <IconButton onClick={() => handleRemoveLibrary(poolIndex)}>
              <DeleteIcon />
            </IconButton>
          </AccordionSummary>
          <AccordionDetails>
            {Object.keys(initialLibraryDefaults).map(key => (
              <TextField
                key={key}
                name={key}
                label={key}
                value={(library as any)[key] ?? ''}
                onChange={(e) => {
                  const newPools = [...order.pools];
                  newPools[poolIndex].libraries[libraryIndex][key as keyof AzentaLibrary] = e.target.value as any;
                  setOrder({ ...order, pools: newPools });
                }}
                fullWidth
                margin="normal"
              />
            ))}
          </AccordionDetails>
        </Accordion>
      </Box>
    ))
  );

  const renderPools = () => (
    order.pools.map((pool, poolIndex) => (
      <Accordion 
        key={poolIndex}
        expanded={expandedPool === `pool-${poolIndex}`}
        onChange={handlePoolChange(`pool-${poolIndex}`)}
        sx={{ backgroundColor: '#f5f2fc' }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ flex: 1, mt: 1 }}>Pool {poolIndex + 1}</Box>
          <IconButton onClick={handleRemovePool}>
            <DeleteIcon />
          </IconButton>
        </AccordionSummary>
        <AccordionDetails>
          {Object.keys(initialPoolDefaults).map(key => (
            key !== 'libraries' ? (
              <TextField
                key={key}
                name={key}
                label={key}
                value={(pool as any)[key] ?? ''}
                onChange={(e) => {
                  const newPools = [...order.pools];
                  newPools[poolIndex][key as keyof AzentaPool] = e.target.value as any;
                  setOrder({ ...order, pools: newPools });
                }}
                fullWidth
                margin="normal"
              />
            ) : null
          ))}
          {renderLibraries(pool.libraries, poolIndex)}
          <Button onClick={() => handleAddLibrary(poolIndex)}>+ Add Library</Button>
        </AccordionDetails>
      </Accordion>
    ))
  );



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
        <br /><br />
        <Accordion
          expanded={expandedAzentaData === 'azentaData'}
          onChange={(event, isExpanded) => setExpandedAzentaData(isExpanded ? 'azentaData' : false)}
          sx={{ backgroundColor: '#ece6fc' }}
        >
          <AccordionSummary sx={{ background: '#826ec3', color: 'white' }} expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ flex: 1 }}><b>Azenta Order</b></Box>
          </AccordionSummary>
          <AccordionDetails>

            <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Box sx={{ mb: 1 }}><b>Enter ID:</b>&nbsp;&nbsp;</Box>
              <TextField 
                name="id" 
                label="Order ID" 
                onChange={e => setSearchId(e.target.value)} 
                onKeyDown={handleKeyDown}
                variant="standard"   
                sx={{ width: '50%' }}
              />
              <Tooltip title="Pull record from MPI">
                <IconButton onClick={handleSearchClick}>
                  <SearchIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <TextField name='orderId' label='Order ID' value={order.id} variant='filled' fullWidth sx={{m:1}} />
            <TextField name='orderName' label='Order Name' value={order.orderName} variant='filled' fullWidth sx={{m:1}} />
  
            <br /><br /><b>Pools</b> <br /><br />
            {renderPools()}
            <Button onClick={handleAddPool}>+ Add Pool</Button>
            {/* Add the update button here */}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Button onClick={updateAzentaOrder} variant="contained" 
                      sx={{ mt: 2, align: 'middle', backgroundColor: '#826ec3',
                            '&:hover': {background: '#9386bd'}
                       }}>
                Update MPI Record:<br />{order.id? order.id : "?"}
              </Button>
            </Box>

          </AccordionDetails>
        </Accordion>
      </Box>
      <br /><br /><br /><br />
    </div>
  );
}
