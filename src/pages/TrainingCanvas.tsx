import { Box, Card, CardContent, Chip, Divider, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import MouseIcon from '@mui/icons-material/Mouse';
import LinkIcon from '@mui/icons-material/Link';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import DescriptionIcon from '@mui/icons-material/Description';
import CommentIcon from '@mui/icons-material/Comment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import CanvasNoConfigImg from '../../app-screenshots/CanvasNoConfig.png';
import CanvasParamsImg from '../../app-screenshots/CanvasParams.png';
import CanvasDragServiceImg from '../../app-screenshots/CanvasDragService.png';
import CanvasNotAllowedConnectionImg from '../../app-screenshots/CanvasNotAllowedConnection.png';
import CheckoutJobReviewImg from '../../app-screenshots/CheckoutJobReview.png';
import JobSubmissionImg from '../../app-screenshots/JobSubmission.png';
import JobTrackingImg from '../../app-screenshots/JobTracking.png';

export default function TrainingCanvas() {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountTreeIcon color="primary" />
        <Typography variant="h4">User Training – Designing Jobs on the Canvas</Typography>
        <Chip label="For all users" size="small" sx={{ ml: 1 }} />
      </Box>
      <Typography variant="body1" color="text.secondary">
        This guide walks through building a workflow on the canvas, entering parameters, reviewing costs, and tracking a submitted job.
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>1. Canvas layout overview</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <MouseIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Left sidebar – services and bundles"
                secondary="The left panel lists categories of services and any bundles defined by DAMPLab staff. You drag these onto the central canvas area."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <AccountTreeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Center – workflow canvas"
                secondary="This is where you place and connect services to form a workflow. Each node represents a service step."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Right panel – details and parameters"
                secondary="When you select a node, the right panel shows its parameters and any additional instructions you can provide to the lab."
              />
            </ListItem>
          </List>
          <Box
            component="img"
            src={CanvasNoConfigImg}
            alt="Blank canvas layout with bundles sidebar on the left and empty canvas in the middle"
            sx={{ mt: 2, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>2. Adding services and bundles</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <MouseIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Drag a single service"
                secondary="Click and drag a service from the left sidebar onto the canvas. A new node appears where you drop it."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <AccountTreeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Drop a bundle"
                secondary="Dragging a bundle creates multiple pre‑connected nodes representing a common workflow. You can still edit or delete individual nodes afterward."
              />
            </ListItem>
          </List>
          <Box
            component="img"
            src={CanvasDragServiceImg}
            alt="Canvas showing a service dragged from the sidebar onto the workflow area"
            sx={{ mt: 2, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>3. Connecting services (allowed connections)</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <LinkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Draw connections between nodes"
                secondary="Use the connection handles on a node to draw an arrow to the next service. This defines the order in which your samples move through the workflow."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="What are allowed connections?"
                secondary="Each service can specify which downstream services it is allowed to connect to. When you connect services on the canvas, the system uses those rules to help prevent invalid or unsupported workflows."
              />
            </ListItem>
          </List>
          <Box
            component="img"
            src={CanvasNotAllowedConnectionImg}
            alt="Canvas highlighting an invalid connection between services"
            sx={{ mt: 2, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            In this screenshot, the connection between two nodes is marked as not allowed, illustrating how the system enforces allowed connections configured by admins.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>4. Filling in parameters</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <TuneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Open node details"
                secondary="Click a node to see its parameters in the right panel. Required fields are typically marked or described in the parameter configuration."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TuneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Parameter types"
                secondary="Parameters can be simple text, numbers, dropdowns with options, or multi‑value lists. Some services also use parameter‑level pricing, where cost is calculated from these values."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Multi‑value parameters"
                secondary="When a parameter allows multiple values, you can add or remove entries (for example, listing multiple samples) directly in the node’s parameter table."
              />
            </ListItem>
          </List>
          <Box
            component="img"
            src={CanvasParamsImg}
            alt="Right-hand parameters panel for a selected node on the canvas"
            sx={{ mt: 2, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>5. Saving, reviewing, and submitting</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <SaveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Save your canvas"
                secondary="Use the Save button in the top header to store your current canvas. You can load saved canvases later for reuse or modification."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ShoppingCartOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Go to Checkout"
                secondary="When your workflow is ready, click the cart icon in the header or the Checkout button to see a per‑service cost breakdown and total estimated price."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DescriptionIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Final Checkout"
                secondary="On the Final Checkout screen, add a job name, verify your contact details, provide any additional notes, and optionally attach supporting documents before submitting."
              />
            </ListItem>
          </List>
          <Box
            component="img"
            src={CheckoutJobReviewImg}
            alt="Checkout page showing job review and cost summary"
            sx={{ mt: 2, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
          <Box
            component="img"
            src={JobSubmissionImg}
            alt="Final checkout page with job submission form and notes"
            sx={{ mt: 2, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>6. Tracking jobs and adding documents</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CommentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Track job status"
                secondary="After submitting, use My Jobs or the tracking link to open the Job Tracking page. You’ll see the job state, workflows, and any associated SOW."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CloudUploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Use comments for follow‑ups"
                secondary="In the Comments section, you can post questions or clarifications and attach additional documents (protocols, data files) that the lab can see while processing your job."
              />
            </ListItem>
          </List>
          <Box
            component="img"
            src={JobTrackingImg}
            alt="Job Tracking page showing status banner, attachments, and comments"
            sx={{ mt: 2, width: '100%', height: 'auto', objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

