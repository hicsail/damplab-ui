import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink, useLocation } from 'react-router';

interface Crumb {
  label: string;
  to?: string;
}

/** Prettify an unknown path segment: "data_translation" -> "Data Translation". */
function pretty(s: string): string {
  return s
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** One-level, static routes -> label. */
const STATIC: Record<string, string> = {
  '/my_jobs': 'My Jobs',
  '/services-catalog': 'Services Catalog',
  '/admin/services-catalog': 'Services Catalog',
  '/book-inventory': 'Book Inventory',
  '/training': 'Learning Hub',
  '/checkout': 'Checkout',
  '/final_checkout': 'Final Checkout',
  '/staff_submit': 'Staff Submit Job',
  '/bugs': 'Bugs & Issues',
  '/lab-status-tv': 'Lab Status TV',
  '/lab-assistant': 'Lab Assistant',
  '/technician_bench': 'My Bench',
  '/inventory-calendar': 'Inventory Schedule',
  '/usage-billing': 'Usage Billing',
  '/dashboard': 'Jobs Dashboard',
  '/customer-management': 'Customer Management',
  '/api-keys': 'API Keys',
  '/inventory': 'Inventory Availability',
  '/edit': 'Catalog Editor',
  '/release_notes': 'Release Notes',
  '/edit_announcements': 'Announcements',
  '/data_translation': 'Data Translation',
  '/dominos': 'Dominos',
  '/elabs': 'ELabs',
  '/kernel': 'Kernel'
};

const EDIT: Crumb = { label: 'Catalog Editor', to: '/edit' };

/** Multi-level / dynamic routes -> explicit trail (below Home). Returns null if unmatched. */
function dynamicTrail(path: string): Crumb[] | null {
  let m: RegExpMatchArray | null;
  if ((m = path.match(/^\/edit\/services\/new$/))) return [EDIT, { label: 'New Service' }];
  if ((m = path.match(/^\/edit\/services\/([^/]+)\/parameters$/))) return [EDIT, { label: 'Edit Service', to: `/edit/services/${m[1]}` }, { label: 'Parameters' }];
  if ((m = path.match(/^\/edit\/services\/([^/]+)$/))) return [EDIT, { label: 'Edit Service' }];
  if ((m = path.match(/^\/edit\/bundles\/new$/))) return [EDIT, { label: 'New Bundle' }];
  if ((m = path.match(/^\/edit\/bundles\/([^/]+)$/))) return [EDIT, { label: 'Edit Bundle' }];
  if ((m = path.match(/^\/edit\/inventory\/new$/))) return [EDIT, { label: 'New Inventory Item' }];
  if ((m = path.match(/^\/edit\/inventory\/([^/]+)$/))) return [EDIT, { label: 'Edit Inventory Item' }];
  // Section keys are camelCase ("invoiceProcedures"); the dash makes pretty() split them.
  if ((m = path.match(/^\/edit\/sow-sections\/([^/]+)$/))) return [EDIT, { label: pretty(m[1].replace(/([A-Z])/g, '-$1')) }];
  if ((m = path.match(/^\/lab-monitor\/([^/]+)$/))) return [{ label: 'Lab Monitor' }, { label: pretty(m[1]) }];
  if ((m = path.match(/^\/technician_view\/([^/]+)$/))) return [{ label: 'Jobs Dashboard', to: '/dashboard' }, { label: 'Technician View' }];
  if ((m = path.match(/^\/jobs\/([^/]+)$/))) return [{ label: 'My Jobs', to: '/my_jobs' }, { label: 'Job' }];
  if ((m = path.match(/^\/client_view\/([^/]+)$/))) return [{ label: 'My Jobs', to: '/my_jobs' }, { label: 'Job Tracking' }];
  if ((m = path.match(/^\/resubmission\/([^/]+)$/))) return [{ label: 'Resubmission' }];
  if ((m = path.match(/^\/training\/(.+)$/))) return [{ label: 'Learning Hub', to: '/training' }, { label: pretty(m[1]) }];
  return null;
}

function buildCrumbs(pathname: string): Crumb[] {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return []; // already home — nothing to show
  const home: Crumb = { label: 'Home', to: '/' };
  const dyn = dynamicTrail(clean);
  if (dyn) return [home, ...dyn];
  if (STATIC[clean]) return [home, { label: STATIC[clean] }];
  return [home, { label: pretty(clean) }];
}

/**
 * App-wide breadcrumb bar. Rendered once by the authenticated layouts, so every
 * page gets a consistent trail back to Home (and to sensible parents) without
 * each page having to implement its own navigation.
 */
export default function AppBreadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname);
  if (crumbs.length === 0) return null;

  return (
    <Box
      sx={{
        px: { xs: 2, md: 3 },
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        position: 'sticky',
        top: 0,
        zIndex: 1100
      }}
    >
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const isHome = i === 0 && c.to === '/';
          if (isLast || !c.to) {
            return (
              <Typography key={i} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600, fontSize: 14 }}>
                {isHome && <HomeIcon fontSize="small" />}
                {c.label}
              </Typography>
            );
          }
          return (
            <Link
              key={i}
              component={RouterLink}
              to={c.to}
              underline="hover"
              color="inherit"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: 14 }}
            >
              {isHome && <HomeIcon fontSize="small" />}
              {c.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
}
