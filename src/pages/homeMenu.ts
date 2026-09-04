import { PERMISSIONS, PermissionName, canFor } from "../hooks/usePermissions";

/**
 * The homepage menu, as data.
 *
 * Kept out of `Home.tsx` for two reasons. It is testable without a DOM — this
 * package has no jsdom or testing-library, so a rendered-component test is not
 * available. And it makes the section/label/visibility spec reviewable against
 * `damplab-backend/docs/access-matrix.md` in one screen.
 *
 * **Sections are topical, not audience-scoped.** "Client Tools" contains buttons a
 * plain client cannot use, and "Technician Tools" contains one a technician cannot.
 * Both come straight from the matrix; do not regroup to make the grouping and the
 * permissions agree.
 *
 * Each item is gated on the permission its **destination** needs, not on what its
 * label resembles.
 *
 * There is one Announcements button now, not two. `/announcements` and
 * `/edit_announcements` were merged into a single page whose editing controls are
 * gated on `announcements:write` inside the page, so the destination everyone needs
 * is the baseline `announcements:read`.
 *
 * Two items carry no permission at all and are visible to everyone by design:
 * Order Services (the canvas is public) and DAMP Lab Website (Q5 — an all-FALSE
 * matrix row means "not a permissioned app page", not "hide it"). That is
 * deliberate, not an omission.
 *
 * Note the two genuine narrowings here: Book Inventory and Bug Backlog are ungated
 * today and the matrix restricts both above Client. This is the one place the
 * "nothing is revoked" property of the rollout does not hold.
 */

export type HomeMenuItemId =
  | "order-services"
  | "catalog"
  | "book-inventory"
  | "learning-hub"
  | "bugs"
  | "bug-backlog"
  | "damplab-website"
  | "jobs"
  | "staff-submit-job"
  | "my-bench"
  | "inventory-availability"
  | "inventory-schedule"
  | "release-notes"
  | "catalog-inventory-editor"
  | "protocol-library"
  | "lab-layout"
  | "announcements"
  | "billing"
  | "ai-lab-assistant"
  | "customer-management"
  | "api-keys"
  | "data-translation"
  | "lab-monitor-north"
  | "lab-monitor-south"
  | "notification-preferences"
  | "lab-status-tv";

/** What a `visible` predicate is allowed to look at. */
export interface HomeMenuUser {
  permissions?: string[];
  permissionsLoaded?: boolean;
  isDamplabStaff?: boolean;
}

export interface HomeMenuItemDef {
  id: HomeMenuItemId;
  label: string;
  /** In-app route. Mutually exclusive with `href` and `action`. */
  to?: string;
  /** External destination, navigated via window.location. */
  href?: string;
  /**
   * Named handler the page supplies. `open-jobs-dashboard` awaits
   * markJobsFeedViewed() before navigating — turning it into a plain `to` would
   * silently drop that mutation.
   */
  action?: "open-jobs-dashboard";
  /** Renders the icon inside a Badge driven by this flag. */
  badge?: "jobs-feed-unseen";
  visible: (user: HomeMenuUser) => boolean;
}

export interface HomeMenuSectionDef {
  title: string;
  items: HomeMenuItemDef[];
}

/** No permission gates this item. See the note above about Q5. */
const everyone = (): boolean => true;

const needs =
  (permission: PermissionName) =>
  (user: HomeMenuUser): boolean =>
    canFor(user, permission);

export const HOME_MENU: readonly HomeMenuSectionDef[] = [
  {
    title: "Client Tools",
    items: [
      // One button for what used to be "My Jobs" (Client Tools) and "Jobs"
      // (Technician Tools). The two pages rendered the same component; scope is
      // enforced server-side now. Client Tools because the baseline holds jobs:view.
      //
      // The unseen-jobs badge rides along, but it is a jobs:view-all concept —
      // there is no shared feed for one client's own jobs — so Home skips the
      // query and the dot never shows below that permission.
      {
        id: "jobs",
        label: "Jobs",
        action: "open-jobs-dashboard",
        badge: "jobs-feed-unseen",
        visible: needs(PERMISSIONS.JobsView),
      },
      // The product is still called Canvas; only this button is renamed.
      {
        id: "order-services",
        label: "Order Services",
        to: "/canvas",
        visible: everyone,
      },
      {
        id: "catalog",
        label: "Catalog",
        to: "/services-catalog",
        visible: needs(PERMISSIONS.CatalogView),
      },
      {
        id: "book-inventory",
        label: "Book Inventory",
        to: "/book-inventory",
        visible: needs(PERMISSIONS.InventoryBook),
      },
      {
        id: "learning-hub",
        label: "Learning Hub",
        to: "/training",
        visible: needs(PERMISSIONS.TrainingRead),
      },
      {
        id: "announcements",
        label: "Announcements",
        to: "/announcements",
        visible: needs(PERMISSIONS.AnnouncementsRead),
      },
      {
        id: "notification-preferences",
        label: "Notification Preferences",
        to: "/notification-preferences",
        visible: everyone,
      },
      {
        id: "bugs",
        label: "Bugs",
        to: "/bugs",
        visible: needs(PERMISSIONS.BugsReport),
      },
      {
        id: "bug-backlog",
        label: "Bug Backlog",
        to: "/backlog",
        visible: needs(PERMISSIONS.BugBacklogView),
      },
      {
        id: "damplab-website",
        label: "DAMP Lab Website",
        href: "https://www.damplab.org/services",
        visible: everyone,
      },
    ],
  },
  {
    title: "Technician Tools",
    items: [
      // Q7: the matrix gives this to Equipment Users and not Technicians. It stays
      // filed here because the section is topical.
      {
        id: "staff-submit-job",
        label: "Staff submit job",
        to: "/staff_submit",
        visible: needs(PERMISSIONS.JobSubmitForClient),
      },
      {
        id: "my-bench",
        label: "My Bench",
        to: "/technician_bench",
        visible: needs(PERMISSIONS.BenchUse),
      },
    ],
  },
  {
    title: "Operational Tools",
    items: [
      {
        id: "inventory-availability",
        label: "Inventory Availability",
        to: "/inventory",
        visible: needs(PERMISSIONS.InventoryRead),
      },
      {
        id: "inventory-schedule",
        label: "Inventory Schedule",
        to: "/inventory-calendar",
        visible: needs(PERMISSIONS.InventorySchedule),
      },
    ],
  },
  {
    title: "Admin Operational Tools",
    items: [
      {
        id: "release-notes",
        label: "Release Notes",
        to: "/release_notes",
        visible: needs(PERMISSIONS.ReleaseNotesView),
      },
      {
        id: "catalog-inventory-editor",
        label: "Catalog & Inventory Editor",
        to: "/edit",
        visible: needs(PERMISSIONS.CatalogEditorRead),
      },
      {
        id: "protocol-library",
        label: "Protocol Library",
        to: "/protocol-map",
        visible: needs(PERMISSIONS.ProtocolLibraryRead),
      },
      {
        id: "lab-layout",
        label: "Lab Layout",
        to: "/stations",
        visible: needs(PERMISSIONS.LabLayoutRead),
      },
      {
        id: "billing",
        label: "Billing",
        to: "/usage-billing",
        visible: needs(PERMISSIONS.BillingView),
      },
      {
        id: "ai-lab-assistant",
        label: "AI Lab Assistant",
        to: "/lab-assistant",
        visible: needs(PERMISSIONS.LabAssistantUse),
      },
    ],
  },
  {
    title: "Admin Management Tools",
    items: [
      {
        id: "customer-management",
        label: "User Management",
        to: "/customer-management",
        visible: needs(PERMISSIONS.CustomersManage),
      },
      {
        id: "api-keys",
        label: "API Keys",
        to: "/api-keys",
        visible: needs(PERMISSIONS.ApiKeysManage),
      },
      {
        id: "data-translation",
        label: "Data Translation",
        to: "/data_translation",
        visible: needs(PERMISSIONS.DataTranslationUse),
      },
      {
        id: "lab-monitor-north",
        label: "Lab Monitor North",
        to: "/lab-monitor/north",
        visible: needs(PERMISSIONS.LabMonitorView),
      },
      {
        id: "lab-monitor-south",
        label: "Lab Monitor South",
        to: "/lab-monitor/south",
        visible: needs(PERMISSIONS.LabMonitorView),
      },
      {
        id: "lab-status-tv",
        label: "Lab Status TV",
        to: "/lab-status-tv",
        visible: needs(PERMISSIONS.LabStatusTvView),
      },
    ],
  },
];

/**
 * The sections to render for this user, with forbidden items removed and any
 * section left with nothing in it dropped.
 *
 * Dropping empty sections is required, not incidental: a client must not be shown an
 * "Admin Management Tools" heading above nothing. The old `MenuSection` rendered its
 * heading unconditionally, which was safe only because whole sections were gated
 * together.
 */
export function visibleHomeMenu(user: HomeMenuUser): HomeMenuSectionDef[] {
  return HOME_MENU.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.visible(user)),
  })).filter((section) => section.items.length > 0);
}
