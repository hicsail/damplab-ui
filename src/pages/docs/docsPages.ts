/**
 * The public documentation pages, as data.
 *
 * One list drives both the index page's cards and the side navigation in
 * `layouts/PublicDocsLayout.tsx`, so a page cannot appear in one and not the other.
 * Adding a page means adding it here and adding its route in `routes.ts`.
 *
 * `ready: false` marks a page that exists (so links to it work) but whose content
 * has not been written yet. The index shows it as "Coming soon".
 */

export type DocsPageSlug = "about" | "tech-stack" | "graphql" | "biosecurity" | "resources";

export interface DocsPageDef {
  slug: DocsPageSlug;
  path: string;
  /** Full title, used as the page heading and the index card title. */
  title: string;
  /** Short label for the side navigation and breadcrumbs. */
  navLabel: string;
  /** One or two sentences for the index card, written for a non-technical reader. */
  summary: string;
  ready: boolean;
}

export const DOCS_INDEX_PATH = "/docs";

export const DOCS_PAGES: readonly DocsPageDef[] = [
  {
    slug: "about",
    path: "/docs/about",
    title: "About DAMPLab Canvas",
    navLabel: "About Canvas",
    summary:
      "What Canvas is and who it is for, video walkthroughs from the PCL program, and how Canvas compares with other laboratory tools.",
    ready: false,
  },
  {
    slug: "tech-stack",
    path: "/docs/tech-stack",
    title: "Technology & Cloud Infrastructure",
    navLabel: "Technology & Cloud",
    summary:
      "The building blocks behind Canvas and the cloud computers it runs on — the setup in use today and the one proposed for the PCL program.",
    ready: true,
  },
  {
    slug: "graphql",
    path: "/docs/graphql",
    title: "GraphQL",
    navLabel: "GraphQL",
    summary: "How the Canvas website asks for and updates information, using a request language called GraphQL.",
    ready: false,
  },
  {
    slug: "biosecurity",
    path: "/docs/biosecurity",
    title: "Biosecurity",
    navLabel: "Biosecurity",
    summary: "How DNA sequences are screened and customers are verified before laboratory work begins.",
    ready: false,
  },
  {
    slug: "resources",
    path: "/docs/resources",
    title: "Code & Protocols",
    navLabel: "Code & Protocols",
    summary: "Where to find the Canvas source code on GitHub and the laboratory protocols published on protocols.io.",
    ready: false,
  },
];

export function docsPage(slug: DocsPageSlug): DocsPageDef {
  const page = DOCS_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`Unknown docs page: ${slug}`);
  return page;
}
