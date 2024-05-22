import React, { memo, useContext, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Button } from '@mui/material';
import WarningIcon     from '@mui/icons-material/Warning';

import { CanvasContext } from '../contexts/Canvas';
import { ImagesServicesDict } from '../assets/icons';


type Input = {
    isConnectable: boolean;
    data: any;
};

const style = {
    position: 'absolute' as 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

export default memo((input: Input) => {

    const { setActiveComponentId, activeComponentId, nodes } = useContext(CanvasContext);
    const [background, setBackground] = useState('white');
    const [allFilled, setAllFilled] = useState(false);
    const isConnectable = input.isConnectable;
    const data = input;

    const handleOpen = () => {
        setActiveComponentId(data.data.id);
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
                if (obj.value === false && ( obj.resultParamValue=== null || obj.resultParamValue === '')) {
                    filled = false;
                }
            }
            else if (obj.value === '' || obj.value === undefined || obj.value === null) {
                filled = false;
            }
        });

        return filled;
    }

    return (
        <div>
            <Box>
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
                <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: 10, height: 10}}/>
                <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: 10, height: 10}}/>      
            </Box>
        </div>
    );
});