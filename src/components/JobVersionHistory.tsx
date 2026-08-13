import React from 'react';
import { Box, Chip, Divider, ListItemText, MenuItem, Select, Typography } from '@mui/material';
import { JobVersionLike, jobStateColor, jobStateLabel } from '../utils/jobGraphDiff';

/**
 * Two pickers over a job's version history: which version is on screen, and
 * which one it is being compared against.
 *
 * A sibling of SowVersionHistory rather than a shared component. The two version
 * shapes genuinely differ — a SOW version has a status enum and a major/minor
 * version number, a job version has an author role and a flat integer — and one
 * component stretched across both would be worse than two small ones.
 */

interface Props {
    versions: JobVersionLike[];
    viewing: number;
    baseline: number | null;
    onViewingChange: (versionNumber: number) => void;
    onBaselineChange: (versionNumber: number | null) => void;
    /** Compact spacing for the canvas panel, where horizontal room is scarce. */
    dense?: boolean;
}

function when(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Who wrote it, in the reader's terms rather than the enum's. */
function authorLabel(version: JobVersionLike): string {
    return version.authorRole === 'STAFF' ? 'DAMP Lab' : 'Customer';
}

function describe(version: JobVersionLike): string {
    return version.note?.trim() || 'No note';
}

function subtitle(version: JobVersionLike): string {
    return [when(version.createdAt), version.createdByName, describe(version)].filter(Boolean).join(' · ');
}

/** The chips for one row: always the author, plus the job state when recorded. */
function VersionChips({ version }: { version: JobVersionLike }): React.JSX.Element {
    const state = jobStateLabel(version.jobState);
    return (
        <>
            <Chip size="small" variant="outlined" label={authorLabel(version)} />
            {/* Absent on versions written before the field existed, and on the
                backfilled v1 — those simply show the author chip alone. */}
            {state && <Chip size="small" label={state} color={jobStateColor(version.jobState)} />}
        </>
    );
}

export default function JobVersionHistory({ versions, viewing, baseline, onViewingChange, onBaselineChange, dense }: Props): React.JSX.Element | null {
    if (!versions.length) return null;

    const ordered = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    const older = ordered.filter((v) => v.versionNumber < viewing);

    return (
        <Box sx={{ display: 'flex', gap: dense ? 0.75 : 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Select
                size="small"
                value={viewing}
                onChange={(e) => onViewingChange(Number(e.target.value))}
                sx={{ minWidth: dense ? 190 : 230, backgroundColor: 'background.paper' }}
                renderValue={(val) => {
                    const v = versions.find((x) => x.versionNumber === Number(val));
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <span>Version {String(val)}</span>
                            {v && <VersionChips version={v} />}
                        </Box>
                    );
                }}
            >
                {ordered.map((v) => (
                    <MenuItem key={v.versionNumber} value={v.versionNumber}>
                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <span>Version {v.versionNumber}</span>
                                    <VersionChips version={v} />
                                </Box>
                            }
                            secondary={subtitle(v)}
                        />
                    </MenuItem>
                ))}
            </Select>

            <Divider orientation="vertical" flexItem />
            <Typography variant="body2" color="text.secondary">
                Compare to
            </Typography>
            <Select
                size="small"
                value={baseline ?? ''}
                displayEmpty
                sx={{ minWidth: dense ? 170 : 200, backgroundColor: 'background.paper' }}
                onChange={(e) => onBaselineChange(e.target.value === '' ? null : Number(e.target.value))}
            >
                {/* Only ever older versions: comparing forwards would report every
                    later edit as a deletion. */}
                <MenuItem value="">
                    <em>Nothing — hide changes</em>
                </MenuItem>
                {older.map((v) => (
                    <MenuItem key={v.versionNumber} value={v.versionNumber}>
                        v{v.versionNumber} · {authorLabel(v).toLowerCase()} · {when(v.createdAt)}
                    </MenuItem>
                ))}
            </Select>
        </Box>
    );
}
