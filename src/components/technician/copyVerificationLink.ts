import { formatGqlError } from '../../utils/gqlError';

export type CopyVerificationOutcome =
  | { kind: 'copied' }
  /** The clipboard was unavailable or refused: show the URL so staff can copy it by hand. */
  | { kind: 'manual'; url: string }
  | { kind: 'error'; message: string };

/**
 * Mint the customer's hosted verification link and put it on the clipboard. Minted on every click
 * rather than cached: the server owns the link's lifetime, and a stale one copied into an email is
 * worse than a round trip. Never throws.
 */
export async function copyVerificationLink(
  mint: () => Promise<string>,
  writeText: ((text: string) => Promise<void>) | undefined
): Promise<CopyVerificationOutcome> {
  let url: string;
  try {
    url = await mint();
  } catch (e) {
    return { kind: 'error', message: formatGqlError(e, 'Could not create a verification link.') };
  }
  try {
    if (!writeText) throw new Error('No clipboard');
    await writeText(url);
    return { kind: 'copied' };
  } catch {
    return { kind: 'manual', url };
  }
}
