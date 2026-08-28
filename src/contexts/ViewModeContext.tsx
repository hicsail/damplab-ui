import { createContext, useState, useCallback } from 'react';
import type { AccessTier } from '../constants/accessTiers';

interface ViewModeContextProps {
  /**
   * The access tier an administrator is currently previewing the UI as, or `null`
   * when they are seeing their own.
   */
  previewTier: AccessTier | null;
  setPreviewTier: (tier: AccessTier | null) => void;
}

export const ViewModeContext = createContext<ViewModeContextProps>({
  previewTier: null,
  setPreviewTier: () => {},
});

/**
 * Which tier the header's view-as dropdown is previewing.
 *
 * **In-memory on purpose.** Persisting the choice would leave an administrator in a
 * reduced view across a refresh with no memory of having chosen it — and the control
 * that exits the preview is itself in the header, so a persisted preview that hid the
 * header would be unrecoverable. A refresh returning you to your own view is the
 * cheap, obvious escape hatch.
 *
 * This replaced a two-state `isClientView` boolean. The boolean could only express
 * "staff or not", which is one of the four matrix columns; a technician preview and an
 * equipment-user preview were unreachable.
 */
export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [previewTier, setPreviewTierState] = useState<AccessTier | null>(null);
  const setPreviewTier = useCallback((tier: AccessTier | null) => setPreviewTierState(tier), []);

  return (
    <ViewModeContext value={{ previewTier, setPreviewTier }}>
      {children}
    </ViewModeContext>
  );
}
