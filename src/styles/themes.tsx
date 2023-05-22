import { Typography, createTheme } from "@mui/material";
import {styled} from "@mui/material/styles";

export const bodyText = createTheme({
    typography: {
        fontSize: 16,
    }, 
});
// bodyText.typography.body2 = {};  // for variatn; use variant="body2"
export const StyledContainer = styled(Typography)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between'  
}));
