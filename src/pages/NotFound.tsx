import React from 'react';
import { Typography, Link } from '@mui/material';

export default function NotFound() {
  const containerStyle = {
    height: '70vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    padding: '0 16px',
    fontFamily: "'Poppins', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: '#333',
  };

  return (
    <div style={containerStyle}>
      <Typography
        variant="h1"
        sx={{ fontSize: '6rem', fontWeight: 700, letterSpacing: '0.1em', margin: 0 }}
      >
         404
      </Typography>

      <Typography
        variant="h2"
        sx={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.2em', marginTop: 1, marginBottom: 5 }}
      >
        PAGE NOT FOUND
      </Typography>

      <Link
        href="/"
        underline="none"
        sx={(theme) => ({
          fontWeight: 700,
          fontSize: '1rem',
          letterSpacing: '0.15em',
          color: theme.palette.primary.main,
          border: `2px solid ${theme.palette.primary.main}`,
          borderRadius: 1,
          px: 4,
          py: 1.25,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: theme.palette.primary.main,
            color: '#fff',
          },
        })}
      >
        BACK TO HOME
      </Link>
    </div>
  );
}
