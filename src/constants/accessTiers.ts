/**
 * The four access columns of the DAMPLab access matrix, mirrored from
 * `damplab-backend/src/auth/roles/access-tiers.ts`.
 *
 * Only the **strings** are duplicated, never the tier -> permission mapping. The UI
 * asks `rolePreviews` for the permission lists exactly as it asks `myPermissions` for
 * its own: the two packages share no code, so a copy of the table here would drift.
 * A typo in one of these values is a compile error at the call site, which is the
 * whole reason to list them.
 */
export const ACCESS_TIERS = {
  Administrator: 'ADMINISTRATOR',
  Technician: 'TECHNICIAN',
  EquipmentUser: 'EQUIPMENT_USER',
  Client: 'CLIENT'
} as const;

export type AccessTier = (typeof ACCESS_TIERS)[keyof typeof ACCESS_TIERS];

/** Labels, matching `TIER_LABEL` on the backend. */
export const ACCESS_TIER_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Administrator',
  TECHNICIAN: 'Technician',
  EQUIPMENT_USER: 'Equipment User',
  CLIENT: 'Client'
};

/**
 * The order the Customer Management select offers, most access first.
 *
 * Administrator is assignable here even though it is not previewable — promoting
 * someone is the point of the page, whereas previewing your own tier would be a
 * no-op. The two lists are different for that reason and should not be merged.
 */
export const ASSIGNABLE_ACCESS_TIERS: readonly AccessTier[] = [ACCESS_TIERS.Administrator, ACCESS_TIERS.Technician, ACCESS_TIERS.EquipmentUser, ACCESS_TIERS.Client];

/**
 * What each tier means, shown under the select so an admin is not guessing from a
 * name. Kept short deliberately; the matrix is the full answer.
 */
export const ACCESS_TIER_HINTS: Record<string, string> = {
  ADMINISTRATOR: 'Full access, including customer management and billing.',
  TECHNICIAN: 'All jobs, the catalog editor, protocol library and lab layout.',
  EQUIPMENT_USER: 'Own jobs, inventory booking and scheduling, My Bench.',
  CLIENT: 'The baseline every signed-in user has. Carries no access group.'
};
