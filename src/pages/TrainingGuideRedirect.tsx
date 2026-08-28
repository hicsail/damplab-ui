import { Navigate } from 'react-router';

/**
 * `/training/:slug` no longer exists.
 *
 * The Learning Hub held markdown guides at their own URLs; it holds uploaded PDFs
 * now, listed on one page. Old links land here rather than on the 404, because they
 * were shared and bookmarked while the guides were live.
 */
export default function TrainingGuideRedirect() {
  return <Navigate to="/training" replace />;
}
