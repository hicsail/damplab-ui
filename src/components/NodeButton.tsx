import React from 'react'
import { Button } from '@mui/material';
import { RestaurantMenu } from '@mui/icons-material';

export default function NodeButton(data: any) {
    if (!data.node) return null;
    const node = data.node;
    const label = node.name;
    const icon = node.icon;

    return (
        <div>
            <Button variant="outlined" style={{ width: 163, display: 'flex', justifyContent: 'space-around', margin: 20 }}>
                <div>
                    <img src={icon} alt={label} style={{ width: 30 }} />
                </div>
                {label}
            </Button>
        </div>
    )
}
