import React from "react";
import { Link as RouterLink } from "react-router";
import {
  Box,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import CodeIcon from "@mui/icons-material/Code";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import StorageIcon from "@mui/icons-material/Storage";
import WebIcon from "@mui/icons-material/Web";
import { DocsPageHeader, DocsSection, STATUS_LEGEND, StatusChip, type DocsStatus } from "../../components/docs/DocsParts";
import { docsPage } from "./docsPages";

/**
 * /docs/tech-stack — Technology & Cloud Infrastructure, for a non-technical reader.
 *
 * Sources, so the next edit can be checked against them:
 *  - "DAMPLab Canvas — 01 Infrastructure & Platform Architecture" (v1.0 draft,
 *    17 Sep 2026) and its briefing deck, for the current state, the proposed PCL
 *    environment, migration phases and open decisions. Status chips follow that
 *    document's labels (see STATUS_LEGEND in DocsParts).
 *  - ops/README.md, ops/docker-compose.*.yml and CLAUDE.md in this repo, and the
 *    AWS account itself (EC2 names and sizes, us-east-1), for the resources in use.
 *
 * Deliberately left out because this page is public: instance IDs, IP addresses,
 * VPC/subnet IDs, S3 bucket names, backend hostnames, and which server hosts what
 * beyond the app itself. Keep it that way.
 */

// ─── Reusable diagram pieces ────────────────────────────────────────────────

function Tile({ label, caption, muted }: { label: string; caption?: string; muted?: boolean }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1.5,
        bgcolor: muted ? "background.default" : "#e8f1f2",
        border: "1px solid",
        borderColor: muted ? "divider" : "#b9d3d6",
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{label}</Typography>
      {caption && (
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.35, mt: 0.25 }}>{caption}</Typography>
      )}
    </Box>
  );
}

function Zone({
  title,
  caption,
  dashed,
  children,
}: {
  title: string;
  caption?: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        border: dashed ? "1.5px dashed" : "1px solid",
        borderColor: dashed ? "#8fb5ba" : "divider",
        borderRadius: 2,
        p: { xs: 1.5, md: 2 },
        bgcolor: dashed ? "transparent" : "background.paper",
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14.5 }}>{title}</Typography>
      {caption && <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>{caption}</Typography>}
      {!caption && <Box sx={{ mb: 1.5 }} />}
      {children}
    </Box>
  );
}

const tileGrid = (min: number) => ({
  display: "grid",
  gap: 1,
  gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
});

// ─── How Canvas fits together ───────────────────────────────────────────────

const FLOW = [
  { label: "You", caption: "in a web browser" },
  { label: "Canvas website", caption: "what you see and click" },
  { label: "Canvas engine", caption: "checks, calculates, saves" },
  { label: "Database", caption: "where everything is kept" },
];

function FlowDiagram() {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1,
        }}
      >
        {FLOW.map((step, i) => (
          <React.Fragment key={step.label}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Tile label={step.label} caption={step.caption} muted={i === 0} />
            </Box>
            {i < FLOW.length - 1 && (
              <ArrowForwardIcon
                aria-hidden
                sx={{ color: "text.secondary", alignSelf: "center", transform: { xs: "rotate(90deg)", sm: "none" } }}
              />
            )}
          </React.Fragment>
        ))}
      </Box>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 2, mb: 1 }}>
        Working alongside them:
      </Typography>
      <Box sx={tileGrid(180)}>
        <Tile label="Sign-in service" caption="confirms who you are and what you may do" muted />
        <Tile label="Automation & AI helpers" caption="connect Canvas to other tools" muted />
        <Tile label="Connected services" caption="protocols, biosecurity, email, files" muted />
      </Box>
    </Paper>
  );
}

// ─── The building blocks ────────────────────────────────────────────────────

interface BuildingBlock {
  icon: React.ReactNode;
  name: string;
  tagline: string;
  body: React.ReactNode;
  tech: string;
}

const graphqlPath = docsPage("graphql").path;
const biosecurityPath = docsPage("biosecurity").path;

const BUILDING_BLOCKS: BuildingBlock[] = [
  {
    icon: <WebIcon />,
    name: "The Canvas website",
    tagline: "What you see and click",
    body: "Runs in your web browser, so there is nothing to install. Clients design workflows on the canvas, submit them as jobs and follow their progress; lab staff review, schedule and run the work.",
    tech: "React · Material UI · served by nginx",
  },
  {
    icon: <SettingsSuggestOutlinedIcon />,
    name: "The Canvas engine",
    tagline: "The work behind the scenes",
    body: (
      <>
        When you press a button, the website sends a request to the engine. It checks that you are allowed to do it,
        works out prices, moves jobs through their stages and saves the result. The requests are written in a language
        called{" "}
        <Link component={RouterLink} to={graphqlPath}>
          GraphQL
        </Link>
        .
      </>
    ),
    tech: "NestJS (TypeScript) · GraphQL",
  },
  {
    icon: <StorageIcon />,
    name: "The database",
    tagline: "The filing cabinet",
    body: "Holds the service catalog, workflows, jobs, statements of work, invoices, comments and lab inventory.",
    tech: "MongoDB 7",
  },
  {
    icon: <BadgeOutlinedIcon />,
    name: "Sign-in and permissions",
    tagline: "The front desk",
    body: "One login for everyone. Once you are signed in, your role (client, equipment user, technician or administrator) decides which pages and actions are open to you.",
    tech: "Keycloak 26 (open source)",
  },
  {
    icon: <HubOutlinedIcon />,
    name: "Automation and AI helpers",
    tagline: "Connecting Canvas to everything else",
    body: "Links Canvas to other tools and runs the AI assistants already in use: help designing workflows, answers about lab status, and sorting incoming bug reports. Because they live outside Canvas, they can be improved without changing Canvas itself.",
    tech: "n8n (open source, self-hosted)",
  },
  {
    icon: <FolderOpenIcon />,
    name: "File storage",
    tagline: "Attachments and backups",
    body: "Files attached to jobs and bug reports, and backup copies of the live database, are kept in Amazon's cloud file storage.",
    tech: "Amazon S3",
  },
  {
    icon: <MailOutlineIcon />,
    name: "Email notifications",
    tagline: "Keeping people informed",
    body: "Sends notification emails, such as updates about activity on a job.",
    tech: "Mailgun",
  },
  {
    icon: <ExtensionOutlinedIcon />,
    name: "Connected services",
    tagline: "Specialist outside services",
    body: (
      <>
        protocols.io supplies laboratory protocols. SecureDNA and Aclid screen DNA orders and verify customers (see{" "}
        <Link component={RouterLink} to={biosecurityPath}>
          Biosecurity
        </Link>
        ). ClickUp holds the development team's bug backlog.
      </>
    ),
    tech: "protocols.io · SecureDNA · Aclid · ClickUp",
  },
  {
    icon: <CodeIcon />,
    name: "Code and releases",
    tagline: "How updates are built",
    body: "All code is kept on GitHub. Approved changes are automatically packaged into containers (sealed, ready-to-run bundles), stored on Docker Hub, and tried on the test server before they reach the live site.",
    tech: "GitHub · GitHub Actions · Docker · Docker Hub",
  },
];

function BuildingBlocks() {
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" } }}>
      {BUILDING_BLOCKS.map((block) => (
        <Paper key={block.name} variant="outlined" sx={{ p: 2.5, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ color: "#456b6e", display: "flex" }} aria-hidden>
              {block.icon}
            </Box>
            <Box>
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                {block.name}
              </Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{block.tagline}</Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: 14.5, flex: 1 }}>{block.body}</Typography>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary", borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
            {block.tech}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}

// ─── Where Canvas runs today ────────────────────────────────────────────────

const TODAY_SERVERS = [
  {
    title: "Test server (staging)",
    name: "damplab-canvas",
    spec: "Amazon EC2 t2.small · 1 virtual CPU · 2 GB memory",
    purpose: "Where new changes are tried out before release.",
    runs: ["Canvas website", "Canvas engine", "Database"],
  },
  {
    title: "Live server (production)",
    name: "damplab-canvas-prod",
    spec: "Amazon EC2 t3.small · 2 virtual CPUs · 2 GB memory",
    purpose: "The site people use, at damplab-canvas.sail.codes.",
    runs: ["Canvas website", "Canvas engine", "Database", "Weekly database backup"],
  },
];

function TodayDiagram() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Zone dashed title="SAIL's AWS account" caption="Amazon Web Services · US East (N. Virginia) region">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          {TODAY_SERVERS.map((server) => (
            <Zone key={server.name} title={server.title} caption={server.purpose}>
              <Typography sx={{ fontFamily: "monospace", fontSize: 13.5, fontWeight: 600 }}>{server.name}</Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 1.5 }}>{server.spec}</Typography>
              <Box sx={tileGrid(130)}>
                {server.runs.map((r) => (
                  <Tile key={r} label={r} />
                ))}
              </Box>
            </Zone>
          ))}
        </Box>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 2, mb: 1 }}>Shared by both servers:</Typography>
        <Box sx={tileGrid(200)}>
          <Tile label="Sign-in (Keycloak)" caption="one setup for test and live" />
          <Tile label="File storage (Amazon S3)" caption="attachments and backups" />
          <Tile label="Automation & AI (n8n)" caption="shared with other SAIL projects" />
        </Box>
      </Zone>
      <Zone title="Outside AWS">
        <Box sx={tileGrid(180)}>
          <Tile label="Cloudflare" caption="web addresses and traffic protection" muted />
          <Tile label="GitHub" caption="source code, SAIL organization" muted />
          <Tile label="Docker Hub" caption="packaged releases, SAIL organization" muted />
          <Tile label="Mailgun" caption="notification email" muted />
          <Tile label="ClickUp" caption="task tracking, SAIL workspace" muted />
        </Box>
      </Zone>
    </Box>
  );
}

const RELEASE_STEPS = [
  "A developer's change is reviewed and approved on GitHub.",
  "GitHub Actions automatically packages it into containers and stores them on Docker Hub.",
  "The test server is updated and the change is checked there.",
  "The team releases the same tested version to the live server.",
];

const WHY_CHANGE = [
  {
    title: "Access",
    body: "People outside SAIL can't routinely be given SAIL accounts, but the program now brings in collaborators from other organizations.",
  },
  {
    title: "Isolation",
    body: "The automation service is shared with unrelated projects, so their load or problems can affect Canvas.",
  },
  {
    title: "Room to grow",
    body: "The test server once ran out of processing capacity and was unusable until its settings were changed. Small single servers are not a foundation for a multi-year program.",
  },
  {
    title: "Security",
    body: "Passwords and keys kept in files on the servers, some tied to individual people, don't scale to a larger team and are hard to rotate or audit.",
  },
  {
    title: "Scale",
    body: "Demand for computing is expected to grow substantially over the award period.",
  },
];

// ─── The proposed PCL environment ───────────────────────────────────────────

function ProposedDiagram() {
  const envApps = ["Canvas website", "Canvas engine", "Sign-in (own realm)", "Automation (n8n)", "AI agent runtime"];
  return (
    <Zone dashed title="Dedicated PCL AWS account" caption="Owned by the project, not hosted inside SAIL's account">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Tile label="Secure front door (load balancer)" caption="receives all web traffic over encrypted HTTPS" />
        <Zone title="Kubernetes cluster (Amazon EKS)" caption="a pool of computers on private networks, sized to demand">
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
            {["Staging (test)", "Production (live)"].map((env) => (
              <Zone key={env} title={env} caption="nothing shared with the other environment">
                <Box sx={tileGrid(140)}>
                  {envApps.map((a) => (
                    <Tile key={a} label={a} />
                  ))}
                </Box>
              </Zone>
            ))}
          </Box>
        </Zone>
        <Tile label="Database (MongoDB) on a private data network" caption="one per environment · no public internet access" />
        <Box>
          <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1 }}>Supporting services:</Typography>
          <Box sx={tileGrid(170)}>
            <Tile label="Container registry" caption="packaged releases" muted />
            <Tile label="Secrets manager" caption="passwords and keys" muted />
            <Tile label="Monitoring" caption="logs, metrics and traces" muted />
            <Tile label="Terraform" caption="the whole setup, written as code" muted />
          </Box>
        </Box>
      </Box>
    </Zone>
  );
}

const PROPOSED_CHANGES: { title: string; status: DocsStatus; body: string }[] = [
  {
    title: "A project-owned AWS account",
    status: "planned",
    body: "Canvas moves out of SAIL's AWS account into a dedicated PCL account, so everyone working under the award can be given access without being a SAIL affiliate.",
  },
  {
    title: "Kubernetes instead of two fixed servers",
    status: "planned",
    body: "Canvas's containers run on Amazon EKS, a managed Kubernetes service: a pool of computers that restarts anything that fails and can add capacity as demand grows, without redesigning the system.",
  },
  {
    title: "Test and live kept fully apart",
    status: "planned",
    body: "Staging and production each get their own sign-in realm, database and secrets, with nothing shared between them.",
  },
  {
    title: "A secure front door",
    status: "planned",
    body: "All traffic arrives through a load balancer that handles encrypted connections, while the application itself runs on private networks.",
  },
  {
    title: "The Canvas software moves as-is",
    status: "moving",
    body: "The website, the engine, the database and the existing automations move unchanged first, so any problem after the move can be traced to the move itself rather than to new features.",
  },
  {
    title: "Dedicated automation",
    status: "moving",
    body: "The n8n automations and AI helpers move over as they are, into their own instance for each environment instead of one shared with other projects.",
  },
  {
    title: "An AI agent runtime",
    status: "planned",
    body: "A separate home for longer, multi-step AI tasks where the AI decides the next step, such as building a workflow from an open-ended request. Simple, step-by-step automations stay in n8n.",
  },
  {
    title: "Infrastructure written as code",
    status: "planned",
    body: "Every cloud resource is described in Terraform files kept alongside the source code, so the environment can be reviewed, rebuilt exactly, and reproduced by another laboratory.",
  },
  {
    title: "Releases kept in the project account",
    status: "planned",
    body: "Packaged releases are stored in a container registry inside the project account. The exact package tested on staging is the one released to production, which makes rolling back simple.",
  },
  {
    title: "Where the database runs",
    status: "undecided",
    body: "The database will sit on a private network with no public route. Whether it becomes a managed Amazon service or stays self-run is still open.",
  },
  {
    title: "Passwords and keys",
    status: "undecided",
    body: "1Password will hold the team's shared credentials. How secrets are delivered to the running system is still to be decided.",
  },
  {
    title: "Monitoring",
    status: "undecided",
    body: "Logs, performance measurements and AI activity traces will be collected in one place. The tool has not been chosen.",
  },
];

// ─── Today vs proposed ──────────────────────────────────────────────────────

const COMPARISON: { what: string; today: string; proposed: string }[] = [
  { what: "Whose account", today: "SAIL's AWS account", proposed: "A dedicated, project-owned PCL AWS account" },
  { what: "Computers", today: "Two small, fixed EC2 servers", proposed: "A Kubernetes cluster (Amazon EKS) that grows with demand" },
  { what: "Test vs. live", today: "Separate servers that share one sign-in setup", proposed: "Fully separate: own sign-in, database and secrets" },
  { what: "Database", today: "MongoDB on the same server as the app", proposed: "MongoDB on a private network; managed or self-run still open" },
  { what: "Automation & AI", today: "One n8n instance shared with other SAIL projects", proposed: "A dedicated n8n instance per environment, plus an AI agent runtime" },
  { what: "Packaged releases", today: "Docker Hub, SAIL organization", proposed: "A container registry in the project account" },
  { what: "Passwords & keys", today: "Configuration files on each server", proposed: "1Password for the team; delivery to the system still open" },
  { what: "How it's set up", today: "Configured by hand", proposed: "Defined in Terraform files" },
  { what: "Source code", today: "GitHub, SAIL organization", proposed: "Public repositories under the project's own organization" },
  { what: "Task tracking", today: "ClickUp, SAIL workspace", proposed: "Notion" },
];

// ─── How we get there ───────────────────────────────────────────────────────

const PHASES = [
  { title: "Now", body: "Development carries on as normal on SAIL's infrastructure while the new environment is prepared." },
  { title: "Provisioning", body: "The PCL AWS account, Kubernetes cluster, separate sign-in realms, 1Password and Notion are set up." },
  {
    title: "Cutover",
    body: "Canvas moves across as-is, with a short pause in changes during the switch. Staging is checked before production. Everyone will need to sign in again once.",
  },
  { title: "After", body: "SAIL-hosted parts are retired, and collaborators outside SAIL get project accounts." },
];

const OPEN_QUESTIONS = [
  "When the PCL environment will be ready, and what it depends on.",
  "Whether production moves first, or stays on SAIL's infrastructure in the meantime.",
  "Whether the database becomes a managed Amazon service or stays self-run.",
  "How often the database is backed up, how long copies are kept, and how quickly it must be recoverable.",
  "How large the cluster's computers should be, and when to add more automatically.",
  "How passwords and keys reach the running system.",
  "Which monitoring tool to use.",
  "Which collaborators outside SAIL need access, at what level, and when.",
];

// ─── Glossary ───────────────────────────────────────────────────────────────

const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "AWS (Amazon Web Services)", meaning: "Amazon's cloud: computers, storage and networking rented from Amazon's data centers." },
  { term: "Region", meaning: "A group of Amazon data centers in one area. Canvas runs in US East (N. Virginia)." },
  { term: "EC2 server", meaning: "A virtual computer rented from AWS. Its type, such as t3.small, sets how powerful it is." },
  { term: "Container", meaning: "A sealed, ready-to-run bundle of a piece of software and everything it needs, so it runs the same way everywhere. Docker is the tool used to build and run them." },
  { term: "Kubernetes / Amazon EKS", meaning: "Software that runs many containers across a pool of computers, restarting anything that fails and adding capacity when needed. EKS is Amazon's managed version." },
  { term: "Staging and production", meaning: "Staging is the test copy of Canvas, where changes are checked. Production is the live site people use." },
  { term: "API", meaning: "The set of requests the website can send to the Canvas engine. Canvas's API uses GraphQL." },
  { term: "Sign-in realm", meaning: "A self-contained set of user accounts and roles in Keycloak, the sign-in service." },
  { term: "n8n", meaning: "An open-source tool for building automations that connect services together, including AI steps." },
  { term: "Load balancer", meaning: "The front door that receives web traffic, secures the connection and passes it to the application." },
  { term: "Terraform", meaning: "An open-source tool for describing cloud resources in files, so an environment can be created, reviewed and re-created from them." },
  { term: "Open source", meaning: "Software whose source code is public, so anyone can inspect, run or adapt it." },
];

// ─── Page ───────────────────────────────────────────────────────────────────

const CONTENTS = [
  { id: "at-a-glance", label: "At a glance" },
  { id: "how-it-fits", label: "How Canvas fits together" },
  { id: "building-blocks", label: "The building blocks" },
  { id: "today", label: "Where Canvas runs today" },
  { id: "proposed", label: "The proposed PCL environment" },
  { id: "comparison", label: "Today vs. proposed" },
  { id: "migration", label: "How we get there" },
  { id: "open-questions", label: "Still to be decided" },
  { id: "glossary", label: "Glossary" },
];

export default function DocsTechStack() {
  return (
    <>
      <DocsPageHeader
        slug="tech-stack"
        lead="A plain-language tour of the software that makes up DAMPLab Canvas and the cloud computers it runs on: the setup in use today, and the one proposed for the Programmable Cloud Laboratories (PCL) program."
      />

      <Box component="nav" aria-label="On this page" sx={{ mb: 5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", mb: 1 }}>On this page</Typography>
        <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexWrap: "wrap", gap: 1 }}>
          {CONTENTS.map((c) => (
            <Box component="li" key={c.id}>
              <Link
                href={`#${c.id}`}
                underline="none"
                sx={{
                  display: "inline-block",
                  fontSize: 13.5,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 5,
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.primary",
                  "&:hover": { borderColor: "#8fb5ba", bgcolor: "#e8f1f2" },
                }}
              >
                {c.label}
              </Link>
            </Box>
          ))}
        </Box>
      </Box>

      <DocsSection id="at-a-glance" title="At a glance">
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, mb: 3 }}>
          {[
            { status: "today" as const, heading: "Today", body: "Canvas runs on two small Amazon servers inside the AWS account of SAIL, the Boston University lab that builds it." },
            { status: "planned" as const, heading: "Proposed", body: "A dedicated, project-owned AWS environment for the PCL program, using Kubernetes, with test and live systems fully separated." },
            { status: "moving" as const, heading: "Unchanged", body: "The Canvas software itself moves across as-is. The change is where it runs and how that is managed, not what it does." },
          ].map((card) => (
            <Paper key={card.heading} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
                <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
                  {card.heading}
                </Typography>
                <StatusChip status={card.status} />
              </Box>
              <Typography sx={{ fontSize: 14.5 }}>{card.body}</Typography>
            </Paper>
          ))}
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", mb: 1 }}>What the labels mean</Typography>
        <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexWrap: "wrap", gap: 2 }}>
          {STATUS_LEGEND.map((s) => (
            <Box component="li" key={s.status} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <StatusChip status={s.status} />
              <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>{s.meaning}</Typography>
            </Box>
          ))}
        </Box>
      </DocsSection>

      <DocsSection
        id="how-it-fits"
        title="How Canvas fits together"
        intro="Canvas works like most modern web applications. You use a website; the website asks an engine to do things; the engine keeps everything in a database. A few supporting services handle sign-in, automation and specialist tasks."
      >
        <FlowDiagram />
      </DocsSection>

      <DocsSection
        id="building-blocks"
        title="The building blocks"
        intro="Each part of Canvas has one job. The small print under each card names the technology used, for readers who want to look it up."
      >
        <BuildingBlocks />
      </DocsSection>

      <DocsSection
        id="today"
        title="Where Canvas runs today"
        status="today"
        intro="Canvas runs in Amazon Web Services (AWS), inside the account of SAIL, the Software & Application Innovation Lab at Boston University's Hariri Institute for Computing. There are two virtual servers, one for testing and one for the live site. Each runs the Canvas software as a set of containers."
      >
        <TodayDiagram />

        <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mt: 4, mb: 1.5 }}>
          How a change reaches the live site
        </Typography>
        <Box component="ol" sx={{ pl: 3, m: 0, maxWidth: 760, "& li": { mb: 0.75 } }}>
          {RELEASE_STEPS.map((s) => (
            <li key={s}>
              <Typography>{s}</Typography>
            </li>
          ))}
        </Box>

        <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mt: 4, mb: 0.5 }}>
          Why it needs to change
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 2, maxWidth: 760 }}>
          The current setup works, and it was the right choice for a short-term project. The NSF award turns Canvas into a
          multi-year, multi-organization program, and these problems have already been seen in practice:
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" } }}>
          {WHY_CHANGE.map((w) => (
            <Paper key={w.title} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{w.title}</Typography>
              <Typography sx={{ fontSize: 14 }}>{w.body}</Typography>
            </Paper>
          ))}
        </Box>
      </DocsSection>

      <DocsSection
        id="proposed"
        title="The proposed PCL environment"
        status="planned"
        intro="The NSF award funds the Programmable Cloud Laboratories (PCL) test bed, a four-year effort toward a national network of remotely accessible cloud labs. As part of it, Canvas will move into its own AWS environment, owned by the project. The direction is decided; most details are designed but not yet built."
      >
        <ProposedDiagram />

        <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mt: 4, mb: 1.5 }}>
          What changes
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          {PROPOSED_CHANGES.map((c) => (
            <Paper key={c.title} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                <Typography sx={{ fontWeight: 700 }}>{c.title}</Typography>
                <StatusChip status={c.status} />
              </Box>
              <Typography sx={{ fontSize: 14 }}>{c.body}</Typography>
            </Paper>
          ))}
        </Box>
        <Typography sx={{ mt: 3, maxWidth: 760, color: "text.secondary" }}>
          Open source comes first throughout: open, self-hostable software is preferred over proprietary services, so
          that another laboratory can set up its own copy of Canvas from the public code.
        </Typography>
      </DocsSection>

      <DocsSection id="comparison" title="Today vs. proposed">
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" aria-label="Current and proposed setup compared">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "background.default" } }}>
                <TableCell scope="col" sx={{ width: "22%" }}></TableCell>
                <TableCell scope="col">Today</TableCell>
                <TableCell scope="col">Proposed (PCL)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {COMPARISON.map((row) => (
                <TableRow key={row.what} sx={{ "& td, & th": { verticalAlign: "top", py: 1.25 } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    {row.what}
                  </TableCell>
                  <TableCell>{row.today}</TableCell>
                  <TableCell>{row.proposed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DocsSection>

      <DocsSection
        id="migration"
        title="How we get there"
        intro="The move happens in four phases, and development of Canvas continues throughout."
      >
        <Box component="ol" sx={{ listStyle: "none", p: 0, m: 0, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
          {PHASES.map((p, i) => (
            <Paper component="li" key={p.title} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#456b6e" }}>Phase {i + 1}</Typography>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{p.title}</Typography>
              <Typography sx={{ fontSize: 14 }}>{p.body}</Typography>
            </Paper>
          ))}
        </Box>
      </DocsSection>

      <DocsSection
        id="open-questions"
        title="Still to be decided"
        status="undecided"
        intro="These questions are open at the time of writing. They are listed here so nobody mistakes the plan for a finished design."
      >
        <Box component="ul" sx={{ pl: 3, m: 0, maxWidth: 760, "& li": { mb: 0.75 } }}>
          {OPEN_QUESTIONS.map((q) => (
            <li key={q}>
              <Typography>{q}</Typography>
            </li>
          ))}
        </Box>
      </DocsSection>

      <DocsSection id="glossary" title="Glossary">
        <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          {GLOSSARY.map((g) => (
            <Box key={g.term}>
              <Typography component="dt" sx={{ fontWeight: 700 }}>
                {g.term}
              </Typography>
              <Typography component="dd" sx={{ m: 0, fontSize: 14.5, color: "text.secondary" }}>
                {g.meaning}
              </Typography>
            </Box>
          ))}
        </Box>
      </DocsSection>

      <Typography sx={{ fontSize: 13, color: "text.secondary", borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
        Last reviewed September 2026. Summarized from the DAMPLab Canvas infrastructure and platform architecture
        documentation (version 1.0 draft) prepared by SAIL.
      </Typography>
    </>
  );
}
