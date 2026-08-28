import { useCallback } from 'react';
import { useNavigate } from 'react-router';
// `/index.js` rather than the bare specifier: this module is reached from `root.tsx`
// via HeaderBar, so it is part of the SSR bundle, where Apollo's CommonJS build has
// no named exports. Same reason `root.tsx` and `RolePreviewContext` do it.
import { useMutation, useQuery } from '@apollo/client/index.js';
import { JOBS_FEED_STATUS } from '../gql/queries';
import { MARK_JOBS_FEED_VIEWED } from '../gql/mutations';
import { PERMISSIONS, canFor } from './usePermissions';
import { useEffectiveUser } from './useEffectiveUser';
import type { HomeMenuItemDef } from '../pages/homeMenu';

/**
 * Turn a `homeMenu` item into the click it needs, plus the unseen-jobs flag.
 *
 * Shared by the home page and the nav drawer, which render the same menu. The Jobs
 * item carries `action: 'open-jobs-dashboard'` rather than a plain `to` because
 * opening it must first mark the shared feed as seen — treating it as an ordinary
 * link would silently drop that mutation and leave the badge stuck on. Two copies of
 * this dispatcher would mean two chances to get that wrong.
 *
 * The unseen badge is about the **shared** feed — every submitted job — so it is a
 * `jobs:view-all` concept. Both the query and the mutation require that permission,
 * so a client neither sees the dot nor 403s asking for it.
 *
 * Derived from `useEffectiveUser`, so the header's view-as dropdown reaches this too:
 * an administrator previewing as a client stops seeing the badge, as they should.
 */
export function useHomeMenuNavigate() {
  const navigate = useNavigate();
  const { userProps } = useEffectiveUser();
  const canViewAllJobs = canFor(userProps, PERMISSIONS.JobsViewAll);

  // Both callers use the same config. An earlier version let the drawer opt out of
  // polling to avoid a second timer, which was wrong twice over: `skip` returns
  // `undefined` rather than the cached value, so the drawer's badge could never
  // appear -- and Apollo dedupes the request anyway, so the timer cost nothing.
  const { data: jobsFeedData } = useQuery(JOBS_FEED_STATUS, {
    skip: !canViewAllJobs,
    pollInterval: 10000,
    fetchPolicy: 'network-only'
  });
  const [markJobsFeedViewed] = useMutation(MARK_JOBS_FEED_VIEWED);

  const openJobsDashboard = useCallback(async () => {
    if (canViewAllJobs) {
      try {
        await markJobsFeedViewed();
      } catch {
        // Navigate anyway. A failed bookkeeping call is not a reason to strand
        // someone on the page they clicked away from.
      }
    }
    navigate('/dashboard');
  }, [canViewAllJobs, markJobsFeedViewed, navigate]);

  const activate = useCallback(
    (item: HomeMenuItemDef) => {
      if (item.action === 'open-jobs-dashboard') return void openJobsDashboard();
      if (item.href) {
        window.location.href = item.href;
        return;
      }
      if (item.to) navigate(item.to);
    },
    [navigate, openJobsDashboard]
  );

  return { activate, openJobsDashboard, hasUnseenJobs: Boolean(jobsFeedData?.jobsFeedStatus?.hasUnseen), canViewAllJobs };
}
