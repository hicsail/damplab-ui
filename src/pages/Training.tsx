import { Box, Card, CardContent, CardActionArea, Chip, Typography } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import BuildIcon from '@mui/icons-material/Build';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useNavigate } from 'react-router';

export default function Training() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <SchoolIcon color="primary" />
        <Typography variant="h4">Training & How‑To Guides</Typography>
        <Chip label="Beta" size="small" sx={{ ml: 1 }} />
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Short walkthroughs to help you get started with configuring DAMPLab services and designing jobs on the canvas.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/training/admin-edit')}>
              <CardContent sx={{ textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <BuildIcon color="primary" />
                  <Typography variant="h6">Admin: Creating Services & Bundles</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Learn how to configure services, parameters, pricing, categories, and bundles that power what users see on the canvas.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card sx={{ height: '100%' }}>
            <CardActionArea sx={{ height: '100%' }} onClick={() => navigate('/training/canvas')}>
              <CardContent sx={{ textAlign: 'left' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <AccountTreeIcon color="primary" />
                  <Typography variant="h6">Designing Jobs on the Canvas</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Step‑by‑step walkthrough of building workflows on the canvas, entering parameters, reviewing costs, and tracking submitted jobs.
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

