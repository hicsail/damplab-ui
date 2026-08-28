/**
 * The four columns of `damplab-backend/docs/access-matrix.md`, as an audience a
 * notice can be addressed to.
 *
 * Mirrors the backend's `AnnouncementAudience` enum — the strings only. Deliberately
 * its own vocabulary rather than the permission list: "who should read this" is an
 * editorial question, not an authorization one, and tying the picker to permissions
 * would mean every new permission turned up as a checkbox.
 *
 * Order is most-privileged first, matching how the backend declares the enum.
 */
export const AUDIENCE_OPTIONS = ['ADMINISTRATOR', 'TECHNICIAN', 'EQUIPMENT_USER', 'CLIENT'] as const;

export type Audience = (typeof AUDIENCE_OPTIONS)[number];

export const AUDIENCE_LABELS: Record<string, string> = {
  ADMINISTRATOR: 'Administrators',
  TECHNICIAN: 'Technicians',
  EQUIPMENT_USER: 'Equipment users',
  CLIENT: 'Clients'
};

/**
 * The default for a new notice: everyone.
 *
 * Sent explicitly rather than as the empty list. Empty *also* means "everyone" on a
 * stored row — that is what let this field ship without a migration — but it has to
 * keep meaning only "written before audiences existed", which is why the server
 * rejects an empty list outright. Naming all four says the same thing without
 * overloading the legacy encoding, and it is what makes widening a targeted notice
 * back to everyone expressible at all: an edit sending `undefined` means "leave
 * unchanged", so there was previously no way to undo targeting.
 */
export const ALL_AUDIENCES: string[] = [...AUDIENCE_OPTIONS];
