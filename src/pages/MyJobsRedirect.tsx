import { Navigate } from 'react-router';

/**
 * `/my_jobs` merged into `/dashboard`.
 *
 * The two pages rendered the same component and differed only in props and in
 * which query they ran; scope is now enforced server-side, so one page serves
 * both. A module is needed rather than an inline element because React Router v7's
 * `route()` takes a file path.
 *
 * Kept rather than deleted: the path is in people's bookmarks and history, and
 * `AppBreadcrumbs` carried a trail for it.
 */
export default function MyJobsRedirect() {
  return <Navigate to="/dashboard" replace />;
}
