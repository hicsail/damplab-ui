import { useContext } from 'react';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import { ViewModeContext } from '../contexts/ViewModeContext';
import { RolePreviewContext } from '../contexts/RolePreviewContext';
import { applyPreview } from './effectiveUser';

/**
 * Returns user context as the header's view-as dropdown should see it: with
 * `permissions` swapped for the previewed tier's server-resolved list, and
 * `isDamplabStaff` forced false for any tier below Administrator.
 *
 * Swapping the permission list is not optional. `usePermissions` derives from this
 * hook, so without the swap the dropdown would have no effect on `can()` at all —
 * every staff-only control would stay visible while the header claimed otherwise.
 *
 * The lists come from the backend's `rolePreviews` query, never from a table here.
 * That is the same rule `myPermissions` follows and for the same reason: the two
 * packages share no code, so a local copy of the tier -> permission mapping would
 * drift from the one the guard actually enforces.
 *
 * `roles`, `customerCategory` and the two customer booleans deliberately pass
 * through unmasked. Nothing that gates UI reads `roles` — it is unread outside
 * `UserContext` itself — and the customer booleans are the *pricing* axis, which a
 * preview of the *access* axis has no business changing. Home's chips read those
 * booleans and `isDamplabStaff`, so they follow the preview where it applies and
 * stay put where it does not.
 *
 * **This is a UI illusion and stays one.** `ViewModeContext` is in-memory state and
 * the real JWT is untouched, so an administrator previewing as Client retains full
 * backend authority — every server-side gate still sees an administrator. It previews
 * the UI; it does not impersonate. Anything that must actually be denied is denied
 * server-side, as it always was.
 */
export function useEffectiveUser(): UserContextProps {
  const userContext = useContext(UserContext);
  const { previewTier } = useContext(ViewModeContext);
  const { previewsByTier } = useContext(RolePreviewContext);

  const userProps = applyPreview(userContext.userProps, previewTier, previewsByTier);
  if (userProps === userContext.userProps) return userContext;
  return { ...userContext, userProps: userProps as UserContextProps['userProps'] };
}
