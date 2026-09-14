import { CodegenConfig } from '@graphql-codegen/cli'

/**
 * Regenerates src/gql/graphql.ts — TypeScript types mirroring the backend's
 * GraphQL schema. That file is the only thing codegen produces here, and it is
 * imported for schema types (e.g. `Workflow`) rather than for typed documents.
 *
 * Point this at a **local** backend, not staging:
 *   - The original value was a decommissioned NERC/OpenShift host that answers
 *     503, so `npm run codegen` had silently stopped working — which is why
 *     these types sat ~7 months stale without anyone noticing.
 *   - Staging (damplab-backend.sail.codes) is not a substitute: Cloudflare
 *     fronts it and aborts codegen's introspection, even though curl and fetch
 *     against the same URL succeed.
 *   - A local backend is also the schema you are actually developing against.
 *
 * Before running:  cd ../damplab-backend && npm run start:dev
 * Override with CODEGEN_SCHEMA if your backend is not on :5100.
 *
 * NOTE: src/gql/queries.tsx and src/gql/mutations.tsx are hand-written and are
 * NOT touched by this. They are also not validated against the schema — they
 * interpolate shared fragments (`${INVENTORY_FIELDS}`) into their gql templates,
 * which graphql-tag-pluck cannot parse. Adding operation-level type safety would
 * mean giving up that fragment style, so this deliberately generates schema
 * types only.
 */
const config: CodegenConfig = {
  schema: process.env.CODEGEN_SCHEMA ?? 'http://localhost:5100/graphql',
  generates: {
    './src/gql/graphql.ts': { plugins: ['typescript'] }
  }
}

export default config
