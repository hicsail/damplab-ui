import React from 'react';
import { Box, Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router';

/**
 * A comment body: plain text, with links made clickable.
 *
 * Deliberately *not* a full markdown renderer. Comments have always been stored
 * and displayed as plain text with `white-space: pre-wrap`, and running them
 * through markdown would silently reformat every comment already in the
 * database — collapsing the single newlines people typed, and eating stray `*`
 * and `#` characters that occur naturally in lab notes.
 *
 * So only two things are recognised: a markdown link, which is what the
 * technician feedback flow writes to point at the workflow editor, and a bare
 * URL. Everything else is rendered exactly as typed.
 */

// [label](target) or a bare http(s) URL.
const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>"')]+)/g;

const isInternal = (href: string): boolean => href.startsWith('/');

export default function CommentBody({ content }: { content: string }): React.JSX.Element {
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let key = 0;

    for (const match of content.matchAll(LINK_PATTERN)) {
        const [full, label, target, bareUrl] = match;
        const start = match.index ?? 0;

        if (start > cursor) parts.push(content.slice(cursor, start));

        const href = target ?? bareUrl;
        const text = label ?? bareUrl;

        parts.push(
            isInternal(href) ? (
                // An in-app destination stays in the app rather than reloading it.
                <MuiLink key={key++} component={RouterLink} to={href}>
                    {text}
                </MuiLink>
            ) : (
                <MuiLink key={key++} href={href} target="_blank" rel="noopener noreferrer">
                    {text}
                </MuiLink>
            )
        );

        cursor = start + full.length;
    }

    if (cursor < content.length) parts.push(content.slice(cursor));

    return (
        <Box sx={{ mb: 1, fontSize: 14, lineHeight: 1.43, whiteSpace: 'pre-wrap' }}>
            {parts.length ? parts : content}
        </Box>
    );
}
