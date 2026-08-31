import { useState, useEffect, useContext, useCallback } from "react";
import { Link, useLocation, useMatch, useNavigate } from "react-router";
import {
  AppBar,
  Button,
  Toolbar,
  Alert,
  Tooltip,
  Menu,
  MenuItem,
  ListItemText,
  Divider,
} from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import SupervisorAccountOutlinedIcon from "@mui/icons-material/SupervisorAccountOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import { CanvasContext } from "../contexts/Canvas";
import { UserContext } from "../contexts/UserContext";
import { ViewModeContext } from "../contexts/ViewModeContext";
import { RolePreviewContext } from "../contexts/RolePreviewContext";
import { ACCESS_TIER_LABELS } from "../constants/accessTiers";
import type { AccessTier } from "../constants/accessTiers";
import { useEffectiveUser } from "../hooks/useEffectiveUser";
import { PERMISSIONS, canFor } from "../hooks/usePermissions";
import AppNavDrawer from "./AppNavDrawer";
import LoadCanvasButton from "./LoadCanvasButton";
import SaveCanvasButton from "./SaveCanvasButton";
import NotificationBell from "./NotificationBell";
import "../styles/resubmit.css";

export default function HeaderBar() {
  const navigate = useNavigate();
  const isResubmitting = useMatch("resubmission/:id");
  // The job editor holds its own canvas state in a nested CanvasContext, which
  // this bar (rendered from root) cannot see. Its save/load/checkout controls
  // would therefore act on the user's *personal* canvas while they believe they
  // are editing a job, so they are hidden there; the editor carries its own
  // "Save changes" instead.
  const isJobEditing = useMatch("job_editor/:id");

  // If snackbarMessage starts with "Success", then the snackbar will be green, otherwise it will be red to show an error.
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const { setNodes, setEdges, nodes, edges } = useContext(CanvasContext);
  const { userProps: realUserProps } = useContext(UserContext);
  const { userProps } = useEffectiveUser();
  const { previewTier, setPreviewTier } = useContext(ViewModeContext);
  const { previews } = useContext(RolePreviewContext);
  // Gated on `customers:manage`, the same permission `rolePreviews` requires, so the
  // control and the query it depends on cannot disagree. Not the legacy
  // `isDamplabStaff` boolean: that was retired as a definition of "may do admin
  // things" precisely so there would be one answer to that question.
  //
  // `canFor` on the *unmasked* user rather than `can()`, which reads the masked one.
  // Using `can()` here would hide the dropdown the moment a preview dropped
  // `customers:manage` — and the dropdown is the only way back out of the preview.
  const isActualStaff = canFor(realUserProps, PERMISSIONS.CustomersManage);
  const isStaff = Boolean(userProps?.isDamplabStaff);
  const [viewMenuAnchor, setViewMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  // Collapsed by default. The canvas and the lab monitor want the full width, and a
  // panel that opens itself would be in the way more often than it helped.
  const [navOpen, setNavOpen] = useState(false);
  const windowLocation = useLocation();

  // This function is responsible for keeping currentCanvas up to date, it is called when user saves or loads a canvas.
  const updateCurrentCanvas = (canvasName = "") => {
    // If canvas name was provided and exists in local storage, update CurrentCanvas
    if (canvasName !== "" && localStorage.getItem(canvasName)) {
      localStorage.setItem("CurrentCanvas", canvasName);
    }
  };

  // When snackbar is opened, set its message and set open useState to true
  const handleSnackbarOpen = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  // When closing, don't erase the message or else the snackbar will change color while playing the closing animation.
  // Because of this, we simply set the snackbarOpen state to false
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const areChangesUnsaved = useCallback(() => {
    // This function only returns changes found on the canvas page. If the user is anywhere else return false.
    if (windowLocation.pathname !== "/canvas") {
      return false;
    }

    // Get the name of current work from local storage, or the default value if it's empty
    let currentCanvas = localStorage.getItem("CurrentCanvas") || "canvas:";

    // Extract saved nodes and edges from local storage.
    let { nodes: savedNodes, edges: savedEdges } = JSON.parse(
      localStorage.getItem(currentCanvas) || "{}",
    );

    if (currentCanvas === "canvas:" && (nodes.length > 0 || edges.length > 0)) {
      // Case 1: No canvas selected and there is content on the graph - Yes, changes are unsaved.
      return true;
    } else if (currentCanvas === "canvas:") {
      // Case 2: No canvas is selected and there is nothing on the graph - No changes made.
      return false;
    } else if (
      JSON.stringify(savedNodes) !== JSON.stringify(nodes) ||
      JSON.stringify(savedEdges) !== JSON.stringify(edges)
    ) {
      // Case 3: Current canvas content does not match saved content - Yes, changes are unsaved.
      return true;
    } else {
      // Case 4: If we are here, this means a canvas has been loaded - but no changes made.
      return false;
    }
  }, [edges, nodes, windowLocation]);

  const loadCanvasData = useCallback(
    (canvasName = "canvas:") => {
      // Update currentCanvas to new canvas
      updateCurrentCanvas(canvasName);

      // Attempt to load file, load empty object if nothing found
      let file = JSON.parse(localStorage.getItem(canvasName) || "{}");

      if (file.nodes) setNodes(file.nodes);
      if (file.edges) setEdges(file.edges);
    },
    [setNodes, setEdges],
  );

  // Checks to see the CurrentCanvas that is present in local storage. Only runs once on page load.
  useEffect(() => {
    const currentCanvas = localStorage.getItem("CurrentCanvas");

    // If not present, set key and exit
    if (!currentCanvas) {
      localStorage.setItem("CurrentCanvas", "");
      return;
    }

    // If canvas exists, load it into storage. Otherwise, reset current canvas as the canvas its referencing no longer exists.
    if (localStorage.getItem(currentCanvas)) {
      loadCanvasData(currentCanvas);
    } else {
      localStorage.setItem("CurrentCanvas", "");
    }
  }, [loadCanvasData]);

  // This hook is responsible for applying the event listener for browser close on the canvas page.
  useEffect(() => {
    const handleUnsavedWork = (event: BeforeUnloadEvent) => {
      if (areChangesUnsaved()) {
        event.preventDefault();
        event.returnValue = ""; // Required for older browsers to show dialog
      }
    };
    window.addEventListener("beforeunload", handleUnsavedWork);
    return () => {
      window.removeEventListener("beforeunload", handleUnsavedWork);
    };
  }, [areChangesUnsaved]);

  // Hide header on lab monitor screens (dedicated display, no nav)
  if (windowLocation.pathname.startsWith("/lab-monitor")) {
    return null;
  }

  return (
    <div>
      <AppBar position="fixed">
        <Toolbar style={{ background: "black" }}>
          <Tooltip title="Menu">
            <IconButton
              onClick={() => setNavOpen(true)}
              sx={{ color: "white", mr: 1 }}
              aria-label="Open navigation menu"
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>

          <Button
            onClick={() =>
              (window.location.href = "https://damplab.org/services")
            }
            style={{
              textDecoration: "none",
              color: "white",
              marginRight: "auto",
            }}
            sx={{ display: { xs: "none", md: "block" } }}
          >
            <img
              src="https://static.wixstatic.com/media/474df2_ec8549d5afb648c692dc6362a626e406~mv2.png/v1/fill/w_496,h_76,al_c,lg_1,q_85,enc_auto/BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png"
              style={{ width: 250 }}
              alt="BU_Damp_Lab_Subbrand_Logo_WEB_whitetype.png"
            />
          </Button>

          <Button
            onClick={() => navigate("/")}
            style={{
              textDecoration: "none",
              color: "white",
              textTransform: "none",
            }}
          >
            <img
              src="damp-white-text.svg"
              style={{ height: "45px" }}
              alt="DAMP Logo"
            />
            <span
              style={{
                marginLeft: "15px",
                fontSize: 21,
                fontWeight: "bold",
                color: "#8fb5ba",
                marginBottom: "-2px",
              }}
            >
              {" "}
              {/*cyan: #8fb5ba, pink: #e04462*/}
              Canvas
            </span>
            <span
              style={{ fontSize: 15, marginLeft: "10px", marginBottom: "-7px" }}
            >
              v1.0
            </span>
          </Button>

          <div
            style={{
              marginLeft: "auto",
              marginRight: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <NotificationBell />

            {isActualStaff && (
              <>
                <Tooltip
                  title={
                    previewTier
                      ? `Previewing the app as a ${ACCESS_TIER_LABELS[previewTier] ?? previewTier}. Your own access is unchanged.`
                      : "Preview the app as a lower access tier"
                  }
                >
                  <Button
                    onClick={(e) => setViewMenuAnchor(e.currentTarget)}
                    variant="outlined"
                    size="small"
                    startIcon={
                      previewTier ? <VisibilityOffIcon /> : <VisibilityIcon />
                    }
                    endIcon={<ArrowDropDownIcon />}
                    sx={{
                      color: previewTier ? "#ffa726" : "white",
                      borderColor: previewTier
                        ? "#ffa726"
                        : "rgba(255,255,255,0.5)",
                      textTransform: "none",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {previewTier
                      ? `${ACCESS_TIER_LABELS[previewTier] ?? previewTier} View`
                      : "Staff View"}
                  </Button>
                </Tooltip>
                <Menu
                  anchorEl={viewMenuAnchor}
                  open={Boolean(viewMenuAnchor)}
                  onClose={() => setViewMenuAnchor(null)}
                >
                  <MenuItem
                    selected={!previewTier}
                    onClick={() => {
                      setPreviewTier(null);
                      setViewMenuAnchor(null);
                    }}
                  >
                    <ListItemText
                      primary="Staff View"
                      secondary="Your own access"
                    />
                  </MenuItem>
                  <Divider />
                  {/* Server-provided, so the list cannot claim a tier the
                                    backend would resolve differently. Empty until the
                                    query lands, which leaves just "Staff View". */}
                  {previews.map((preview) => (
                    <MenuItem
                      key={preview.tier}
                      selected={previewTier === preview.tier}
                      onClick={() => {
                        setPreviewTier(preview.tier as AccessTier);
                        setViewMenuAnchor(null);
                      }}
                    >
                      <ListItemText
                        primary={`${preview.label} View`}
                        secondary="Preview only — your access is unchanged"
                      />
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}

            {isJobEditing ? null : (
              <>
                <LoadCanvasButton
                  loadCanvas={loadCanvasData}
                  areChangesUnsaved={areChangesUnsaved}
                />

                <SaveCanvasButton
                  openSnackbar={handleSnackbarOpen}
                  updateCurrentCanvas={updateCurrentCanvas}
                />

                {isResubmitting ? (
                  <Link
                    to={isStaff ? "/staff_submit" : "/checkout"}
                    className="a a--hover a--active"
                  >
                    Resubmit...
                  </Link>
                ) : (
                  <Button
                    onClick={() =>
                      navigate(isStaff ? "/staff_submit" : "/checkout")
                    }
                    title={
                      isStaff
                        ? "Staff: submit job for client (skip checkout review)"
                        : "Checkout"
                    }
                    variant="outlined"
                    size="small"
                    startIcon={
                      isStaff ? (
                        <SupervisorAccountOutlinedIcon />
                      ) : (
                        <ShoppingCartOutlinedIcon />
                      )
                    }
                    sx={{
                      color: "white",
                      borderColor: "rgba(255,255,255,0.5)",
                      textTransform: "none",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Checkout
                  </Button>
                )}
              </>
            )}
          </div>
        </Toolbar>
      </AppBar>
      <AppNavDrawer open={navOpen} onClose={() => setNavOpen(false)} />
      <Toolbar />
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarMessage.startsWith("Success") ? "success" : "error"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </div>
  );
}
