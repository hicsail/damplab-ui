import React from "react";
import { Link as RouterLink } from "react-router";
import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { DOCS_INDEX_PATH, docsPage, type DocsPageSlug } from "../../pages/docs/docsPages";

/** Page heading for a docs page. The title comes from `docsPages.ts` so the index, nav and heading agree. */
export function DocsPageHeader({ slug, lead }: { slug: DocsPageSlug; lead?: React.ReactNode }) {
  const page = docsPage(slug);
  return (
    <Box component="header" sx={{ mb: 4 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: lead ? 1.5 : 0 }}>
        {page.title}
      </Typography>
      {lead && (
        <Typography variant="body1" sx={{ fontSize: "1.125rem", color: "text.secondary", maxWidth: 760 }}>
          {lead}
        </Typography>
      )}
    </Box>
  );
}

/** Body of a page that exists but has not been written yet. */
export function DocsComingSoon({ slug }: { slug: DocsPageSlug }) {
  const page = docsPage(slug);
  return (
    <>
      <DocsPageHeader slug={slug} lead={page.summary} />
      <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 760, display: "flex", gap: 2, alignItems: "flex-start" }}>
        <EditNoteIcon sx={{ color: "text.secondary", mt: 0.25 }} />
        <Box>
          <Typography variant="h6" component="p" sx={{ mb: 0.5 }}>
            This page is being written
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Check back soon. In the meantime, the other documentation pages are available from the menu.
          </Typography>
          <Button component={RouterLink} to={DOCS_INDEX_PATH} startIcon={<ArrowBackIcon />} variant="outlined" color="inherit">
            All documentation
          </Button>
        </Box>
      </Paper>
    </>
  );
}

/**
 * The four status labels from the DAMPLab Canvas technical documentation set
 * (Implemented / In migration / Proposed / Open decision), reworded for a
 * non-technical reader. Keep the mapping in `STATUS_LEGEND` if you change a label.
 */
export type DocsStatus = "today" | "moving" | "planned" | "undecided";

const STATUS_STYLE: Record<DocsStatus, { label: string; sx: object }> = {
  today: { label: "In use today", sx: { bgcolor: "#2e7d32", color: "#fff" } },
  moving: { label: "Moving as-is", sx: { bgcolor: "#01579b", color: "#fff" } },
  planned: { label: "Planned", sx: { bgcolor: "#456b6e", color: "#fff" } },
  undecided: { label: "Not yet decided", sx: { bgcolor: "transparent", color: "#9a3412", border: "1px solid #9a3412" } },
};

export const STATUS_LEGEND: { status: DocsStatus; meaning: string }[] = [
  { status: "today", meaning: "Exists and is running now." },
  { status: "moving", meaning: "Running now, and will move unchanged to the new environment." },
  { status: "planned", meaning: "Decided by the team, but not built yet." },
  { status: "undecided", meaning: "Still an open question." },
];

export function StatusChip({ status }: { status: DocsStatus }) {
  const { label, sx } = STATUS_STYLE[status];
  return <Chip size="small" label={label} sx={{ fontWeight: 600, height: 22, ...sx }} />;
}

/** A top-level section of a docs page, with an anchor so it can be linked to. */
export function DocsSection({
  id,
  title,
  status,
  intro,
  children,
}: {
  id: string;
  title: string;
  status?: DocsStatus;
  intro?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Box component="section" id={id} sx={{ mb: 7, scrollMarginTop: "calc(var(--app-header-height, 64px) + 16px)" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1.5 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {status && <StatusChip status={status} />}
      </Box>
      {intro && (
        <Typography sx={{ mb: 3, maxWidth: 760, color: "text.secondary" }}>
          {intro}
        </Typography>
      )}
      {children}
    </Box>
  );
}
