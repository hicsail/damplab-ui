import React from "react";
import { Box, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { DocsOnThisPage, DocsPageHeader, DocsSection, StatusChip, type DocsStatus } from "../../components/docs/DocsParts";

/**
 * /docs/biosecurity — how Canvas screens DNA sequences and customers, for a general
 * but technically curious reader.
 *
 * Sources, so the next edit can be checked against them:
 *  - damplab-backend: src/job/job-screening.{service,constants,util}.ts (what is
 *    screened, provider modes, the paused auto-screen), src/aclid/* (Aclid screen,
 *    polling, verdict mapping, customer verification), src/securedna/* (SecureDNA
 *    synthclient, standalone batches), src/job/biosecurity-view.ts (what customers see).
 *  - damplab-ui: components/technician/biosecurityStatus.ts (the five screening rows,
 *    worst-of rollup, placeholder rows), pages/Screener.tsx + UploadAndScreenSequences.tsx.
 *  - docs/superpowers/specs/2026-09-14-aclid-kyc-and-homology-design.md.
 *  - Looking ahead: NTI | bio and Lattice Automation, "A Proposal for Biodesign Metadata
 *    Exchange for Use in Biosecurity" (Aug 2025); Google DeepMind, "Introducing SynthID
 *    Bio" (30 Sep 2026). Neither is built in Canvas; keep that section loose.
 *
 * Accuracy notes for whoever edits this next:
 *  - Automatic screening on submit is off (AUTO_SCREENING_ENABLED = false in
 *    job-screening.service.ts). Update "Current status" when it is turned back on.
 *  - Nothing in Canvas blocks a job on a FAILED result; staff decide. Don't write
 *    that screening "stops" or "holds" an order unless that becomes true in code.
 *  - Which checks Aclid's customer verification performs is Aclid's, not ours; don't
 *    enumerate them here. Sanctions/watchlist screening is not enabled.
 *  - Deliberately left out because this page is public: API endpoints, hostnames,
 *    environment variables, thresholds beyond the ones a customer would notice.
 */

// ─── Small pieces ───────────────────────────────────────────────────────────

function Card({ title, status, children }: { title: string; status?: DocsStatus; children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.75 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {title}
        </Typography>
        {status && <StatusChip status={status} />}
      </Box>
      <Typography component="div" sx={{ fontSize: 14.5 }}>
        {children}
      </Typography>
    </Paper>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mt: 4, mb: 1.5 }}>
      {children}
    </Typography>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ maxWidth: 760, mb: 2 }}>{children}</Typography>;
}

const grid = (cols: { sm?: number; md?: number; lg?: number }) => ({
  display: "grid",
  gap: 2,
  gridTemplateColumns: {
    xs: "1fr",
    ...(cols.sm && { sm: `repeat(${cols.sm}, minmax(0, 1fr))` }),
    ...(cols.md && { md: `repeat(${cols.md}, minmax(0, 1fr))` }),
    ...(cols.lg && { lg: `repeat(${cols.lg}, minmax(0, 1fr))` }),
  },
});

// ─── The screening pipeline diagram ─────────────────────────────────────────

const PIPELINE = [
  { label: "Job submitted", caption: "workflow with DNA sequences in its forms" },
  { label: "Seqs extracted", caption: "from the fields of operations that use them" },
  { label: "Homology screen", caption: "Aclid, with SecureDNA as backup" },
  { label: "Customer verification", caption: "Aclid's hosted flow, linked to the screen" },
  { label: "Staff review", caption: "results on the job page decide next steps" },
];

function PipelineDiagram() {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
      <Box
        component="ol"
        sx={{
          listStyle: "none",
          p: 0,
          m: 0,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
          gap: 1,
        }}
      >
        {PIPELINE.map((step, i) => (
          <React.Fragment key={step.label}>
            <Box
              component="li"
              sx={{
                flex: 1,
                minWidth: 0,
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                bgcolor: i === PIPELINE.length - 1 ? "background.default" : "#e8f1f2",
                border: "1px solid",
                borderColor: i === PIPELINE.length - 1 ? "divider" : "#b9d3d6",
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{step.label}</Typography>
              <Typography sx={{ fontSize: 12.5, color: "text.secondary", lineHeight: 1.35, mt: 0.25 }}>
                {step.caption}
              </Typography>
            </Box>
            {i < PIPELINE.length - 1 && (
              <ArrowForwardIcon
                aria-hidden
                sx={{ color: "text.secondary", alignSelf: "center", transform: { xs: "rotate(90deg)", md: "none" } }}
              />
            )}
          </React.Fragment>
        ))}
      </Box>
    </Paper>
  );
}

// ─── Content ────────────────────────────────────────────────────────────────

const SCREENED_FIELDS: { service: string; fields: string }[] = [
  { service: "Gibson Assembly", fields: "The insert sequence" },
  { service: "Modular Cloning", fields: "The vector and insert sequences" },
  { service: "Ordering DNA fragments from a third party", fields: "The fragment sequence" },
];

const RESULT_STATES: { state: string; meaning: string }[] = [
  { state: "Passed", meaning: "The provider found nothing that requires control, or granted permission to synthesize." },
  { state: "Failed", meaning: "The provider flagged the order: a match to a regulated pathogen or toxin, or a denied synthesis permission." },
  { state: "In progress", meaning: "A screen has been started and Canvas is still waiting for the provider's answer." },
  { state: "Unavailable", meaning: "No answer could be obtained — the provider was unreachable, or there was nothing to screen. This is not a pass." },
];

const PROVIDER_MODES: { mode: string; behaviour: string }[] = [
  {
    mode: "Aclid (default)",
    behaviour: "Aclid's verdict is the homology result. SecureDNA is consulted only when Aclid returns no verdict.",
  },
  {
    mode: "SecureDNA",
    behaviour: "SecureDNA's verdict is the homology result. An Aclid screen is still created, because customer verification hangs off it.",
  },
  {
    mode: "Both",
    behaviour: "Both providers screen every order, and a flag from either one makes the result Failed.",
  },
];

const LOOKING_AHEAD: { title: string; body: React.ReactNode }[] = [
  {
    title: "Design metadata",
    body: (
      <>
        Homology screening asks <em>what does this sequence resemble?</em> As AI-assisted design produces sequences that
        resemble less and less in nature, the question <em>how and why was this designed?</em> grows in value. NTI | bio and
        Lattice Automation have proposed a{" "}
        <Link href="https://www.nti.org/analysis/articles/white-paper-a-proposal-for-biodesign-metadata-exchange-for-use-in-biosecurity/" target="_blank" rel="noopener">
          Biodesign Metadata Exchange
        </Link>{" "}
        standard that carries provenance, edit history and intended use alongside a sequence. A Canvas job already records
        the workflow a sequence belongs to, which makes it a natural place to capture and pass on that context.
      </>
    ),
  },
  {
    title: "Watermarking",
    body: (
      <>
        Google DeepMind's{" "}
        <Link href="https://deepmind.google/blog/introducing-synthid-bio/" target="_blank" rel="noopener">
          SynthID Bio
        </Link>{" "}
        embeds a detectable signature in protein designs produced by AI models, so a design's origin can be checked later
        — including, potentially, by whoever synthesizes it. Detecting such signals in incoming orders, and recording
        provenance for designs that originate in Canvas, are directions we are exploring.
      </>
    ),
  },
  {
    title: "Function-based screening",
    body: "Machine-learning models that predict what a sequence's encoded proteins would do — for example, whether they carry toxin-associated domains — can catch hazards that share little sequence with anything known. These would complement homology screening rather than replace it.",
  },
];

// const GLOSSARY: { term: string; meaning: string }[] = [
//   { term: "Sequence of concern", meaning: "A DNA, RNA or protein sequence associated with a regulated pathogen or toxin, or one that could contribute to a dangerous function." },
//   { term: "Homology screening", meaning: "Comparing a submitted sequence with databases of sequences of concern to find close matches." },
//   { term: "Regulated agent", meaning: "A pathogen or toxin on a government control list, such as the US Federal Select Agent Program list." },
//   { term: "Customer screening (KYC)", meaning: "“Know your customer”: confirming that the person placing an order is who they say they are and has a legitimate reason to place it." },
//   { term: "Wild type", meaning: "The form of a sequence as it occurs in nature, as opposed to a modified or engineered variant." },
//   { term: "Nucleotide", meaning: "A single letter of DNA or RNA: A, C, G and T (or U in RNA)." },
//   { term: "Provenance", meaning: "Where a design came from: who or what produced it, with which tools, and how it has changed since." },
// ];

const CONTENTS = [
  { id: "why", label: "Why screen" },
  { id: "overview", label: "How it fits together" },
  { id: "sequences", label: "Sequence screening" },
  { id: "customers", label: "Customer screening" },
  { id: "results", label: "Screening results" },
  { id: "ahead", label: "Looking ahead" },
  // { id: "glossary", label: "Glossary" },
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DocsBiosecurity() {
  return (
    <>
      <DocsPageHeader
        slug="biosecurity"
        lead="Before the DAMP Lab builds biological constructs, it checks two things: what is being made, and who is asking for it. 
        Canvas runs both checks through specialist screening services and puts the results in front of lab staff. This page explains how.
        (Standard screening procedures are in place, with additional, more advanced screening mechanisms in progress.)"
      />

      <DocsOnThisPage items={CONTENTS} />

      <DocsSection
        id="why"
        title="Why screen"
        intro="Synthetic biology lets almost anyone order custom DNA. 
        Nearly all of it is harmless, but a sequence that encodes part of a dangerous pathogen or toxin could also be requested.
        In addition to existing Whitehouse guidelines on nucleic acid synthesis, there is pending legislation in the US (and internationally) that will require such screening for synthesis providers."
      >
        <Box sx={grid({ md: 2 })}>
          <Card title="Homology-based Sequence screening">
            The DNA sequences in an order are compared against databases of known
            sequences of concern.
          </Card>
          <Card title="Customer screening">
            The person placing the order verifies their identity with a screening
            provider, and the result is linked to the order.
          </Card>
        </Box>
      </DocsSection>

      <DocsSection
        id="overview"
        title="How it fits together"
        intro="Screening is tied to a job — the workflow a client designs on the Canvas canvas and submits to the lab. Canvas does the plumbing; the expertise in recognising hazards belongs to the screening providers."
      >
        <PipelineDiagram />
        <Typography sx={{ mt: 2, maxWidth: 760, color: "text.secondary", fontSize: 14.5 }}>
          The primary screening provider used by Canvas is <Link href="https://www.aclid.bio/" target="_blank" rel="noopener">
            Aclid
          </Link>{", "} 
          a biosecurity platform that screens sequences against regulated pathogens and toxins and runs customer
          verification.{" "}
          Additional screening services are also being integrated (such as SecureDNA as a homology screening fallback).
        </Typography>
      </DocsSection>

      <DocsSection
        id="sequences"
        title="Sequence screening"
        intro="Homology screening asks whether any part of a submitted sequence closely matches a known sequence of concern. It is the established foundation of DNA synthesis screening."
      >
        <SubHeading>What gets screened</SubHeading>
        <Prose>
          A Canvas workflow is made of operations, each with its own form. Canvas knows which form fields hold DNA, and
          collects the sequences from those fields across relevant operations such as:
        </Prose>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxWidth: 760, mb: 2.5 }}>
          <Table size="small" aria-label="Operations whose sequences are screened">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "background.default" } }}>
                <TableCell scope="col">Operation</TableCell>
                <TableCell scope="col">Sequence screened</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SCREENED_FIELDS.map((row) => (
                <TableRow key={row.service}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                    {row.service}
                  </TableCell>
                  <TableCell>{row.fields}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <SubHeading>How the providers are used</SubHeading>
        <Prose>
          Each sequence is labelled with the workflow, step and field it came from, so a hit can be traced back to exactly where it was entered.
        </Prose>
        <Prose>
          <Box component="span" sx={{ display: "block", mt: 2.5 }}>
            Aclid screens asynchronously: Canvas starts a screen and then checks back every few seconds until the answer is
            ready. If Aclid takes longer than Canvas is willing to wait, the screen is not lost — Canvas keeps its reference
            and fetches the result again later. 
          </Box>
        </Prose>
      </DocsSection>

      <DocsSection
        id="customers"
        title="Customer screening"
        intro="A sequence screen says nothing about who placed the order. Customer screening — often called “know your customer”, or KYC — covers that half, through Aclid."
      >
        <Prose>
          Once a job has an Aclid sequence screen, Canvas can ask Aclid for a verification link tied to that screen. The
          customer opens it from their job page — embedded in Canvas, or on Aclid's own site — and completes Aclid's
          verification process there. Lab staff can also copy the link and send it to the customer. When the customer
          finishes, they are brought back to their job, and Canvas fetches the outcome from Aclid.
        </Prose>
        <Prose>
          The verification itself, and the information it collects, stay with Aclid. Canvas stores only the
          outcome: whether verification was submitted, and whether the customer was approved, rejected, or not required to
          verify.
        </Prose>
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxWidth: 760 }}>
          <Table size="small" aria-label="Customer verification states">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "background.default" } }}>
                <TableCell scope="col">The customer sees</TableCell>
                <TableCell scope="col">Lab staff see</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ["Not submitted", "In progress — verification has not been completed"],
                ["Submitted", "Passed (approved) or Failed (rejected), once Aclid has decided"],
                ["Not required", "Passed — Aclid did not require verification for this order"],
              ].map(([customer, staff]) => (
                <TableRow key={customer}>
                  <TableCell sx={{ fontWeight: 600 }}>{customer}</TableCell>
                  <TableCell>{staff}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DocsSection>

      <DocsSection
        id="results"
        title="Screening results"
        intro="Every screen ends in one of four states. 
        On the job page, staff see each screen separately and an overall status that is the most cautious of them (any failed result makes the entire screen Failed)."
      >
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxWidth: 760, mb: 2.5 }}>
          <Table size="small" aria-label="Screening result states">
            <TableBody>
              {RESULT_STATES.map((r) => (
                <TableRow key={r.state} sx={{ "& td, & th": { verticalAlign: "top", py: 1.25 } }}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 700, width: "22%" }}>
                    {r.state}
                  </TableCell>
                  <TableCell>{r.meaning}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Prose>
          Screening informs a decision; it does not make one. A Failed result is put in front of DAMP Lab staff, who decide
          with the customer what happens next. Canvas does not cancel or release work on its own.
          Results are generally visible only to lab staff who can then decide what how to handle the job or what to communicate to the customer.
        </Prose>
      </DocsSection>

      <DocsSection
        id="ahead"
        title="Looking ahead"
        intro="Three more layers of screening that are currently planned and/or in progress:"
      >
        <Box sx={grid({ md: 3 })}>
          {LOOKING_AHEAD.map((item) => (
            <Card key={item.title} title={item.title}>
              {item.body}
            </Card>
          ))}
        </Box>
        <Typography sx={{ mt: 3, maxWidth: 760, color: "text.secondary" }}>
          No single check is enough by itself. The aim is layers: what a sequence resembles, what it is predicted to do,
          where it came from, and who is asking for it.
        </Typography>
      </DocsSection>
{/* 
      <DocsSection id="glossary" title="Glossary">
        <Box component="dl" sx={{ m: 0, ...grid({ md: 2 }), gap: 1.5 }}>
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
      </DocsSection> */}

      <Typography sx={{ fontSize: 13, color: "text.secondary", borderTop: "1px solid", borderColor: "divider", pt: 2 }}>
        Last reviewed October 2026.
      </Typography>
    </>
  );
}
