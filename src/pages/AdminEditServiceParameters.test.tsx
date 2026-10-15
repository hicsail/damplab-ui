import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The page is rendered with its collaborators replaced, and the props it hands the list editor are captured.
let editorProps: any;
vi.mock('../components/edit/parameters/ParameterListEditor', () => ({
  default: (props: any) => {
    editorProps = props;
    return null;
  }
}));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  // The route-module transform wraps the default export in a HOC that needs a data router; the page itself is what is under test.
  UNSAFE_withComponentProps: (component: unknown) => component,
  useParams: () => ({ serviceId: 'svc1' }),
  useNavigate: () => () => {}
}));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useApolloClient: () => ({}),
  useQuery: () => ({ data: undefined, error: undefined })
}));
vi.mock('../hooks/usePermissions', () => ({ PERMISSIONS: { CatalogEditorWrite: 'w' }, usePermissions: () => ({ can: () => true }) }));

import AdminEditServiceParameters from './AdminEditServiceParameters';
import { AppContext } from '../contexts/App';
import { createDragKey, renamePatch } from '../components/edit/parameters/parameterSave';

const service = { id: 'svc1', name: 'Induction', parameters: [{ id: 'old_name', name: 'Old name', type: 'string' }] };
const render = (): void => {
  renderToStaticMarkup(
    <AppContext.Provider value={{ services: [service], refreshCatalog: async () => {} } as any}>
      <AdminEditServiceParameters />
    </AppContext.Provider>
  );
};

describe('the service editor locks the ids of the parameters it loaded (F15)', () => {
  it('hands the list editor an isIdLocked that is true for a saved parameter, so a rename keeps its id', () => {
    render();
    const [saved] = editorProps.parameters;
    expect(saved.id).toBe('old_name');
    expect(editorProps.isIdLocked(saved)).toBe(true);
    // What the Name field does with that predicate.
    expect(renamePatch(saved, 'Newer name', editorProps.isIdLocked(saved))).toEqual({ name: 'Newer name' });
  });

  it('does not lock a parameter added in the session, whose id follows its name', () => {
    render();
    const added = { _dragKey: createDragKey(), id: '', name: '', type: 'string' };
    expect(editorProps.isIdLocked(added)).toBe(false);
    expect(renamePatch(added, 'Fresh', editorProps.isIdLocked(added))).toEqual({ name: 'Fresh', id: 'fresh' });
  });
});
