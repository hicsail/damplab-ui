import { Box, Card, CardContent, Chip, Divider, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import CategoryIcon from '@mui/icons-material/Category';
import LayersIcon from '@mui/icons-material/Layers';
import LinkIcon from '@mui/icons-material/Link';
import SettingsEthernetIcon from '@mui/icons-material/SettingsEthernet';
import TuneIcon from '@mui/icons-material/Tune';
import PaymentsIcon from '@mui/icons-material/Payments';
import ChecklistIcon from '@mui/icons-material/Checklist';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FunctionsIcon from '@mui/icons-material/Functions';

export default function TrainingAdminEdit() {
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BuildIcon color="primary" />
        <Typography variant="h4">Admin Training – Services, Categories & Bundles</Typography>
        <Chip label="Staff only" size="small" sx={{ ml: 1 }} />
      </Box>
      <Typography variant="body1" color="text.secondary">
        This guide explains how DAMPLab staff configure what appears on the workflow canvas: services, how they connect,
        and reusable bundles.
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>1. Navigating to the Admin Edit screen</Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <ChecklistIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Open Admin Edit from the Home page"
                secondary="From the home dashboard, click “Admin Edit (Edit Services)”. You must be logged in as DAMPLab staff to see this button."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Understand the three tabs"
                secondary="The Admin Edit screen has three main tabs: Services (individual building blocks), Categories (groups for the sidebar), and Bundles (pre‑built workflows)."
              />
            </ListItem>
          </List>

        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SettingsEthernetIcon color="primary" />
            <Typography variant="h6">2. Configuring services</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Services are the atomic steps that can be dragged onto the canvas.
          </Typography>

          <List dense>
            <ListItem>
              <ListItemIcon>
                <BuildIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Service name and description"
                secondary="Use a concise, user‑friendly name; the description should explain what the service does and any important assumptions (e.g., sample type, QC included)."
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <PaymentsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Pricing mode: Service vs Parameter‑based"
                secondary="Set pricing mode to 'Service price' when the cost is fixed per service; use 'Parameter‑based' when specific parameters (like number of samples or sequence length) should control pricing."
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <TuneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Defining parameters"
                secondary="Use the Parameters column to configure fields the user fills in on the canvas (e.g., sample name, read length). You can mark parameters as required, multi‑value, and optionally price them individually for parameter‑based pricing."
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <LinkIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Allowed connections"
                secondary="Use the Allowed Connections column to specify which downstream services this service can connect to. On the canvas, connections are validated using this list; it helps prevent invalid workflows."
              />
            </ListItem>

            <ListItem>
              <ListItemIcon>
                <ChecklistIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Deliverables"
                secondary="Optionally define deliverables (e.g., 'FASTQ files', 'QC report') so downstream documents like Statements of Work can clearly list what the lab will return."
              />
            </ListItem>
          </List>

        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FunctionsIcon color="primary" />
            <Typography variant="h6">3. Parameter & pricing details</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Parameters and pricing are tightly coupled: parameters capture what the user wants, and pricing mode defines
            whether those parameters influence cost.
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <TuneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Core parameter fields"
                secondary="Each parameter has a name, type (text, number, dropdown, etc.), description, and required flag. These drive which inputs appear on the canvas when a node is selected."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <TuneIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Multi‑value parameters"
                secondary="Allow multiple values when you expect users to list multiple items (e.g., multiple samples). On the canvas, users can add and remove rows for these parameters."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PaymentsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Parameter‑level pricing"
                secondary="For services with pricingMode='PARAMETER', individual parameters can carry a price. The system multiplies parameter price by the number of values (e.g., number of samples) to estimate node cost."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <InfoOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Pricing explanations"
                secondary="Use pricing explanation fields (where available) to describe how a price is calculated so users understand why a service costs more as they add parameters."
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CategoryIcon color="primary" />
            <Typography variant="h6">4. Organizing categories</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Categories determine how services are grouped in the sidebar on the canvas.
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <CategoryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Create clear, user‑friendly category labels"
                secondary="Examples: 'Sequencing', 'Cloning', 'QC & Analytics'. Avoid internal jargon where possible so external customers can navigate easily."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <SettingsEthernetIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Assign services to categories"
                secondary="Each category row allows you to select multiple services. Those services will appear grouped under that category in the canvas sidebar."
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LayersIcon color="primary" />
            <Typography variant="h6">5. Creating bundles (reusable workflows)</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Bundles allow staff to define common multi‑step workflows that users can drop onto the canvas as a starting point.
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon>
                <LayersIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Name the bundle clearly"
                secondary="Use names that describe the overall workflow, such as 'Whole‑genome sequencing prep' or 'Cloning and small‑scale expression'."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <ChecklistIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Select services in execution order"
                secondary="Choose the services that make up the bundle in the order you expect them to run; when dropped on the canvas, these will appear as a connected chain."
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}

