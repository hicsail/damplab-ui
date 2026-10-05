import type { EditTypes } from './ToolBar';

/** Every view the Catalog Editor's dropdown offers. */
export const EDIT_TYPES: readonly EditTypes[] = ['Services', 'Parameter Sets', 'Categories', 'Bundles', 'Inventory', 'SOWs'];

const KEY = 'catalogEditor:editType';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const browserStore = (): Store | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    // Storage can be blocked outright (private mode, site data disabled).
    return null;
  }
};

/** The view this browser was last on, or null when there is none or it is no longer one of the views. */
export function readStoredEditType(store: Store | null = browserStore()): EditTypes | null {
  try {
    const raw = store?.getItem(KEY);
    return EDIT_TYPES.includes(raw as EditTypes) ? (raw as EditTypes) : null;
  } catch {
    return null;
  }
}

export function storeEditType(editType: EditTypes, store: Store | null = browserStore()): void {
  try {
    store?.setItem(KEY, editType);
  } catch {
    // Remembering the view is a convenience; a full or blocked store must not break the page.
  }
}
