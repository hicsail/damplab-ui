import React from 'react';
import { Alert, Box, Card, CardContent, Chip, Divider, Typography } from '@mui/material';
import PendingIcon      from '@mui/icons-material/Pending';
import LoopIcon         from '@mui/icons-material/Loop';
import DoneIcon         from '@mui/icons-material/Done';
import HelpOutlineIcon  from '@mui/icons-material/HelpOutline';

import { diffWordsWithSpace } from 'diff';
import { resolveParameterName } from '../utils/servicePricing';
import SowDiffText from './sow/SowDiffText';
import type { GraphDiff, JobVersionLike } from '../utils/jobGraphDiff';

/**
 * The per-workflow summary cards shown on both job views.
 *
 * Previously duplicated near-verbatim in TechnicianView and ClientView, which
 * had already drifted (one guarded against a missing workflow name, the other
 * did not). Extracted so the diff decoration below only had to be written once.
 *
 * With no `diff` supplied this renders exactly as the two copies did.
 */

export const formatParameterValue = (parameterDef: any, value: unknown): string => {
    const base = (() => {
        if (Array.isArray(value)) return value.map((v) => String(v ?? '')).filter(Boolean).join(', ');
        if (value === null || value === undefined || value === '') return '';
        if (typeof value === 'object') {
            const v = value as any;
            if (typeof v.filename === 'string' && v.filename.trim() !== '') return v.filename;
            if (typeof v.name === 'string' && v.name.trim() !== '') return v.name;
            return '[File attached]';
        }
        return String(value);
    })();

    if (!parameterDef || parameterDef.type !== 'dropdown') return base;
    const options = Array.isArray(parameterDef.options) ? parameterDef.options : [];
    const optionNameById = new Map(
        options
            .filter((opt: any) => opt && typeof opt.id === 'string')
            .map((opt: any) => [String(opt.id), String(opt.name ?? 'Option')] as const)
    );
    if (Array.isArray(value)) {
        return value
            .map((v) => optionNameById.get(String(v ?? '')) ?? String(v ?? ''))
            .filter(Boolean)
            .join(', ');
    }
    return optionNameById.get(String(value ?? '')) ?? base;
};

export const normalizeFormEntries = (rawFormData: any): Array<{ id: string; name?: string; value: unknown; resultParamValue?: unknown }> => {
    if (Array.isArray(rawFormData)) {
        return rawFormData
            .filter((entry: any) => entry && typeof entry.id === 'string')
            .map((entry: any) => ({
                id: entry.id,
                name: entry.name,
                value: entry.value,
                resultParamValue: entry.resultParamValue
            }));
    }
    if (rawFormData && typeof rawFormData === 'object') {
        return Object.entries(rawFormData).map(([id, value]) => ({ id, value }));
    }
    return [];
};

export const getNodeStatusIcon = (state?: string) => {
    switch (state) {
        case 'QUEUED':
            return <PendingIcon fontSize='small' color='disabled' />;
        case 'IN_PROGRESS':
            return <LoopIcon fontSize='small' color='warning' />;
        case 'COMPLETE':
            return <DoneIcon fontSize='small' color='success' />;
        default:
            return <HelpOutlineIcon fontSize='small' color='disabled' />;
    }
};

/** Files uploaded as node parameter values, across every workflow on a job. */
export const getParameterFiles = (workflows: any[]): Array<{ label: string; filename: string; url?: string }> => {
    const files: Array<{ label: string; filename: string; url?: string }> = [];
    (workflows ?? []).forEach((workflow: any) => {
        (workflow?.nodes ?? []).forEach((node: any) => {
            const serviceParams = Array.isArray(node?.service?.parameters) ? node.service.parameters : [];
            const fileParamMap = new Map(
                serviceParams
                    .filter((p: any) => p && p.type === 'file' && typeof p.id === 'string')
                    .map((p: any) => [p.id, p.name ?? 'File upload'])
            );
            if (!fileParamMap.size) return;

            (node?.formData ?? []).forEach((entry: any) => {
                if (!fileParamMap.has(entry?.id)) return;
                const paramLabel = fileParamMap.get(entry.id);
                const rawValues = Array.isArray(entry.value) ? entry.value : [entry.value];
                rawValues.forEach((raw: any) => {
                    const parsed = typeof raw === 'string' ? (() => {
                        try { return JSON.parse(raw); } catch { return null; }
                    })() : raw;
                    if (!parsed || typeof parsed !== 'object' || !parsed.filename) return;
                    files.push({ label: `${node.label} - ${paramLabel}`, filename: parsed.filename, url: parsed.url });
                });
            });
        });
    });
    return files;
};

const ADDED_BG = 'rgba(46, 125, 50, 0.10)';
const CHANGED_BG = 'rgba(237, 108, 2, 0.10)';
const REMOVED_BG = 'rgba(211, 47, 47, 0.08)';

interface Props {
    workflows: any[];
    /** Fallback when a workflow document has no name of its own. */
    fallbackName?: string;
    /** When present, nodes and parameters are decorated with what changed since the diff baseline. */
    diff?: GraphDiff;
    /** The two versions `diff` was computed from, used to caption it. */
    currentVersion?: JobVersionLike | null;
    baselineVersion?: JobVersionLike | null;
}

export default function JobWorkflowCards({ workflows, fallbackName, diff, currentVersion, baselineVersion }: Props): React.JSX.Element {
    /**
     * Nodes the baseline had that no longer exist anywhere on the job. They have
     * no workflow to sit under any more, so they are appended to the first card
     * rather than vanishing silently.
     */
    const removedNodes = diff ? diff.removed.map((id) => diff.byNodeId.get(id)!).filter(Boolean) : [];

    /**
     * Caption for the highlighting below. Without it the colours are unexplained,
     * and the note the editor asked for ("What changed?") would be recorded on the
     * version and then never shown to anyone.
     */
    const changeSummary = (() => {
        if (!diff?.hasChanges || !currentVersion || !baselineVersion) return null;
        const when = currentVersion.createdAt ? new Date(currentVersion.createdAt) : null;
        const author = currentVersion.authorRole === 'STAFF' ? 'the DAMP Lab' : 'the customer';
        const parts = [
            `Showing what ${author} changed since v${baselineVersion.versionNumber}`,
            currentVersion.createdByName || null,
            when && !Number.isNaN(when.getTime()) ? when.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null
        ].filter(Boolean);
        return { line: parts.join(' · '), note: currentVersion.note ?? null };
    })();

    return (
        <>
            {changeSummary && (
                <Alert severity="info" icon={false} sx={{ mx: 1, mb: 1, py: 0.5 }}>
                    <Typography variant="caption" sx={{ display: 'block' }}>{changeSummary.line}</Typography>
                    {changeSummary.note && (
                        <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>“{changeSummary.note}”</Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75, flexWrap: 'wrap' }}>
                        <Chip size="small" label="Added" sx={{ height: 18, fontSize: 10, backgroundColor: '#2e7d32', color: 'white' }} />
                        <Chip size="small" label="Edited" sx={{ height: 18, fontSize: 10, backgroundColor: '#ed6c02', color: 'white' }} />
                        <Chip size="small" label="Removed" sx={{ height: 18, fontSize: 10, backgroundColor: '#d32f2f', color: 'white' }} />
                    </Box>
                </Alert>
            )}
            {(workflows ?? []).map((workflow: any, index: number) => (
                <Card key={workflow.id || `workflow-${index}`} sx={{ m: 1, boxShadow: 2 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">{workflow?.name ?? fallbackName}</Typography>
                            <Box />
                        </Box>
                        <Typography sx={{ fontSize: 13 }} color="text.secondary" align="left">{(workflow.state ?? '').replace('_', ' ')}</Typography>
                        <Box sx={{ p: 1, m: 1 }}>
                            {(workflow?.nodes ?? []).map((node: any, nodeIndex: number) => {
                                const paramDefs = Array.isArray(node?.service?.parameters) ? node.service.parameters : [];
                                const nodeDiff = diff?.byNodeId.get(node.id);
                                const kind = nodeDiff?.kind;
                                const changedParamIds = new Set((nodeDiff?.paramDiffs ?? []).map((p) => p.id));

                                return (
                                    <Box
                                        key={`${node.id || nodeIndex}`}
                                        sx={{
                                            mb: 1.5,
                                            ...(kind === 'added' ? { backgroundColor: ADDED_BG, borderLeft: '3px solid #2e7d32', pl: 1, py: 0.5, borderRadius: 0.5 } : {}),
                                            ...(kind === 'changed' ? { backgroundColor: CHANGED_BG, borderLeft: '3px solid #ed6c02', pl: 1, py: 0.5, borderRadius: 0.5 } : {})
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {getNodeStatusIcon(node.state)}
                                            <Typography variant='subtitle2'>{node.label}</Typography>
                                            {kind === 'added' && <Chip size="small" label="Added" sx={{ height: 18, fontSize: 10, backgroundColor: '#2e7d32', color: 'white' }} />}
                                            {kind === 'changed' && <Chip size="small" label="Edited" sx={{ height: 18, fontSize: 10, backgroundColor: '#ed6c02', color: 'white' }} />}
                                            {nodeDiff?.serviceChanged && <Chip size="small" variant="outlined" label="Service changed" sx={{ height: 18, fontSize: 10 }} />}
                                        </Box>
                                        <Box sx={{ pl: 3, pt: 0.5 }}>
                                            {normalizeFormEntries(node?.formData).map((entry: any) => {
                                                const paramDef = paramDefs.find((p: any) => p?.id === entry.id);
                                                const label = resolveParameterName(entry, paramDef) || 'Parameter';
                                                const rawValue = entry.value ?? entry.resultParamValue;
                                                const paramDiff = changedParamIds.has(entry.id)
                                                    ? nodeDiff!.paramDiffs.find((p) => p.id === entry.id)
                                                    : undefined;

                                                // A changed value is shown as an inline word diff, so the
                                                // reader sees what it used to be without leaving the card.
                                                // Re-diffed here against the *formatted* values, so a
                                                // dropdown reads as its option names on both sides rather
                                                // than as the raw option ids the differ had to fall back to.
                                                if (paramDiff) {
                                                    const parts = diffWordsWithSpace(
                                                        formatParameterValue(paramDef, paramDiff.beforeRaw),
                                                        formatParameterValue(paramDef, paramDiff.afterRaw)
                                                    );
                                                    return (
                                                        <Box key={entry.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline', flexWrap: 'wrap' }}>
                                                            <Typography variant='body2' color='text.secondary'>{label}:</Typography>
                                                            <SowDiffText parts={parts} />
                                                        </Box>
                                                    );
                                                }
                                                return (
                                                    <Typography key={entry.id} variant='body2' color='text.secondary'>
                                                        {label}: {formatParameterValue(paramDef, rawValue)}
                                                    </Typography>
                                                );
                                            })}
                                        </Box>
                                        {nodeIndex < (workflow?.nodes?.length ?? 0) - 1 ? <Divider sx={{ mt: 1 }} /> : null}
                                    </Box>
                                );
                            })}

                            {index === 0 && removedNodes.length > 0 && (
                                <>
                                    <Divider sx={{ my: 1 }} />
                                    {removedNodes.map((removed) => (
                                        <Box
                                            key={removed.nodeId}
                                            sx={{ mb: 1.5, backgroundColor: REMOVED_BG, borderLeft: '3px solid #d32f2f', pl: 1, py: 0.5, borderRadius: 0.5 }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant='subtitle2' sx={{ textDecoration: 'line-through' }} color='text.secondary'>
                                                    {removed.label}
                                                </Typography>
                                                <Chip size="small" label="Removed" sx={{ height: 18, fontSize: 10, backgroundColor: '#d32f2f', color: 'white' }} />
                                            </Box>
                                        </Box>
                                    ))}
                                </>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            ))}
        </>
    );
}
