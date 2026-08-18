import React from 'react';
import { Box } from '@mui/material';
import type { Change } from 'diff';

/**
 * Inline word-level diff of one section.
 *
 * Insertions and deletions are distinguished by more than colour — inserted text
 * is underlined, deleted text struck through — so the change is still readable
 * without colour vision, and legible if the page is printed.
 */
export default function SowDiffText({ parts }: { parts: Change[] }): React.JSX.Element {
  return (
    <Box data-verbatim-text sx={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6 }}>
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <Box
              key={i}
              component="ins"
              sx={{ bgcolor: 'success.light', color: 'success.contrastText', textDecoration: 'underline', borderRadius: 0.5, px: 0.25 }}
            >
              {part.value}
            </Box>
          );
        }
        if (part.removed) {
          return (
            <Box
              key={i}
              component="del"
              sx={{ bgcolor: 'error.light', color: 'error.contrastText', textDecoration: 'line-through', borderRadius: 0.5, px: 0.25, opacity: 0.85 }}
            >
              {part.value}
            </Box>
          );
        }
        return <React.Fragment key={i}>{part.value}</React.Fragment>;
      })}
    </Box>
  );
}
