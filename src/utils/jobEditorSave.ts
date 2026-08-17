import { JobVersionLike } from './jobGraphDiff';

/**
 * The newest content version written after this tab loaded the job, or null
 * when the tab is still on the latest edit.
 *
 * State-change events are skipped: a close or accept while you were editing is
 * not a competing graph, and treating it as one would warn on every save after
 * staff moved the job along.
 */
export function missedContentVersion(versions: JobVersionLike[], loadedVersionNumber: number | null): JobVersionLike | null {
    if (loadedVersionNumber == null) return null;
    const newer = versions
        .filter((v) => v.isEvent !== true && v.versionNumber > loadedVersionNumber)
        .sort((a, b) => b.versionNumber - a.versionNumber);
    return newer[0] ?? null;
}

/**
 * Whether the unfiltered latest content version is newer than this tab loaded.
 *
 * Used for customers, whose `versions` list omits hidden staff drafts. Staff
 * keep `missedContentVersion` so the dialog can quote the missed row and pin
 * Compare-to to it.
 */
export function missedUnfilteredContent(
    latestContentVersionNumber: number | null | undefined,
    loadedVersionNumber: number | null
): number | null {
    if (loadedVersionNumber == null || latestContentVersionNumber == null) return null;
    return latestContentVersionNumber > loadedVersionNumber ? latestContentVersionNumber : null;
}

/**
 * What `loadedVersionNumber` should be when a job first hydrates.
 *
 * Staff seed from the filtered latest content version. Customers seed from the
 * unfiltered latest content number so a pre-existing hidden staff draft does
 * not look like a concurrent save on first persist.
 */
export function seedLoadedVersionNumber(
    isStaff: boolean,
    filteredLatestVersionNumber: number | null | undefined,
    unfilteredLatestContentVersionNumber: number | null | undefined
): number | null {
    if (isStaff) return filteredLatestVersionNumber ?? null;
    return unfilteredLatestContentVersionNumber ?? filteredLatestVersionNumber ?? null;
}

/**
 * Where the version pickers should land after a successful save.
 *
 * A normal save snaps to the new latest and restores automatic compare. A save
 * that raced with someone else's version pins compare-against to the version
 * that was missed, so New/Edited/Deleted is already the reconciliation diff.
 */
export function pickersAfterSave(opts: {
    newLatestVersionNumber: number;
    missedVersionNumber?: number | null;
}): { viewing: number; baseline: number | undefined } {
    if (opts.missedVersionNumber != null) {
        return { viewing: opts.newLatestVersionNumber, baseline: opts.missedVersionNumber };
    }
    return { viewing: opts.newLatestVersionNumber, baseline: undefined };
}
