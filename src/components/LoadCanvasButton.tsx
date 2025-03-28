import React, { useState, useEffect } from "react";
import { Button, IconButton, Dialog, DialogTitle } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AlertDialog from "./AlertDialog";

interface LoadDialogProps {
    loadCanvas: (value: string) => void;
    areChangesUnsaved: () => boolean;
}

export default function LoadCanvasButton (props: LoadDialogProps ) {
    const { loadCanvas, areChangesUnsaved } = props;
    
    // State of load dialog
    const [ open, setOpen ] = useState(false);

    // State of warning alert along with its message
    const [ alertOpen, setAlertOpen ] = useState(false);
    const [ alertMessage, setAlertMessage ] = useState("");

    // Stores all of the canvas names stored in local storage to display to user
    const [ canvasNames, setCanvasNames ] = useState<string[]>([]);
    const [ indexToDelete, setIndexToDelete ] = useState<number | null>(null);
    
    const deleteAlert = "Are you sure you want to permanently delete this canvas?";
    const unsavedChangesAlert = "There are unsaved changes, continue to load another graph?";
   
    // Warn user for unsaved changes when they click load button.
    const openLoadDialog = () => { 
        if (areChangesUnsaved()) {
            handleAlertOpen(unsavedChangesAlert);
        } else {
            setOpen(true);
        }
    }

    // When load dialog is closed, load canvas if one was selected.
    const closeLoadDialog = (canvasName = "") => {
        if (canvasName !== "") loadCanvas(canvasName);
        setOpen(false);
    };

    // Warn user if they want to permanently delete their canvas.
    const handleClickDelete = (index: number) => {
        setIndexToDelete(index);
        handleAlertOpen(deleteAlert);
    }

    const handleAlertOpen = (message: string) => {
        setAlertMessage(message);
        setAlertOpen(true);
    }

    const handleAlertAccept = () => {
        if (alertMessage === unsavedChangesAlert) {
            // If the user wanted to continue after unsaved changes, open load dialog.
            setOpen(true);
        } else if (alertMessage === deleteAlert && indexToDelete !== null) {
            // If the user confirms on canvas delete warning, delete canvas.
            deleteCanvas(indexToDelete);
        }
        setAlertOpen(false);
    }

    const handleAlertDeny = () => {
        if (alertMessage === deleteAlert) {
            // If the user clicked no on the delete canvas alert, set indexToDelete to null.
            setIndexToDelete(null);
        }
        setAlertOpen(false);
    }

    // When dialog opens, update list of files.
    useEffect(() => {
        setCanvasNames(Object.keys(localStorage).filter(key => key.startsWith("canvas:")));
    }, [open])

    const deleteCanvas = (index: number) => {
        const currentCanvas = localStorage.getItem("CurrentCanvas");

        // If currentCanvas is the canvas chosen for deletion, reset currentCanvas
        if (currentCanvas === canvasNames[index]) {
            localStorage.setItem("CurrentCanvas", "canvas:");
        }

        // Remove from localStorage and list of files in load dialog
        localStorage.removeItem(canvasNames[index]);
        setCanvasNames(canvasNames.filter((_, i) => i !== index));
        setIndexToDelete(null);
    }
  
    return (
        <React.Fragment>
            <IconButton onClick={openLoadDialog} title="Load canvas" aria-controls='menu-appbar' aria-haspopup='true'>
                <UploadFileIcon style={{color: 'white'}}/>
            </IconButton>

            <Dialog onClose={() => closeLoadDialog()} open={open}>
                <DialogTitle>Load Canvas</DialogTitle>
                <div style={{width: 450, height: 200, padding: 10}}>
                {/* If no files were found, display a placeholder message. */}
                {canvasNames.length === 0 ? <div style={{display: 'flex', justifyContent: 'center'}}>Create and save your first canvas!</div> :
                    (canvasNames.map((file, index) => {
                        return (
                            <div key={index} style={{margin: 10, display: 'flex', justifyContent: 'space-between'}}>
                                {/* Display canvas name starting at index 7 so the prefix "canvas:" isn't displayed */}
                                <Button variant="contained" onClick={()=> closeLoadDialog(file)}>{file.substring(7)}</Button>
                                <IconButton onClick={() => {handleClickDelete(index)}} title="Delete canvas" aria-controls='menu-appbar' aria-haspopup='true'>
                                    <DeleteIcon/>
                                </IconButton>
                            </div>
                        )
                    }))
                }
                </div>
            </Dialog>
            <AlertDialog
                open={alertOpen}
                onAccept={handleAlertAccept}
                onDeny={handleAlertDeny}
                body={alertMessage}
            />
        </React.Fragment>
    );
}