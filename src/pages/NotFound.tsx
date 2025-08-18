import { Typography, Stack, Button } from '@mui/material';

export default function NotFound() {
  return (
    <Stack
      height="70vh"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      spacing={3}
      >

      <Typography variant="h1" sx={{ fontSize: "6rem", fontWeight: 700, letterSpacing: "0.1em" }}>
        404
      </Typography>

      <Typography
        variant="h2"
        sx={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.2em', marginTop: 1, marginBottom: 5 }}
      >
        PAGE NOT FOUND
      </Typography>

      <Button
        href="/"
        variant="outlined"
        sx={{ fontWeight: 700, letterSpacing: "0.15em", px: 4, py: 1.25 }}
      >
        BACK TO HOME
      </Button>
    </Stack>
  );
}
