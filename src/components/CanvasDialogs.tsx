import { useState, useContext, useEffect } from "react";
import { CanvasContext } from "../contexts/Canvas";
import { Dialog, DialogTitle, TextField, Button, IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';

interface DialogProps {
    open: boolean;
    onClose: (value?: string) => void;
}

interface SaveDialogProps extends DialogProps {
    openSnackbar: (value: string) => void;
}

interface LoadDialogProps extends DialogProps {
    loadCanvas: (value: string) => void;
}

export const CanvasSaveDialog = (props: SaveDialogProps ) => {
    const { onClose, open, openSnackbar } = props;
    const [fileName, setFileName] = useState('');
    const { nodes, edges } = useContext(CanvasContext);

    // Proper exit: user clicked save - function saves to local storage
    const handleSave = () => {
        let file = {
            fileName: fileName,
            nodes: nodes,
            edges: edges,
        }

        // Apply prefix to filename for localStorage key
        const key = "canvas:" + fileName

        // If a canvas with this name already exists, prompt user if they want to overwrite it.
        if (localStorage.getItem(key) && !window.confirm(`Overwrite existing canvas file with name: ${fileName}?`)) {
            return;
        }

        // Here, errors would appear once we start saving to a database
        // In the error block we could use the data from error to display a helpful snackbar
        try {
            localStorage.setItem(key, JSON.stringify(file));
            openSnackbar("Success: Your canvas was saved!")
        } catch (error) {
            openSnackbar("Error: Your canvas was not saved!");
        }
        
        onClose(key);
    };

    return (
      <Dialog onClose={() => onClose()} open={open}>
        <div style={{width: 300, height: 200, padding: 10}}>
            <DialogTitle>Save Canvas</DialogTitle>
            <div>
                {/* Here, limit the user input to all uppercase letters for consistency */}
                <TextField id="outlined-basic" label="File name" variant="outlined" sx={{'& input' : {textTransform: 'uppercase'}}} onChange={(e)=> setFileName(e.target.value)}/>
            </div>
            <div style={{ margin: 20 }}>
                {/* Button stays disabled until user types something */}
                <Button disabled={fileName.length === 0} variant="contained" onClick={handleSave}>Save</Button>
            </div>
        </div>
      </Dialog>
    );
}

export const CanvasLoadDialog = (props: LoadDialogProps ) => {
    const { onClose, open, loadCanvas } = props;
    // Stores all of the canvas names stored in local storage
    const [canvasNames, setCanvasNames] = useState<string[]>([]);

    // Proper Exit: user selected a file to load
    const handleLoad = (fileName: any) => {
        loadCanvas(fileName);
        onClose(fileName);
    };

    // When dialog opens, update list of files.
    useEffect(() => {
        setCanvasNames(Object.keys(localStorage).filter(key => key.startsWith("canvas:")));
    }, [open])

    // Handles canvas deletion
    const deleteCanvas = (index: number) => {
        const currentCanvas = localStorage.getItem("CurrentCanvas");

        if (!window.confirm("Do you want to delete this canvas?")) return;

        // If currentCanvas is the canvas chosen for deletion, reset currentCanvas
        if (currentCanvas === canvasNames[index]) {
            localStorage.setItem("CurrentCanvas", "canvas:");
        }

        // Remove from localStorage and list of files in load dialog
        localStorage.removeItem(canvasNames[index]);
        setCanvasNames(canvasNames.filter((_, i) => i !== index));
    }
  
    return (
      <Dialog onClose={() => onClose()} open={open}>
        <DialogTitle>Load Canvas</DialogTitle>
        <div style={{width: 450, height: 200, padding: 10}}>
        {/* If no files were found, display a placeholder message. */}
        {canvasNames.length === 0 ? <div style={{display: 'flex', justifyContent: 'center'}}>Create and save your first canvas!</div> :
            (canvasNames.map((file, index) => {
                return (
                    <div key={index} style={{margin: 10, display: 'flex', justifyContent: 'space-between'}}>
                        {/* Display text starting at index 7 so the prefix "canvas:" isn't displayed */}
                        <Button variant="contained" onClick={()=> handleLoad(file)}>{file.substring(7)}</Button>
                        <IconButton onClick={() => {deleteCanvas(index)}} title="Delete canvas" aria-controls='menu-appbar' aria-haspopup='true'>
                            <DeleteIcon/>
                        </IconButton>
                    </div>
                )
            }))
        }
        </div>
      </Dialog>
    );
}

