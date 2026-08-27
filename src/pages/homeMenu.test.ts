import { describe, expect, it } from 'vitest';
import { HOME_MENU, visibleHomeMenu, type HomeMenuUser } from './homeMenu';
import { PERMISSIONS, type PermissionName } from '../hooks/usePermissions';

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
      'Client Tools': ['My Jobs', 'Order Services', 'Catalog', 'Book Inventory', 'Learning Hub', 'Announcements', 'Bugs', 'Bug Backlog', 'DAMP Lab Website'],
      'Technician Tools': ['Jobs', 'Staff submit job', 'My Bench'],
      'Operational Tools': ['Inventory Availability', 'Inventory Schedule'],
      'Admin Operational Tools': ['Release Notes', 'Catalog & Inventory Editor', 'Protocol Library', 'Lab Layout', 'Edit Announcements', 'Billing', 'AI Lab Assistant'],
      'Admin Management Tools': ['Customer Management', 'API Keys', 'Data Translation', 'Lab Monitor North', 'Lab Monitor South', 'Lab Status TV'],
    });
  });

  it('has 27 buttons: the 26 from the re-sectioning, plus the announcements feed', () => {
    // 27th is Client Tools > Announcements, the read-only feed at /announcements.
    // Older announcements were previously unreachable — the home page shows only
    // the newest visible one and there was nowhere else to go.
    expect(HOME_MENU.flatMap((s) => s.items)).toHaveLength(27);
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
      'Client Tools': ['My Jobs', 'Order Services', 'Catalog', 'Learning Hub', 'Announcements', 'Bugs', 'DAMP Lab Website'],
      'Admin Operational Tools': ['Release Notes'],
    });
  });

  it('shows a technician their operational set, and Technician Tools without Staff submit job (Q7)', () => {
    expect(labelsBySection(TECHNICIAN)).toEqual({
      'Client Tools': ['My Jobs', 'Order Services', 'Catalog', 'Book Inventory', 'Learning Hub', 'Announcements', 'Bugs', 'Bug Backlog', 'DAMP Lab Website'],
      'Technician Tools': ['Jobs', 'My Bench'],
      'Operational Tools': ['Inventory Availability', 'Inventory Schedule'],
      'Admin Operational Tools': ['Release Notes', 'Catalog & Inventory Editor', 'Protocol Library', 'Lab Layout', 'AI Lab Assistant'],
      'Admin Management Tools': ['Lab Monitor North', 'Lab Monitor South'],
    });
  });

  it('shows an equipment user My Bench and the Inventory Schedule, per the matrix amendment', () => {
    expect(labelsBySection(EQUIPMENT_USER)).toEqual({
      'Client Tools': ['My Jobs', 'Order Services', 'Catalog', 'Book Inventory', 'Learning Hub', 'Announcements', 'Bugs', 'DAMP Lab Website'],
      // Q7 still holds: an equipment user may submit for a client, a technician may not.
      'Technician Tools': ['Staff submit job', 'My Bench'],
      'Operational Tools': ['Inventory Availability', 'Inventory Schedule'],
      'Admin Operational Tools': ['Release Notes'],
      'Admin Management Tools': ['Lab Monitor North', 'Lab Monitor South'],
    });
  });

  it('shows an administrator everything', () => {
    expect(visibleHomeMenu(STAFF).flatMap((s) => s.items)).toHaveLength(27);
  });

  it('gates each button on what its destination needs, not what its label resembles', () => {
    const all = HOME_MENU.flatMap((s) => s.items);
    // The two announcement buttons are the case this test exists for: the labels
    // are nearly identical and the permissions are not.
    const editor = all.find((i) => i.id === 'edit-announcements')!;
    expect(editor.visible(CLIENT)).toBe(false);
    expect(editor.visible(STAFF)).toBe(true);

    const feed = all.find((i) => i.id === 'announcements')!;
    // announcements:read is baseline, so everyone reaches the feed. The server
    // decides which rows they get.
    expect(feed.visible(CLIENT)).toBe(true);
    expect(feed.visible(STAFF)).toBe(true);
  });
});

describe('degraded mode: the permissions fetch failed', () => {
  it('falls back to the legacy staff boolean rather than hiding everything from staff', () => {
    const staffWithoutPermissions: HomeMenuUser = { permissions: [], permissionsLoaded: false, isDamplabStaff: true };
    expect(visibleHomeMenu(staffWithoutPermissions).flatMap((s) => s.items)).toHaveLength(27);
  });

  it('leaves a client with only the two unpermissioned buttons — the cost of the fallback, stated', () => {
    const clientWithoutPermissions: HomeMenuUser = { permissions: [], permissionsLoaded: false, isDamplabStaff: false };
    expect(labelsBySection(clientWithoutPermissions)).toEqual({
      'Client Tools': ['Order Services', 'DAMP Lab Website'],
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
