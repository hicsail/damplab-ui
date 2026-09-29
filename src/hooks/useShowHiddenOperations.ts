import { useCallback, useEffect, useState } from 'react';
import { PERMISSIONS, usePermissions } from './usePermissions';

/**
 * "Show hidden operations", per viewer, remembered in this browser only — a
 * convenience, not state anyone else sees. Off by default and whenever storage
 * is unavailable. Read in an effect, never during render (the app has an SSR build).
 */
export const SHOW_HIDDEN_OPERATIONS_KEY = 'canvas.showHiddenOperations';

export function readShowHidden(storage: Pick<Storage, 'getItem'> | undefined): boolean {
  try {
    return storage?.getItem(SHOW_HIDDEN_OPERATIONS_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeShowHidden(storage: Pick<Storage, 'setItem'> | undefined, value: boolean): void {
  try {
    storage?.setItem(SHOW_HIDDEN_OPERATIONS_KEY, value ? 'true' : 'false');
  } catch {
    /* private window or blocked storage: the toggle still works for this page view */
  }
}

const browserStorage = (): Storage | undefined => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
};

export function useShowHiddenOperations(): { canSeeHidden: boolean; showHidden: boolean; setShowHidden: (value: boolean) => void } {
  const { can } = usePermissions();
  const canSeeHidden = can(PERMISSIONS.CatalogEditorRead);
  const [stored, setStored] = useState(false);

  useEffect(() => {
    setStored(readShowHidden(browserStorage()));
  }, []);

  const setShowHidden = useCallback((value: boolean) => {
    setStored(value);
    writeShowHidden(browserStorage(), value);
  }, []);

  return { canSeeHidden, showHidden: canSeeHidden && stored, setShowHidden };
}
