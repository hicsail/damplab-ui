import type { UserProps } from '../contexts/UserContext';
import { ACCESS_TIERS } from '../constants/accessTiers';

/**
 * Apply the header's view-as selection to a user, returning what the UI should
 * render as if it were.
 *
 * Split out from `useEffectiveUser` as a plain function so it can be tested. This
 * package has no jsdom, so a hook cannot be exercised directly — but this is where
 * every decision lives, and "previewing as a technician shows the technician's
 * buttons" is exactly the property worth pinning.
 *
 * **A UI illusion, and it stays one.** The real JWT is untouched, so every
 * server-side gate still sees the caller's actual roles. This previews the
 * interface; it does not impersonate, and nothing here is a security boundary.
 */
export function applyPreview(
  userProps: UserProps | undefined | null,
  previewTier: string | null,
  previewsByTier: Record<string, string[] | undefined>
): UserProps | undefined | null {
  // Only a real administrator previews. Callers pass the *unmasked* user, which is
  // what stops a preview from nesting: an administrator previewing as Technician
  // must not then be treated as a technician who may preview further.
  if (!previewTier || !userProps?.isDamplabStaff) return userProps;

  const permissions = previewsByTier[previewTier];
  // The query has not resolved, or failed. Falling back to the administrator's own
  // view over-shows rather than hiding controls they actually hold — and the header
  // still reads as previewing, so the state is not silently lost.
  if (!permissions) return userProps;

  return {
    ...userProps,
    isDamplabStaff: previewTier === ACCESS_TIERS.Administrator,
    permissions,
  };
}
