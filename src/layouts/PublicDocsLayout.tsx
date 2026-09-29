import { Link as RouterLink, Outlet, useLocation } from "react-router";
import { Box, Breadcrumbs, Link, List, ListItemButton, ListItemText, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { DOCS_INDEX_PATH, DOCS_PAGES } from "../pages/docs/docsPages";

/**
 * Layout for the public documentation pages under /docs.
 *
 * Deliberately no auth check, unlike every other layout in this folder. Keycloak
 * initialises with `check-sso`, so an anonymous visitor renders here without being
 * sent to /login. Nothing under /docs may run a query that needs a signed-in user.
 *
 * It does not mount `AppBreadcrumbs`: that trail starts at Home ("/"), which bounces
 * an anonymous reader to the login page. The docs keep their own trail instead,
 * rooted at the docs index.
 *
 * `data-verbatim-text` opts the docs out of the Service -> Operation rewrite in
 * entry.client.tsx. These pages are written prose, and the rewrite would otherwise
 * turn "Amazon Web Services" into "Amazon Web Operations".
 */
export default function PublicDocsLayout() {
  const { pathname } = useLocation();
  const clean = pathname.replace(/\/+$/, "") || "/";
  const current = DOCS_PAGES.find((p) => p.path === clean);
  const onIndex = clean === DOCS_INDEX_PATH;

  return (
    <Box data-verbatim-text sx={{ maxWidth: 1200, mx: "auto", px: { xs: 0, md: 2 }, py: { xs: 2, md: 3 }, textAlign: "left" }}>
      {/* The index is the root of the trail, so it has nothing to show. */}
      {!onIndex && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 3, fontSize: 14 }}>
          <Link component={RouterLink} to={DOCS_INDEX_PATH} underline="hover" color="inherit">
            Documentation
          </Link>
          {current && (
            <Typography sx={{ fontWeight: 600, fontSize: 14 }} color="text.primary">
              {current.navLabel}
            </Typography>
          )}
        </Breadcrumbs>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px minmax(0, 1fr)" }, gap: { xs: 0, md: 5 } }}>
        <Box
          component="nav"
          aria-label="Documentation pages"
          sx={{
            display: { xs: "none", md: "block" },
            position: "sticky",
            top: "calc(var(--app-header-height, 64px) + 16px)",
            alignSelf: "start",
          }}
        >
          <List dense disablePadding>
            <ListItemButton component={RouterLink} to={DOCS_INDEX_PATH} selected={onIndex} sx={{ borderRadius: 1 }}>
              <ListItemText primary="Overview" primaryTypographyProps={{ fontWeight: onIndex ? 700 : 500 }} />
            </ListItemButton>
            {DOCS_PAGES.map((page) => {
              const selected = page.path === clean;
              return (
                <ListItemButton key={page.slug} component={RouterLink} to={page.path} selected={selected} sx={{ borderRadius: 1 }}>
                  <ListItemText
                    primary={page.navLabel}
                    secondary={page.ready ? undefined : "Coming soon"}
                    primaryTypographyProps={{ fontWeight: selected ? 700 : 500 }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        <Box component="main" sx={{ minWidth: 0 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
