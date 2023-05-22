import { styled } from "@mui/material";

// Used with ColorlibStepIcon in DominosStepper to set custom icons/backgrounds
export const ColorlibStepIconRoot = styled('div')<{
    ownerState: { completed?: boolean; active?: boolean };
  }>(({ theme, ownerState }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#aaa',
    zIndex: 1,
    width: 65,              height: 65,
    display: 'flex',        justifyContent: 'center',   alignItems: 'center',
    borderRadius: '50%',    boxShadow: '0 4px 10px 0 rgba(0,0,0,.35)',
    ...(ownerState.active && {backgroundImage:
        'linear-gradient( 136deg, rgb(128,128,255) 0%, rgb(64,64,255) 50%, rgb(0,0,255) 100%)',
    }),
    ...(ownerState.completed && {backgroundImage:
        'linear-gradient( 136deg, rgb(0,255,0) 0%, rgb(32,128,32) 50%, rgb(64,128,64) 100%)',
    })
}));
