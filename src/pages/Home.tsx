import React, { useContext } from 'react';
import { useNavigate, Navigate } from 'react-router';
import { useApolloClient } from '@apollo/client';
import { Badge, Box, Button, Chip, Stack, Typography } from '@mui/material';


import { UserContext, UserContextProps, UserProps } from "../contexts/UserContext";
import { useEffectiveUser } from "../hooks/useEffectiveUser";
import { ViewModeContext } from "../contexts/ViewModeContext";
import { MENU_ICONS } from "./homeMenuIcons";
import { useHomeMenuNavigate } from "../hooks/useHomeMenuNavigate";
import { ACCESS_TIER_LABELS } from "../constants/accessTiers";
import AnnouncementBox from '../components/AnnouncementBox';
import { HomeMenuItemDef, HomeMenuItemId, visibleHomeMenu } from './homeMenu';


function MenuButton({ onClick, navigateTo, children }: any) {
  const navigate = useNavigate();
  return (
    <Button
      variant="contained"
      onClick={onClick ? onClick : () => navigate(navigateTo)}
      sx={{
        width: '210px',
        minWidth: '210px',
        height: '72px',
        textTransform: 'none',
        alignItems: 'center',
      }}
    >
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {children[0]}
        <Box sx={{ width: '100%', lineHeight: 1.2 }}>{children.slice(1)}</Box>
      </Box>
    </Button>
  );
}

/**
 * Renders nothing at all when it has no children. Sections are mixed across roles
 * now, so an emptied section would otherwise leave a dangling orphan heading — a
 * client staring at "Admin Management Tools" above blank space.
 */
function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  if (React.Children.count(children) === 0) return null;
  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>{children}</Box>
    </Box>
  );
}

export default function Home() {
  const apolloClient = useApolloClient();
  const navigate = useNavigate();
  const userContext: UserContextProps = useContext(UserContext);
  const { userProps: effectiveUserProps } = useEffectiveUser();
  const userProps: UserProps = effectiveUserProps;
  const { previewTier } = useContext(ViewModeContext);
  // The Jobs click and its unseen badge are shared with the nav drawer, which renders
  // the same menu. See `useHomeMenuNavigate` for why Jobs is not an ordinary link.
  const { activate, hasUnseenJobs } = useHomeMenuNavigate();

  // Redirect to login if not authenticated
  if (!userProps?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  function logout() {
    apolloClient.resetStore();
    userContext.keycloak.logout();
  }

  const menuSections = visibleHomeMenu(userProps);

  const appellation = (userProps?.idTokenParsed as any)?.name || (userProps?.idTokenParsed as any)?.email || "DAMPLab User";

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: 'auto',
        p: 3,
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      {/* Top row: Welcome (left) + Logout (right) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          mb: 1,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          Welcome to DAMPLab
        </Typography>
        <Button variant="contained" color="secondary" onClick={logout}>
          Logout
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        Hello, {appellation}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        {/* `userProps` is the effective user, so the staff chip follows the header's
            view-as selection. The two customer chips do not: they are the pricing
            axis, which previewing an access tier has no business changing. */}
        {userProps.isDamplabStaff && <Chip label="DAMPLab Staff" />}
        {/* Without this, previewing as a lower tier reads as simply having fewer
            chips — indistinguishable from being that user for real. */}
        {previewTier && <Chip color="warning" variant="outlined" label={`Previewing as ${ACCESS_TIER_LABELS[previewTier] ?? previewTier}`} />}
        {userProps.isInternalCustomer && <Chip label="Internal Customer" />}
        {userProps.isExternalCustomer && <Chip label="External Customer" />}
      </Stack>

      {/* Navigation: sectioned menu + announcements */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 700px', minWidth: 320 }}>
          {menuSections.map((section) => (
            <MenuSection key={section.title} title={section.title}>
              {section.items.map((item) => (
                <MenuButton key={item.id} onClick={() => activate(item)}>
                  {item.badge === 'jobs-feed-unseen' ? (
                    <Badge color="error" variant="dot" overlap="circular" invisible={!hasUnseenJobs}>
                      {MENU_ICONS[item.id]}
                    </Badge>
                  ) : (
                    MENU_ICONS[item.id]
                  )}
                  {item.label}
                </MenuButton>
              ))}
            </MenuSection>
          ))}
        </Box>
        <AnnouncementBox />
      </Box>
    </Box>
  );
}
