import { Navigate } from "react-router";

/**
 * /docs/graphql used to be its own page. GraphQL is now a section of Code &
 * Protocols; this keeps links to the old address working.
 */
export default function DocsGraphqlRedirect() {
  return <Navigate to="/docs/resources#graphql" replace />;
}
