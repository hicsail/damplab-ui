import React from "react";
import { Link as RouterLink } from "react-router";
import { Box, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BiotechOutlinedIcon from "@mui/icons-material/BiotechOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { DocsOnThisPage, DocsPageHeader, DocsSection } from "../../components/docs/DocsParts";
import { docsPage } from "./docsPages";

/**
 * /docs/about — About DAMPLab Canvas, for a general but technically curious reader.
 *
 * Sources: .devcycle/standing/context.md (what Canvas is), src/routes.ts and the
 * backend module list in docs/architecture/modules.md (what exists), the role
 * enum and role-permissions map in damplab-backend/src/auth (who uses it).
 *
 * Still to add, from the original outline — left out rather than guessed:
 *  - Videos: the PCL program playlist. No public link exists in the repos yet.
 *  - How Canvas compares with existing tools (LIMS, ELNs, ordering portals). Needs
 *    the lab's own framing; nothing in the repos states it.
 * When either goes in, update this page's summary in docsPages.ts to match.
 */

// ─── How a job moves through Canvas ─────────────────────────────────────────

const LIFECYCLE = [
  {
    title: "Design",
    body: "The client builds a workflow on the canvas: lab operations from the catalog, dragged in and connected in the order they should happen, each with its own settings.",
  },
  {
    title: "Submit",
    body: "The workflows are submitted together as a job, with any files and sample details they need.",
  },
  {
    title: "Review and agree",
    body: "Lab staff review the job, ask for changes if needed, and turn it into a statement of work — the scope, timeline and price — which the client and the lab both sign.",
  },
  {
    title: "Invoice",
    body: "Canvas produces the invoice from the agreed statement of work, priced for the client's customer category.",
  },
  {
    title: "Run",
    body: "Technicians carry out the work, following the linked protocols step by step, while the client follows progress and comments on the job page.",
  }
];

// ─── What is in Canvas ──────────────────────────────────────────────────────

const biosecurityPath = docsPage("biosecurity").path;
const resourcesPath = docsPage("resources").path;
const techStackPath = docsPage("tech-stack").path;

const CAPABILITIES: { icon: React.ReactNode; title: string; body: React.ReactNode }[] = [
  {
    icon: <AccountTreeOutlinedIcon />,
    title: "Workflow canvas",
    body: "A drag-and-drop editor for laboratory workflows. Each operation knows which others may follow it, so a workflow can only be wired together in ways the lab can actually carry out.",
  },
  {
    icon: <ViewListOutlinedIcon />,
    title: "Service catalog",
    body: "Every operation the lab offers — DNA assembly and cloning, PCR, assays, sequencing preparation, culturing and more — with its parameters, linked protocols and prices. Lab staff maintain it in Canvas, and it can be exported to and updated from a spreadsheet.",
  },
  {
    icon: <TableChartOutlinedIcon />,
    title: "Sample sheets",
    body: "Operations that act on many samples take a table of them, filled in on screen or uploaded as a spreadsheet, and priced per row where the lab charges that way.",
  },
  {
    icon: <DescriptionOutlinedIcon />,
    title: "Statements of work and invoices",
    body: "Signed statements of work and versioned invoices are kept with the job. Prices depend on the customer category, so internal and external customers each see their own rates.",
  },
  {
    icon: <MenuBookOutlinedIcon />,
    title: "Protocols at the bench",
    body: (
      <>
        Operations link to the lab's step-by-step protocols on protocols.io, which technicians follow and check off as
        they work. See{" "}
        <Link component={RouterLink} to={`${resourcesPath}#protocols`}>
          Code &amp; Protocols
        </Link>
        .
      </>
    ),
  },
  {
    icon: <CalendarMonthOutlinedIcon />,
    title: "Equipment and inventory",
    body: "Equipment can be booked by time and consumables by quantity, with lab approval. Lab screens show what is running at each station.",
  },
  {
    icon: <GppGoodOutlinedIcon />,
    title: "Biosecurity screening",
    body: (
      <>
        DNA sequences in an order are screened against known sequences of concern, and customers verify their identity.
        See{" "}
        <Link component={RouterLink} to={biosecurityPath}>
          Biosecurity
        </Link>
        .
      </>
    ),
  },
  {
    icon: <AutoAwesomeOutlinedIcon />,
    title: "AI assistants (WIP)",
    body: "An assistant on the canvas helps design workflows from a description, another answers questions about lab status, and incoming bug reports are sorted automatically.",
  },
  {
    icon: <BiotechOutlinedIcon />,
    title: "Running the lab",
    body: "Announcements, notifications by email or in the app, a library of training material, customer management, and in-app bug reporting.",
  },
];

// ─── Who uses it ────────────────────────────────────────────────────────────

const ROLES: { role: string; who: string; does: string }[] = [
  {
    role: "Client",
    who: "Researchers at Boston University and at outside organizations",
    does: "Design and submit jobs, sign statements of work, follow progress, pay invoices.",
  },
  {
    role: "Equipment user",
    who: "Trained exernal users of the lab's instruments",
    does: "Book and use equipment directly, without ordering a full service.",
  },
  {
    role: "Technician",
    who: "DAMP Lab staff carrying out the work",
    does: "Work through jobs at the bench, following protocols and recording progress.",
  },
  {
    role: "Administrator",
    who: "DAMP Lab staff managing the lab",
    does: "Review jobs, write statements of work, manage customers and pricing, edit the catalog, schedule and monitor the lab.",
  },
];

const CONTENTS = [
  { id: "what", label: "What Canvas is" },
  { id: "lifecycle", label: "How a job moves through Canvas" },
  { id: "capabilities", label: "What's in Canvas" },
  { id: "who", label: "Who uses it" },
  { id: "open", label: "Built in the open" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsAbout() {
  return (
    <>
      <DocsPageHeader
        slug="about"
        lead="DAMPLab Canvas is the web platform through which the DAMP Lab at Boston University takes on, runs and bills laboratory work — from the first sketch of an experiment to the final invoice."
      />

      <DocsOnThisPage items={CONTENTS} />

      <DocsSection id="what" title="What Canvas is">
        <Typography sx={{ maxWidth: 760, mb: 2 }}>
          The DAMP Lab (Design, Automation, Manufacturing and Processes) is a biofoundry: a shared facility that carries out
          molecular-biology work for researchers, such as DNA assembly and cloning, PCR, fluorescence-based assays,
          sequencing preparation and culturing. Researchers describe what they want done; the lab does it.
        </Typography>
        <Typography sx={{ maxWidth: 760, mb: 2 }}>
          Canvas is where that exchange happens. Instead of describing an experiment in an email or a spreadsheet, a
          researcher assembles it from the lab's catalog of operations on a visual canvas, with every setting the lab needs
          filled in. The same record then carries the job through review, the agreement on scope and price, the work at the
          bench, and billing — so the client and the lab are always looking at the same thing.
        </Typography>
        <Typography sx={{ maxWidth: 760 }}>
          Canvas is built by the Software &amp; Application Innovation Lab (SAIL) at Boston University's Hariri Institute
          for Computing, and is part of the NSF-funded Programmable Cloud Laboratories (PCL) program, which works toward a
          national network of remotely accessible cloud labs.
        </Typography>
      </DocsSection>

      <DocsSection
        id="lifecycle"
        title="How a job moves through Canvas"
        intro="A job is one request to the lab. It holds one or more workflows, and everything that follows — comments, files, the statement of work, results and invoices — stays attached to it."
      >
        <Box
          component="ol"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            alignItems: "stretch",
            gap: 1,
          }}
        >
          {LIFECYCLE.map((step, i) => (
            <React.Fragment key={step.title}>
              <Paper component="li" variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#456b6e" }}>{i + 1}</Typography>
                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{step.title}</Typography>
                <Typography sx={{ fontSize: 14 }}>{step.body}</Typography>
              </Paper>
              {i < LIFECYCLE.length - 1 && (
                <ArrowForwardIcon
                  aria-hidden
                  sx={{ color: "text.secondary", alignSelf: "center", transform: { xs: "rotate(90deg)", lg: "none" } }}
                />
              )}
            </React.Fragment>
          ))}
        </Box>
      </DocsSection>

      <DocsSection id="capabilities" title="What's in Canvas">
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" },
          }}
        >
          {CAPABILITIES.map((c) => (
            <Paper key={c.title} variant="outlined" sx={{ p: 2.5, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box sx={{ color: "#456b6e", display: "flex" }} aria-hidden>
                  {c.icon}
                </Box>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                  {c.title}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 14.5 }}>{c.body}</Typography>
            </Paper>
          ))}
        </Box>
      </DocsSection>

      <DocsSection
        id="who"
        title="Who uses it"
        intro="Everyone signs in through one login. A person's role decides which pages and actions are open to them, and every restriction is enforced by the server, not just by what the website shows."
      >
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" aria-label="Canvas roles">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "background.default" } }}>
                <TableCell scope="col" sx={{ width: "18%" }}>
                  Role
                </TableCell>
                <TableCell scope="col" sx={{ width: "32%" }}>
                  Who
                </TableCell>
                <TableCell scope="col">What they do in Canvas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ROLES.map((r) => (
                <TableRow key={r.role} sx={{ "& td, & th": { verticalAlign: "top", py: 1.25 } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    {r.role}
                  </TableCell>
                  <TableCell>{r.who}</TableCell>
                  <TableCell>{r.does}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DocsSection>

      <DocsSection id="open" title="Built in the open">
        <Typography sx={{ maxWidth: 760, mb: 2 }}>
          Canvas is open-source software under the MIT license. Its code, and the GraphQL schema that describes every piece
          of data it handles, are public on GitHub, and the lab's protocols are published on protocols.io — so another
          laboratory can inspect how Canvas works, or run its own copy.
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, maxWidth: 760, "& li": { mb: 0.75 } }}>
          <li>
            <Typography>
              <Link component={RouterLink} to={resourcesPath}>
                Code &amp; Protocols
              </Link>{" "}
              — the repositories, the GraphQL schema and the published protocols.
            </Typography>
          </li>
          <li>
            <Typography>
              <Link component={RouterLink} to={techStackPath}>
                Technology &amp; Cloud Infrastructure
              </Link>{" "}
              — the software Canvas is built from and where it runs.
            </Typography>
          </li>
          <li>
            <Typography>
              <Link component={RouterLink} to={biosecurityPath}>
                Biosecurity
              </Link>{" "}
              — how orders and customers are screened.
            </Typography>
          </li>
        </Box>
        <br />
        <Typography>
          If you're interested in learning more or running your own instance of Canvas, 
          please contact us: <a href="https://www.damplab.org/contact">https://www.damplab.org/contact</a>.
        </Typography>
      </DocsSection>

      <Typography sx={{ fontSize: 13, color: "text.secondary", borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
        Last reviewed October 2026.
      </Typography>
    </>
  );
}
