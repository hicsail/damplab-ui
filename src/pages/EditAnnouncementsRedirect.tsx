import { Navigate } from 'react-router';

/**
 * `/edit_announcements` merged into `/announcements`.
 *
 * The editor rendered the same rows the feed did, with controls attached; the merged
 * page gates those controls on `announcements:write` instead. A module is needed
 * rather than an inline element because React Router v7's `route()` takes a file path.
 *
 * Kept rather than deleted: the path is in bookmarks and history, and it was a
 * homepage button until this change.
 */
export default function EditAnnouncementsRedirect() {
  return <Navigate to="/announcements" replace />;
}
