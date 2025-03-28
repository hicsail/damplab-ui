import React, { useState, useContext } from "react";
import { CanvasContext } from "../contexts/Canvas";
import { Dialog, DialogTitle, TextField, Button, IconButton } from "@mui/material";
import { SaveOutlined } from '@mui/icons-material';
import AlertDialog from "./AlertDialog";

interface SaveDialogProps {
    openSnackbar: (value: string) => void;
    updateCurrentCanvas: (value: string) => void;
}

export default function SaveCanvasButton (props: SaveDialogProps )  {
    const { openSnackbar, updateCurrentCanvas } = props;
    
    // Open state for save dialog window
    const [ open, setOpen ] = useState(false);
    // Open state for alert dialog
    const [ alertOpen, setAlertOpen ] = useState(false);
    // Stores name that user types in
    const [fileName, setFileName] = useState('');

    const { nodes, edges } = useContext(CanvasContext);

    const saveFile = () => {
        let file = { fileName: fileName, nodes: nodes, edges: edges }

        // Apply prefix to filename for localStorage key
        const key = "canvas:" + fileName

        // Here, errors would appear once we start saving to a database
        try {
            localStorage.setItem(key, JSON.stringify(file));
            openSnackbar("Success: Your canvas was saved!")
        } catch (error) {
            openSnackbar("Error: Your canvas was not saved!");
        }
        
        updateCurrentCanvas(key);
        setOpen(false);
    };

    const handleSaveClick = () => {
        // Before saving the file, check to see if one with the same name exists; warn user.
        const key = "canvas:" + fileName;
        if (localStorage.getItem(key)) {
            setAlertOpen(true);
        } else {
            saveFile();
        }
    }

    const onAlertAccept = () => {
        // If user accepts, then save the file and close alert.
        saveFile();
        setAlertOpen(false);
    }

    return (
        <React.Fragment>
            <IconButton onClick={() => setOpen(true)} title="Save canvas" aria-controls='menu-appbar' aria-haspopup='true'>
                <SaveOutlined style={{color: 'white'}}/>
            </IconButton>
            <Dialog onClose={() => setOpen(false)} open={open}>
                <div style={{width: 300, height: 200, padding: 10}}>
                    <DialogTitle>Save Canvas</DialogTitle>
                    <div>
                        {/* Here, limit the user input to all uppercase letters for consistency */}
                        <TextField id="outlined-basic" label="File name" variant="outlined" sx={{'& input' : {textTransform: 'uppercase'}}} onChange={(e)=> setFileName(e.target.value.toUpperCase())}/>
                    </div>
                    <div style={{ margin: 20 }}>
                        {/* Button stays disabled until user types something */}
                        <Button disabled={fileName.length === 0} variant="contained" onClick={handleSaveClick}>Save</Button>
                    </div>
                </div>
            </Dialog>
            <AlertDialog
                open={alertOpen}
                onDeny={() => setAlertOpen(false)}
                onAccept={onAlertAccept}
                body="A file with this name already exists, overwrite it?"
            />
        </React.Fragment>
    );
}


