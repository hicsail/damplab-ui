import React from "react";
import { Box, Button, Link, Paper, Typography } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SchemaOutlinedIcon from "@mui/icons-material/SchemaOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import { DocsPageHeader, DocsSection } from "../../components/docs/DocsParts";

/**
 * /docs/resources — Code & Protocols, for a non-technical reader.
 *
 * Sources, so the next edit can be checked against them:
 *  - GitHub: `gh repo list hicsail` / `gh repo list DAMPLAB`. Only public repos are
 *    listed. The DAMP-Lab-North/South-Monitor repos are private; keep them off.
 *    Licenses (check with `gh api repos/<owner>/<repo> --jq .license`, not the
 *    repo list, which leaves the field empty): both hicsail repos are MIT, with a
 *    LICENSE file since their initial commits. DAMPLAB/opentrons_protocols has no
 *    license, so its card names none.
 *  - protocols.io: the public DAMP Lab workspace. PUBLISHED_PROTOCOLS is a snapshot
 *    of it (October 2026, 14 protocols, matching the "Protocols Status Tracking"
 *    sheet). Add new ones as the lab publishes them; the workspace link is the
 *    source of truth.
 *  - How Canvas uses protocols: damplab-backend src/protocols and src/protocol-map,
 *    and this repo's TechnicianBench, ProtocolMap and AdminEditService pages.
 *  - GraphQL (folded in from the old /docs/graphql page, which now redirects
 *    here): the backend builds its schema code-first (`autoSchemaFile: true` in
 *    app.module.ts), so there is no schema file to link; this repo's generated
 *    copy is src/gql/graphql.ts (`npm run codegen`). The rounded counts in
 *    SCHEMA_SCALE come from counting @ObjectType / @InputType / @Query /
 *    @Mutation decorators in damplab-backend (Oct 2026: ~125 / ~100 / ~90 / ~120).
 */

const WORKSPACE_URL = "https://www.protocols.io/workspaces/damp-lab3";

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </Link>
  );
}

// ─── GitHub ─────────────────────────────────────────────────────────────────

const REPOSITORIES = [
  {
    name: "damplab-ui",
    owner: "hicsail",
    title: "The Canvas website",
    body: "Everything you see in your browser: the workflow canvas, job pages, the tools lab staff use, and these documentation pages.",
    tech: "TypeScript · React · MIT License",
  },
  {
    name: "damplab-backend",
    owner: "hicsail",
    title: "The Canvas engine",
    body: "The behind-the-scenes service that checks permissions, prices work, moves jobs through their stages and stores the data. It is also what talks to protocols.io and the biosecurity screening services.",
    tech: "TypeScript · NestJS · GraphQL · MIT License",
  },
  {
    name: "opentrons_protocols",
    owner: "DAMPLAB",
    title: "Lab robot programs",
    body: "Programs that run the DAMP Lab's automated protocols on Opentrons liquid-handling robots (OT-2 and Flex), plus shared labware definitions and templates. Automated protocols on protocols.io link here for their code.",
    tech: "Python · Opentrons",
  },
];

function RepositoryCards() {
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
      {REPOSITORIES.map((repo) => {
        const url = `https://github.com/${repo.owner}/${repo.name}`;
        return (
          <Paper key={url} variant="outlined" sx={{ p: 2.5, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {repo.title}
            </Typography>
            <Typography sx={{ fontFamily: "monospace", fontSize: 13, color: "text.secondary", overflowWrap: "anywhere" }}>
              {repo.owner}/{repo.name}
            </Typography>
            <Typography sx={{ fontSize: 14.5, flex: 1 }}>{repo.body}</Typography>
            <Typography sx={{ fontSize: 12.5, color: "text.secondary", borderTop: "1px solid", borderColor: "divider", pt: 1 }}>
              {repo.tech}
            </Typography>
            <Button
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<GitHubIcon />}
              endIcon={<OpenInNewIcon fontSize="small" />}
              sx={{ alignSelf: "flex-start", textTransform: "none" }}
            >
              View on GitHub
            </Button>
          </Paper>
        );
      })}
    </Box>
  );
}

// ─── GraphQL ────────────────────────────────────────────────────────────────

const GRAPHQL_POINTS = [
  {
    title: "One schema for everything",
    body: "The schema names every kind of record Canvas handles (jobs, workflows, lab operations, statements of work, invoices, inventory, bookings, comments and more), the details each one carries, and how they connect to one another.",
  },
  {
    title: "Ask for exactly what you need",
    body: "Every question the engine can answer (a query) and every action it can take (a mutation) is part of the schema. A request names the details it wants, and gets back exactly those.",
  },
  {
    title: "Checked on every request",
    body: "Before anything is read or saved, the engine checks the request against the schema and against what the person's role allows.",
  },
  {
    title: "Kept in step",
    body: "The schema is written alongside the engine's code, and the website generates its matching types from it, so both sides always agree on the shape of the data. Partner tools with an API key read through the same schema.",
  },
];

const SCHEMA_SCALE = "more than 100 kinds of records and around 200 queries and actions";

/**
 * The GraphiQL playground the backend serves at its GraphQL endpoint (`graphiql:
 * true` in damplab-backend's graphql-options.ts). Built from VITE_BACKEND so each
 * environment links to its own API. Hidden when VITE_BACKEND is a relative path
 * (the local dev proxy), where /graphql on this host is not the playground.
 */
const BACKEND_URL: string = import.meta.env.VITE_BACKEND ?? "";
const PLAYGROUND_URL: string | undefined = /^https?:\/\//.test(BACKEND_URL) ? BACKEND_URL : undefined;

const EXAMPLE_QUERY = `query {
  services {
    name
  }
}`;

const EXAMPLE_ANSWER = `{
  "services": [
    { "name": "Gibson Assembly" },
    { "name": "Modular Cloning" },
    …
  ]
}`;

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary", mb: 0.75 }}>{label}</Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          borderRadius: 2,
          bgcolor: "#1f2a2b",
          color: "#e8f1f2",
          fontSize: 13.5,
          lineHeight: 1.5,
          overflowX: "auto",
        }}
      >
        <code>{code}</code>
      </Box>
    </Box>
  );
}

function GraphqlSection() {
  return (
    <>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, mb: 3 }}>
        {GRAPHQL_POINTS.map((p) => (
          <Paper key={p.title} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{p.title}</Typography>
            <Typography sx={{ fontSize: 14 }}>{p.body}</Typography>
          </Paper>
        ))}
      </Box>

      <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
        What a request looks like
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 2, maxWidth: 760 }}>
        To show the catalog, the website asks for the name of every lab operation, and the engine answers with just
        that list.
      </Typography>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, mb: 3 }}>
        <CodeBlock label="The question" code={EXAMPLE_QUERY} />
        <CodeBlock label="The answer" code={EXAMPLE_ANSWER} />
      </Box>

      <Typography sx={{ maxWidth: 760, color: "text.secondary" }}>
        Today the schema covers {SCHEMA_SCALE}. It is defined in the code of the{" "}
        <ExternalLink href="https://github.com/hicsail/damplab-backend">damplab-backend</ExternalLink> repository, and
        the website's generated copy of its types is{" "}
        <ExternalLink href="https://github.com/hicsail/damplab-ui/blob/main/src/gql/graphql.ts">
          src/gql/graphql.ts
        </ExternalLink>{" "}
        in damplab-ui.
      </Typography>

      {PLAYGROUND_URL && (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 2, md: 2.5 }, mt: 3, borderRadius: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between" }}
        >
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", maxWidth: 620 }}>
            <SchemaOutlinedIcon sx={{ color: "#456b6e", mt: 0.25 }} aria-hidden />
            <Box>
              <Typography sx={{ fontWeight: 700 }}>Explore the schema yourself</Typography>
              <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>
                The GraphQL playground lists every type and field in the schema: open the Docs panel in its top-left
                corner to browse. Anyone can browse it. Running a request needs a signed-in Canvas account, so visitors
                who try one will see an "unauthenticated" message.
              </Typography>
            </Box>
          </Box>
          <Button
            href={PLAYGROUND_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            endIcon={<OpenInNewIcon fontSize="small" />}
            sx={{ textTransform: "none" }}
          >
            Open the GraphQL playground
          </Button>
        </Paper>
      )}
    </>
  );
}

// ─── protocols.io ───────────────────────────────────────────────────────────

const PUBLISHED_PROTOCOLS: { group: string; items: { title: string; url: string }[] }[] = [
  {
    group: "DNA",
    items: [
      { title: "Monarch Spin Plasmid Miniprep (NEB)", url: "https://www.protocols.io/view/monarch-spin-plasmid-miniprep-neb-n92ld46yxl5b/v1" },
      { title: "Wizard® MagneSil® Plasmid Purification Kit", url: "https://www.protocols.io/view/wizard-magnesil-plasmid-purification-kit-j8nlk7wq6g5r/v1" },
      { title: "Restriction Digest", url: "https://www.protocols.io/view/restriction-digest-kxygxrwjdg8j/v1" },
      { title: "Restriction Ligation using Hi-T4™ DNA Ligase", url: "https://www.protocols.io/view/restriction-ligation-using-hi-t4-dna-ligase-yxmvmdy3nv3p/v1" },
      { title: "Agarose Gel Electrophoresis: DNA", url: "https://www.protocols.io/view/agarose-gel-electrophoresis-dna-bp2l6odjrlqe/v1" },
      { title: "Agarose Gel DNA Extraction and Purification (Qiagen)", url: "https://www.protocols.io/view/agarose-gel-dna-extraction-and-purification-qiage-261geqry7g47/v1" },
      { title: "Qubit dsDNA HS Assay", url: "https://www.protocols.io/view/qubit-dsdna-hs-assay-261gey7jyv47/v1" },
      { title: "Nanodrop – dsDNA Quantification", url: "https://www.protocols.io/view/nanodrop-dsdna-quantification-36wgqx1n5lk5/v1" },
      { title: "Whole-Plasmid Sequencing Send-out (Plasmidsaurus)", url: "https://www.protocols.io/view/whole-plasmid-sequencing-send-out-plasmidsaurus-81wgbjo8yvpk/v1" },
    ],
  },
  {
    group: "Bacterial cultures",
    items: [
      { title: "Overnight Bacterial Cultures", url: "https://www.protocols.io/view/overnight-bacterial-cultures-14egn5r5zg5d/v1" },
      { title: "Optical Density Measurement of Bacterial Cultures", url: "https://www.protocols.io/view/optical-density-measurement-of-bacterial-cultures-261geqnyyg47/v1" },
      { title: "Glycerol Stocking", url: "https://www.protocols.io/view/glycerol-stocking-5jyl84849g2w/v1" },
    ],
  },
  {
    group: "Protein",
    items: [
      { title: "Pierce™ BCA Protein Assay (Thermo Fisher Scientific)", url: "https://www.protocols.io/view/pierce-bca-protein-assay-thermofisher-scientific-4r3l2zp5jl1y/v1" },
      { title: "Pierce™ Dilution-Free™ Rapid Gold BCA Protein Assay Kit", url: "https://www.protocols.io/view/pierce-dilution-free-rapid-gold-bca-protein-assay-eq2lyorjwgx9/v1" },
    ],
  },
];

function PublishedProtocols() {
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
      {PUBLISHED_PROTOCOLS.map((g) => (
        <Paper key={g.group} variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" component="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {g.group}
          </Typography>
          <Box component="ul" sx={{ pl: 2.25, m: 0, "& li": { mb: 0.75, fontSize: 14.5 } }}>
            {g.items.map((p) => (
              <li key={p.url}>
                <ExternalLink href={p.url}>{p.title}</ExternalLink>
              </li>
            ))}
          </Box>
        </Paper>
      ))}
    </Box>
  );
}

const HOW_CANVAS_USES = [
  {
    title: "Linked to the catalog",
    body: "Each lab operation in the Canvas catalog can be linked to one or more protocols, in the order they are carried out. Lab staff set these links in the catalog editor.",
  },
  {
    title: "Always the current version",
    body: "Canvas stores only which protocol is linked and reads the protocol itself from protocols.io when it is needed, so an update published on protocols.io shows up in Canvas without anyone copying it across.",
  },
  {
    title: "Followed at the bench",
    body: "When a technician works on a job, Canvas shows the linked protocol's steps alongside it, so they can check off each step and record notes and files as they go.",
  },
  {
    title: "Matched to equipment",
    body: "In the Protocol Library, staff match protocol steps to the lab equipment they use, so each step points to the right instrument and station.",
  },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsResources() {
  return (
    <>
      <DocsPageHeader
        slug="resources"
        lead="The Canvas software is open source on GitHub and is built around a GraphQL schema that describes all of its data. The DAMP Lab publishes the step-by-step laboratory protocols behind its work on protocols.io. This page covers all three and how they connect."
      />

      <DocsSection
        id="github"
        title="GitHub: the source code"
        intro={
          <>
            GitHub is a website where software code is stored and shared, with every change recorded. The Canvas code is
            open source under the{" "}
            <ExternalLink href="https://github.com/hicsail/damplab-ui/blob/main/LICENSE">MIT License</ExternalLink>: anyone
            may read, use, change and share it, as long as the original copyright notice comes with it.
          </>
        }
      >
        <RepositoryCards />
        <Typography sx={{ mt: 2.5, maxWidth: 760, color: "text.secondary" }}>
          The DAMP Lab's own GitHub organization,{" "}
          <ExternalLink href="https://github.com/DAMPLAB">github.com/DAMPLAB</ExternalLink>, also holds earlier lab
          automation projects, such as Aquarium lab workflows and Opentrons OT-2 scripts.
        </Typography>
      </DocsSection>

      <DocsSection
        id="graphql"
        title="GraphQL: how Canvas describes its data"
        intro="GraphQL is the language the Canvas website and the Canvas engine use to talk to each other. At its center is our collection of schema and types: one shared definition of how we handle everything in our systems, from what a job is to what an invoice contains."
      >
        <GraphqlSection />
      </DocsSection>

      <DocsSection
        id="protocols"
        title="protocols.io: the lab's protocols"
        intro="protocols.io is a platform for writing, sharing and publishing scientific methods. The DAMP Lab keeps its standard protocols in a public workspace there, so clients and other laboratories can see exactly how the work is done."
      >
        <Paper
          variant="outlined"
          sx={{ p: { xs: 2, md: 2.5 }, mb: 3, borderRadius: 2, display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between" }}
        >
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <ScienceOutlinedIcon sx={{ color: "#456b6e" }} aria-hidden />
            <Box>
              <Typography sx={{ fontWeight: 700 }}>DAMP Lab workspace</Typography>
              <Typography sx={{ fontSize: 13.5, color: "text.secondary" }}>Every protocol the lab has published, always up to date</Typography>
            </Box>
          </Box>
          <Button
            href={WORKSPACE_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            endIcon={<OpenInNewIcon fontSize="small" />}
            sx={{ textTransform: "none" }}
          >
            Open on protocols.io
          </Button>
        </Paper>

        <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
          Published protocols
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 2, maxWidth: 760 }}>
          As of October 2026. More are being written, including automated versions that run on the lab's robots; the
          workspace always has the latest.
        </Typography>
        <PublishedProtocols />
      </DocsSection>

      <DocsSection
        id="how-canvas-uses-protocols"
        title="How Canvas uses protocols"
        intro="Protocols are not just reference documents. Canvas connects them to the work itself."
      >
        <Box
          component="ol"
          sx={{ listStyle: "none", p: 0, m: 0, display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}
        >
          {HOW_CANVAS_USES.map((step, i) => (
            <Paper component="li" key={step.title} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#456b6e" }}>{i + 1}</Typography>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{step.title}</Typography>
              <Typography sx={{ fontSize: 14 }}>{step.body}</Typography>
            </Paper>
          ))}
        </Box>
        <Typography sx={{ mt: 2.5, maxWidth: 760, color: "text.secondary" }}>
          The bench and Protocol Library views are part of the staff side of Canvas. The protocols themselves are public
          on protocols.io.
        </Typography>
      </DocsSection>

      <Typography sx={{ fontSize: 13, color: "text.secondary", borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
        Last reviewed October 2026.
      </Typography>
    </>
  );
}
