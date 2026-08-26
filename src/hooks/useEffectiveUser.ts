import { useContext } from 'react';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import { ViewModeContext } from '../contexts/ViewModeContext';

/**
 * Returns user context as the staff "Client View" toggle should see it: with
 * `isDamplabStaff` forced false and `permissions` swapped for the server-resolved
 * `customerPermissions`.
 *
 * Swapping the permission list is not optional. `usePermissions` derives from this
 * hook, so without the swap the toggle would have no effect on `can()` at all —
 * every staff-only control would stay visible in Client View while the staff chip
 * disappeared.
 *
 * `roles` and `customerCategory` deliberately pass through unmasked; nothing that
 * gates UI reads them directly.
 *
 * This is a UI illusion and stays one. `ViewModeContext` is in-memory state, and the
 * real JWT still carries `damplab-staff`, so a staff user in Client View retains
 * full backend authority. It previews the UI; it does not impersonate.
 */
export function useEffectiveUser(): UserContextProps {
  const userContext = useContext(UserContext);
  const { isClientView } = useContext(ViewModeContext);

  if (!isClientView || !userContext.userProps?.isDamplabStaff) {
    return userContext;
  }

  return {
    ...userContext,
    userProps: {
      ...userContext.userProps,
      isDamplabStaff: false,
      permissions: userContext.userProps.customerPermissions ?? [],
    },
  };
}
