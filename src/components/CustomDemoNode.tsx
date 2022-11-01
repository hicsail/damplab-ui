import React, { memo, useContext } from 'react';
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

    const { setActiveComponentId } = useContext(CanvasContext);
    const isConnectable = input.isConnectable;
    const data = input;

    const handleOpen = () => {
        setActiveComponentId(data.data.id);
    };

    return (
        <div>
            <Box>
                <Handle type="target" position="left" isConnectable={isConnectable} />
                <Button variant="outlined" onClick={handleOpen} style={{ width: 200, display: 'flex', justifyContent: 'space-around' }}>
                    <div>
                        <img src={data.data.icon} alt={data.data.label} style={{ width: 30 }} />
                    </div>
                    { data.data.label }
                </Button>
                <Handle type="source" position="right" isConnectable={isConnectable} />
            </Box>
        </div>
    );
});