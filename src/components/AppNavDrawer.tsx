import { Box, Divider, Drawer, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography, Badge } from '@mui/material';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import { useHomeMenuNavigate } from '../hooks/useHomeMenuNavigate';
import { visibleHomeMenu, type HomeMenuItemDef } from '../pages/homeMenu';
import { drawerIconFor } from '../pages/homeMenuIcons';

/**
 * Every destination the home page offers, reachable from anywhere.
 *
 * The app had no persistent navigation: getting from the catalog to the lab monitor
 * meant going back to `/` first. This is that, in a drawer — **collapsed by default**,
 * because the canvas and the lab monitor want the full width and a panel that opens
 * itself would be in the way more often than not.
 *
 * The contents come from `visibleHomeMenu`, the same data the home page renders. Not
 * a second list: a nav menu that drifts from the home page is worse than no nav menu,
 * and the permission predicates live with the item definitions for exactly this
 * reason.
 *
 * `useEffectiveUser`, not `UserContext` — so the header's view-as dropdown reshapes
 * this too. An administrator previewing as a client sees a client's drawer.
 */
export default function AppNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userProps } = useEffectiveUser();
  const { activate, hasUnseenJobs } = useHomeMenuNavigate();

  const sections = visibleHomeMenu(userProps ?? {});

  const handleClick = (item: HomeMenuItemDef) => {
    activate(item);
    onClose();
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '85%', sm: 300 } } }}>
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="h6">Menu</Typography>
      </Box>
      <Divider />
      {sections.map((section) => (
        <List
          key={section.title}
          dense
          subheader={
            <ListSubheader disableSticky sx={{ fontWeight: 700, lineHeight: '32px' }}>
              {section.title}
            </ListSubheader>
          }
        >
          {section.items.map((item) => (
            <ListItemButton key={item.id} onClick={() => handleClick(item)}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.badge === 'jobs-feed-unseen' ? (
                  <Badge color="error" variant="dot" overlap="circular" invisible={!hasUnseenJobs}>
                    {drawerIconFor(item.id)}
                  </Badge>
                ) : (
                  drawerIconFor(item.id)
                )}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      ))}
    </Drawer>
  );
}
