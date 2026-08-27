import type { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';

interface ReadOnlyFieldsetProps {
  /** When false the whole subtree is disabled and a banner explains why. */
  canWrite: boolean;
  children: ReactNode;
  /** What the banner names, e.g. "this service". */
  noun?: string;
  /** Suppress the banner when the caller shows its own. */
  hideBanner?: boolean;
}

/**
 * Render a form read-only for a caller who may view it but not save it.
 *
 * The mechanism is a native `<fieldset disabled>`, which the browser applies to
 * every descendant form control at once. That matters for a page like
 * AdminEditService with two dozen inputs: threading a `disabled` prop through each
 * one is where a field gets missed, and a missed field is an input the user can
 * type into before being refused.
 *
 * **Put Save and Cancel outside this**, not in it. A disabled fieldset disables
 * descendant buttons too, and the rule is that Save is *hidden* for a read-tier
 * user rather than present-but-dead — a greyed Save reads as "something is wrong",
 * where no Save reads as "this is a view".
 *
 * The fieldset's own default styling is reset: it exists for the `disabled`
 * semantics, not to draw a box.
 */
export function ReadOnlyFieldset({ canWrite, children, noun = 'this page', hideBanner = false }: ReadOnlyFieldsetProps) {
  return (
    <>
      {!canWrite && !hideBanner && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You have read-only access to {noun}. The fields below are shown for reference and cannot be saved.
        </Alert>
      )}
      <Box
        component="fieldset"
        disabled={!canWrite}
        sx={{ border: 0, p: 0, m: 0, minInlineSize: 0, display: 'contents' }}
      >
        {children}
      </Box>
    </>
  );
}

export default ReadOnlyFieldset;
