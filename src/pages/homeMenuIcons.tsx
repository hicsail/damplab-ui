import React from "react";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import ViewStreamIcon from "@mui/icons-material/ViewStream";
import CampaignIcon from "@mui/icons-material/Campaign";
import BugReportIcon from "@mui/icons-material/BugReport";
import EditIcon from "@mui/icons-material/Edit";
import WorkHistoryIcon from "@mui/icons-material/WorkHistory";
import SchoolIcon from "@mui/icons-material/School";
import MonitorIcon from "@mui/icons-material/Monitor";
import PeopleIcon from "@mui/icons-material/People";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import InsightsIcon from "@mui/icons-material/Insights";
import SupervisorAccountOutlinedIcon from "@mui/icons-material/SupervisorAccountOutlined";
import ScienceIcon from "@mui/icons-material/Science";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import PlaceIcon from "@mui/icons-material/Place";
import PublicIcon from "@mui/icons-material/Public";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import type { HomeMenuItemId } from "./homeMenu";

/**
 * One icon per menu item. Typed as an exhaustive Record so adding an item to
 * `homeMenu.ts` without an icon is a compile error rather than a blank button.
 */
export const MENU_ICONS: Record<HomeMenuItemId, React.ReactNode> = {
  "notification-preferences": <NotificationsOutlinedIcon />,
  "order-services": (
    <AccountTreeIcon sx={{ transform: "rotate(90deg) scaleY(-1)" }} />
  ),
  catalog: <FormatListBulletedIcon />,
  "book-inventory": <EventAvailableIcon />,
  "learning-hub": <SchoolIcon />,
  bugs: <BugReportIcon />,
  "bug-backlog": <FormatListBulletedIcon />,
  "damplab-website": (
    <img src="/damp-white.svg" height="30px" alt="DAMP Logo" />
  ),
  jobs: <ViewStreamIcon />,
  "staff-submit-job": <SupervisorAccountOutlinedIcon />,
  "my-bench": <ScienceIcon />,
  "inventory-availability": <PrecisionManufacturingIcon />,
  "inventory-schedule": <EventAvailableIcon />,
  "release-notes": <FormatListBulletedIcon />,
  "catalog-inventory-editor": <EditIcon />,
  "protocol-library": <AccountTreeIcon />,
  "lab-layout": <PlaceIcon />,
  announcements: <CampaignIcon />,
  billing: <ReceiptLongIcon />,
  "ai-lab-assistant": <InsightsIcon />,
  "customer-management": <PeopleIcon />,
  "api-keys": <VpnKeyIcon />,
  "data-translation": <EditIcon />,
  "lab-monitor-north": <MonitorIcon />,
  "lab-monitor-south": <MonitorIcon />,
  "lab-status-tv": <MonitorIcon />,
};

/**
 * The drawer's overrides.
 *
 * `damplab-website` is a white SVG. That reads correctly on the home page, where it
 * sits on a filled primary-coloured button, and is invisible in the drawer, which is
 * a light surface. One substitution is cheaper than a second full icon map.
 */
const DRAWER_ICON_OVERRIDES: Partial<Record<HomeMenuItemId, React.ReactNode>> =
  {
    "damplab-website": <PublicIcon />,
  };

export function drawerIconFor(id: HomeMenuItemId): React.ReactNode {
  return DRAWER_ICON_OVERRIDES[id] ?? MENU_ICONS[id];
}
