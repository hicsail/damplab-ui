import React, { memo, useContext, useEffect, useState } from 'react';
import { Handle } from 'reactflow';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { CanvasContext } from '../contexts/Canvas';


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

    const { setActiveComponentId, activeComponentId } = useContext(CanvasContext);
    const isConnectable = input.isConnectable;
    const data = input;
    const [background, setBackground] = useState('white');

    const handleOpen = () => {
        setActiveComponentId(data.data.id);
    };
    
    // if activeComponentId is equal to this node's id, then set background to green
    useEffect(() => {
        if (activeComponentId === data.data.id) {
            setBackground('rgb(153, 255, 204)');
        } else {
            setBackground('white');
        }
    }, [activeComponentId, data.data.id]);
    return (
        <div>
            <Box style={{background : background}}>
                <Handle type="target" position="left" isConnectable={isConnectable} />
                <Button variant="outlined" onClick={handleOpen} style={{ width: 200, display: 'flex', justifyContent: 'space-around' }}>
                    <div>
                        <img src={data.data.icon} alt={data.data.label} style={{ width: 30 }} />
                    </div>
                    {data.data.label}
                </Button>
                <Handle type="source" position="right" isConnectable={isConnectable} />
            </Box>
        </div>
    );
});