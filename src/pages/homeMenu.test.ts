import { describe, expect, it } from 'vitest';
import { HOME_MENU, visibleHomeMenu, type HomeMenuUser } from './homeMenu';
import { PERMISSIONS, type PermissionName } from '../hooks/usePermissions';
import { applyPreview } from '../hooks/effectiveUser';
import { ACCESS_TIERS } from '../constants/accessTiers';

/**
 * These lists mirror `damplab-backend/src/auth/permissions/role-permissions.ts`.
 * The backend resolves them for real; here they stand in for what `myPermissions`
 * would return, so the menu can be checked per role without a server.
 */
const CLIENT_PERMISSIONS: PermissionName[] = [PERMISSIONS.JobsView, PERMISSIONS.CatalogView, PERMISSIONS.ReleaseNotesView, PERMISSIONS.AnnouncementsRead, PERMISSIONS.TrainingRead, PERMISSIONS.BugsReport];

const TECHNICIAN_PERMISSIONS: PermissionName[] = [
  ...CLIENT_PERMISSIONS,
  PERMISSIONS.JobsViewAll,
  PERMISSIONS.BugBacklogView,
  PERMISSIONS.CatalogEditorRead,
  PERMISSIONS.ProtocolLibraryRead,
  PERMISSIONS.ProtocolLibraryWrite,
  PERMISSIONS.LabLayoutRead,
  PERMISSIONS.InventoryRead,
  PERMISSIONS.InventoryBook,
  PERMISSIONS.InventorySchedule,
  PERMISSIONS.LabMonitorView,
  PERMISSIONS.BenchUse,
  // Amended after the transcription: technicians reach the AI Lab Assistant.
  PERMISSIONS.LabAssistantUse,
  PERMISSIONS.InternalFieldsRead,
];

const EQUIPMENT_USER_PERMISSIONS: PermissionName[] = [
  ...CLIENT_PERMISSIONS,
  PERMISSIONS.JobSubmitForClient,
  PERMISSIONS.InventoryRead,
  PERMISSIONS.InventoryBook,
  // Amended after the transcription: equipment users reach the Inventory Schedule
  // and My Bench. See docs/access-matrix.md, "Amendments to the transcription".
  PERMISSIONS.InventorySchedule,
  PERMISSIONS.BenchUse,
  PERMISSIONS.LabMonitorView
];

const user = (permissions: PermissionName[], isDamplabStaff = false): HomeMenuUser => ({ permissions, permissionsLoaded: true, isDamplabStaff });

const STAFF: HomeMenuUser = user(Object.values(PERMISSIONS), true);
const TECHNICIAN: HomeMenuUser = user(TECHNICIAN_PERMISSIONS);
const EQUIPMENT_USER: HomeMenuUser = user(EQUIPMENT_USER_PERMISSIONS);
const CLIENT: HomeMenuUser = user(CLIENT_PERMISSIONS);

const labelsBySection = (user: HomeMenuUser): Record<string, string[]> =>
  Object.fromEntries(visibleHomeMenu(user).map((s) => [s.title, s.items.map((i) => i.label)]));

/**
 * This is the spec for `damplab-backend/docs/access-matrix.md`'s "Homepage sections"
 * table. Section titles, button labels and their order all live here, so a rename or
 * a regrouping cannot land without a matching change to a reviewable list.
 */
describe('homepage sections match the access matrix', () => {
  it('groups every button under the right section, in order', () => {
    expect(HOME_MENU.map((s) => s.title)).toEqual(['Client Tools', 'Technician Tools', 'Operational Tools', 'Admin Operational Tools', 'Admin Management Tools']);

    expect(labelsBySection(STAFF)).toEqual({
      // "My Jobs" and "Jobs" merged into one button in Client Tools: the two pages
      // rendered the same component, and scope is enforced server-side now.
      'Client Tools': ['Jobs', 'Order Services', 'Catalog', 'Book Inventory', 'Learning Hub', 'Announcements', 'Notification Preferences', 'Bugs', 'Bug Backlog', 'DAMP Lab Website'],
      'Technician Tools': ['Staff submit job', 'My Bench'],
      'Operational Tools': ['Inventory Availability', 'Inventory Schedule'],
      // "Edit Announcements" is gone: /edit_announcements merged into /announcements,
      // whose editing controls are gated inside the page on announcements:write.
      'Admin Operational Tools': ['Release Notes', 'Catalog & Inventory Editor', 'Protocol Library', 'Lab Layout', 'Billing', 'AI Lab Assistant'],
      'Admin Management Tools': ['User Management', 'API Keys', 'Data Translation', 'Lab Monitor North', 'Lab Monitor South', 'Lab Status TV'],
    });
  });

  it('has 26 buttons', () => {
    // 25 until Notification Preferences arrived. Before that it was 26, then
    // "Edit Announcements" left when the editor merged into the feed, the same
    // way "My Jobs" left when the two jobs pages merged.
    expect(HOME_MENU.flatMap((s) => s.items)).toHaveLength(26);
  });

  it('has exactly one jobs button, keyed on the baseline permission', () => {
    // The merge's whole point: one page for both tiers, so one button. Two would
    // mean the split had come back.
    const jobsButtons = HOME_MENU.flatMap((s) => s.items).filter((i) => i.to === '/dashboard' || i.action === 'open-jobs-dashboard');
    expect(jobsButtons).toHaveLength(1);
    expect(jobsButtons[0].visible(CLIENT)).toBe(true);
  });

  it('gives every item a unique id', () => {
    const ids = HOME_MENU.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every item exactly one destination', () => {
    for (const item of HOME_MENU.flatMap((s) => s.items)) {
      const destinations = [item.to, item.href, item.action].filter(Boolean);
      expect(destinations, `${item.id} must declare exactly one of to/href/action`).toHaveLength(1);
    }
  });
});

/**
 * A walk of the access matrix, one role at a time. Section membership is fixed
 * (topical, not audience-scoped), so what changes per role is which buttons survive
 * and which whole sections therefore disappear.
 */
describe('what each role sees', () => {
  it('shows a plain client only the baseline buttons — no Book Inventory, no Bug Backlog', () => {
    expect(labelsBySection(CLIENT)).toEqual({
      'Client Tools': ['Jobs', 'Order Services', 'Catalog', 'Learning Hub', 'Announcements', 'Notification Preferences', 'Bugs', 'DAMP Lab Website'],
      'Admin Operational Tools': ['Release Notes'],
    });
  });

  it('shows a technician their operational set, and Technician Tools without Staff submit job (Q7)', () => {
    expect(labelsBySection(TECHNICIAN)).toEqual({
      'Client Tools': ['Jobs', 'Order Services', 'Catalog', 'Book Inventory', 'Learning Hub', 'Announcements', 'Notification Preferences', 'Bugs', 'Bug Backlog', 'DAMP Lab Website'],
      'Technician Tools': ['My Bench'],
      'Operational Tools': ['Inventory Availability', 'Inventory Schedule'],
      'Admin Operational Tools': ['Release Notes', 'Catalog & Inventory Editor', 'Protocol Library', 'Lab Layout', 'AI Lab Assistant'],
      'Admin Management Tools': ['Lab Monitor North', 'Lab Monitor South'],
    });
  });

  it('shows an equipment user My Bench and the Inventory Schedule, per the matrix amendment', () => {
    expect(labelsBySection(EQUIPMENT_USER)).toEqual({
      'Client Tools': ['Jobs', 'Order Services', 'Catalog', 'Book Inventory', 'Learning Hub', 'Announcements', 'Notification Preferences', 'Bugs', 'DAMP Lab Website'],
      // Q7 still holds: an equipment user may submit for a client, a technician may not.
      'Technician Tools': ['Staff submit job', 'My Bench'],
      'Operational Tools': ['Inventory Availability', 'Inventory Schedule'],
      'Admin Operational Tools': ['Release Notes'],
      'Admin Management Tools': ['Lab Monitor North', 'Lab Monitor South'],
    });
  });

  it('shows an administrator everything', () => {
    expect(visibleHomeMenu(STAFF).flatMap((s) => s.items)).toHaveLength(26);
  });

  it('gates each button on what its destination needs, not what its label resembles', () => {
    const all = HOME_MENU.flatMap((s) => s.items);

    // There is one Announcements button now, and it is keyed on the *baseline*
    // read permission. Re-adding a write-gated twin would mean the merge had come
    // undone: the page itself decides who sees the editing controls.
    expect(all.filter((i) => i.label.toLowerCase().includes('announcement'))).toHaveLength(1);

    const feed = all.find((i) => i.id === 'announcements')!;
    // announcements:read is baseline, so everyone reaches the page. The server
    // decides which rows they get, and announcements:write decides whether the
    // compose form and per-row controls render.
    expect(feed.to).toBe('/announcements');
    expect(feed.visible(CLIENT)).toBe(true);
    expect(feed.visible(STAFF)).toBe(true);

    // The property the removed pair used to demonstrate, kept on a surviving case:
    // "Catalog" and "Catalog & Inventory Editor" read alike and gate differently.
    const catalog = all.find((i) => i.id === 'catalog')!;
    const editor = all.find((i) => i.id === 'catalog-inventory-editor')!;
    expect(catalog.visible(CLIENT)).toBe(true);
    expect(editor.visible(CLIENT)).toBe(false);
    expect(editor.visible(STAFF)).toBe(true);
  });
});

describe('degraded mode: the permissions fetch failed', () => {
  it('falls back to the legacy staff boolean rather than hiding everything from staff', () => {
    const staffWithoutPermissions: HomeMenuUser = { permissions: [], permissionsLoaded: false, isDamplabStaff: true };
    expect(visibleHomeMenu(staffWithoutPermissions).flatMap((s) => s.items)).toHaveLength(26);
  });

  it('leaves a client with only the two unpermissioned buttons — the cost of the fallback, stated', () => {
    const clientWithoutPermissions: HomeMenuUser = { permissions: [], permissionsLoaded: false, isDamplabStaff: false };
    expect(labelsBySection(clientWithoutPermissions)).toEqual({
      'Client Tools': ['Order Services', 'Notification Preferences', 'DAMP Lab Website'],
    });
  });
});

describe('a section with nothing visible in it disappears', () => {
  it('drops Technician Tools and the management sections entirely for a plain client', () => {
    const titles = visibleHomeMenu(CLIENT).map((s) => s.title);
    expect(titles).not.toContain('Technician Tools');
    expect(titles).not.toContain('Operational Tools');
    expect(titles).not.toContain('Admin Management Tools');
  });

  it('never returns a section with zero items, for any role', () => {
    for (const actor of [STAFF, TECHNICIAN, EQUIPMENT_USER, CLIENT, {}]) {
      for (const section of visibleHomeMenu(actor)) {
        expect(section.items.length).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * The header's view-as dropdown, checked where it actually matters: the menu an
 * administrator sees while previewing must be the menu that tier really gets.
 *
 * `applyPreview` is exercised rather than `useEffectiveUser` because this package
 * has no jsdom — but the hook is a three-line wrapper that reads three contexts and
 * calls this, so every decision the preview makes is covered here.
 *
 * The permission lists are the fixtures above, standing in for what `rolePreviews`
 * returns. The backend computes them for real from the one shared table.
 */
describe('previewing the app as a lower access tier', () => {
  const PREVIEWS: Record<string, string[]> = {
    [ACCESS_TIERS.Technician]: TECHNICIAN_PERMISSIONS,
    [ACCESS_TIERS.EquipmentUser]: EQUIPMENT_USER_PERMISSIONS,
    [ACCESS_TIERS.Client]: CLIENT_PERMISSIONS,
  };

  const previewing = (tier: string): HomeMenuUser => applyPreview(STAFF as any, tier, PREVIEWS) as HomeMenuUser;

  it('shows an administrator exactly what each tier would see', () => {
    // The whole point of the feature. If these ever diverge, the preview is lying.
    expect(labelsBySection(previewing(ACCESS_TIERS.Technician))).toEqual(labelsBySection(TECHNICIAN));
    expect(labelsBySection(previewing(ACCESS_TIERS.EquipmentUser))).toEqual(labelsBySection(EQUIPMENT_USER));
    expect(labelsBySection(previewing(ACCESS_TIERS.Client))).toEqual(labelsBySection(CLIENT));
  });

  it('drops the staff boolean, so the degraded-mode fallback cannot leak admin buttons', () => {
    // `canFor` falls back to `isDamplabStaff` when permissions failed to load. If a
    // preview left that true, an administrator previewing as Client during a fetch
    // failure would still see every admin button.
    expect(previewing(ACCESS_TIERS.Client).isDamplabStaff).toBe(false);
    expect(previewing(ACCESS_TIERS.Technician).isDamplabStaff).toBe(false);
  });

  it('returns the real user untouched when nothing is being previewed', () => {
    expect(applyPreview(STAFF as any, null, PREVIEWS)).toBe(STAFF);
  });

  it('refuses to preview for anyone who is not really an administrator', () => {
    // Reads the *unmasked* user, so a preview cannot nest: an administrator
    // previewing as Technician must not then preview as an equipment user.
    expect(applyPreview(TECHNICIAN as any, ACCESS_TIERS.Client, PREVIEWS)).toBe(TECHNICIAN);
  });

  it('falls back to the administrator\'s own view when the preview list has not arrived', () => {
    // Over-showing beats hiding controls they hold; the header still reads as
    // previewing, so the state is visible rather than silently lost.
    expect(applyPreview(STAFF as any, ACCESS_TIERS.Technician, {})).toBe(STAFF);
  });
});
