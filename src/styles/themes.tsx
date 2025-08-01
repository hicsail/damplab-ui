import { createTheme, Typography, TypographyProps, PaletteColorOptions } from "@mui/material";
import { styled } from "@mui/material/styles";

export const bodyText = createTheme({
    typography: {
        fontSize: 16,
    },
});

// Extend the Palette interface
declare module '@mui/material/styles' {
  interface Palette {
    tertiary: Palette['primary'];
  }
  interface PaletteOptions {
    tertiary?: PaletteColorOptions;
  }
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#8fb5ba',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#e04462',
      contrastText: '#ffffff'
    },
    tertiary: {
    main: '#456b6e',
    contrastText: '#ffffff',
    },
    background: {
      default: '#f4f4f4',
      paper: '#ffffff',
    },
  },
});

export default theme;

// bodyText.typography.body2 = {};  // for variatn; use variant="body2"
export const StyledContainer = styled(Typography)<TypographyProps & {component: 'span' }>(({ theme }) => ({
    display: 'flex',
    justifyContent: 'space-between',
}));
