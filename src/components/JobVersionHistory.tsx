import React from 'react';
import { Box, Chip, Divider, ListItemText, MenuItem, Select, Typography } from '@mui/material';
import { JobVersionLike, jobStateColor, jobVersionChip, jobVersionDisplayLabel } from '../utils/jobGraphDiff';
import { formatSOWInstant } from '../utils/sowDateUtils';

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

/** Lab-timezone date and clock time, matching SowVersionHistory. */
function when(iso?: string): string {
    return iso ? formatSOWInstant(iso, 'datetime') : '';
}

/**
 * Who wrote it, in the reader's terms rather than the enum's, qualified by the
 * org stamped at write time — the staff member's access tier, or the job's
 * institute for a customer edit.
 *
 * Falls back to the side alone when there is no org, which is every version
 * written before the field existed. Those rows are deliberately not backfilled:
 * a tier that was never recorded should not be invented after the fact.
 */
function authorLabel(version: JobVersionLike): string {
    const side = version.authorRole === 'STAFF' ? 'DAMP Lab' : 'Customer';
    const org = version.createdByOrg?.trim();
    return org ? `${side} · ${org}` : side;
}

function describe(version: JobVersionLike): string {
    return version.note?.trim() || 'No note';
}

function subtitle(version: JobVersionLike): string {
    return [when(version.createdAt), version.createdByName, describe(version)].filter(Boolean).join(' · ');
}

function labelFor(version: JobVersionLike | undefined, fallbackNumber: number): string {
    return version?.displayVersion || jobVersionDisplayLabel(version?.versionNumber ?? fallbackNumber);
}

/** The chips for one row: always the author, plus the job state when recorded. */
function VersionChips({ version }: { version: JobVersionLike }): React.JSX.Element {
    const chip = jobVersionChip(version);
    const color =
        chip === 'Draft'
            ? 'default'
            : version.isEvent
              ? jobStateColor(version.jobState)
              : jobStateColor('SUBMITTED');
    return (
        <>
            <Chip size="small" variant="outlined" label={authorLabel(version)} />
            {chip && <Chip size="small" label={chip} color={color} />}
        </>
    );
}

export default function JobVersionHistory({ versions, viewing, baseline, onViewingChange, onBaselineChange, dense }: Props): React.JSX.Element | null {
    if (!versions.length) return null;

    const ordered = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
    const older = ordered.filter((v) => v.versionNumber < viewing);

    // The automatic baseline collapses onto the viewed version when there is
    // nothing older to compare against, and that number has no option here.
    // Render it as "Nothing" rather than letting the Select go blank on a value
    // it cannot match.
    const selectableBaseline = older.some((v) => v.versionNumber === baseline) ? baseline : null;

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
                            <span>Version {labelFor(v, Number(val))}</span>
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
                                    <span>Version {labelFor(v, v.versionNumber)}</span>
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
                value={selectableBaseline ?? ''}
                displayEmpty
                sx={{ minWidth: dense ? 190 : 230, backgroundColor: 'background.paper' }}
                onChange={(e) => onBaselineChange(e.target.value === '' ? null : Number(e.target.value))}
                renderValue={(val) => {
                    if (val == null || String(val) === '') return <em>Nothing</em>;
                    const v = versions.find((x) => x.versionNumber === Number(val));
                    return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <span>Version {labelFor(v, Number(val))}</span>
                            {v && <VersionChips version={v} />}
                        </Box>
                    );
                }}
            >
                {/* Only ever older versions: comparing forwards would report every
                    later edit as a deletion. */}
                <MenuItem value="">
                    <em>Nothing — hide changes</em>
                </MenuItem>
                {older.map((v) => (
                    <MenuItem key={v.versionNumber} value={v.versionNumber}>
                        <ListItemText
                            primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                    <span>Version {labelFor(v, v.versionNumber)}</span>
                                    <VersionChips version={v} />
                                </Box>
                            }
                            secondary={subtitle(v)}
                        />
                    </MenuItem>
                ))}
            </Select>
        </Box>
    );
}
