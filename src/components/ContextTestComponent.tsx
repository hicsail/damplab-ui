import React, { useContext } from 'react'
import { CanvasContext } from '../contexts/Canvas'

export default function ContextTestComponent() {

    const val = useContext(CanvasContext);

    return (
        <div>
            <h1>ContextTestComponent</h1>
            <p>CanvasContext: {val}</p>
        </div>
    )
}
