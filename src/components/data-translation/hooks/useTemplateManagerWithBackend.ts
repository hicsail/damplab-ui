import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Template, FileData, AlertState, CreateTemplateInput, ColumnMapping } from '../types';
import { templateStorage, applyTemplateToData } from '../utils';
import { GET_TEMPLATES } from '../../../gql/queries';
import { 
  CREATE_TEMPLATE, 
  DELETE_TEMPLATE, 
  UPDATE_TEMPLATE 
} from '../../../gql/mutations';

export const useTemplateManagerWithBackend = () => {
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  // GraphQL hooks
  const { data, loading, error, refetch } = useQuery(GET_TEMPLATES, {
    onError: (error) => {
      console.warn('Failed to fetch templates from backend, falling back to localStorage:', error);
      setUseLocalStorage(true);
      // Load from localStorage as fallback
      const localTemplates = templateStorage.load();
      setSavedTemplates(localTemplates);
    },
    onCompleted: (data) => {
      if (data?.templates) {
        // Convert backend templates to match our interface
        const templates = data.templates.map((template: any) => ({
          ...template,
          createdAt: new Date(template.createdAt).toISOString()
        }));
        setSavedTemplates(templates);
        setUseLocalStorage(false);
      }
    }
  });

  const [createTemplateMutation] = useMutation(CREATE_TEMPLATE, {
    onError: (error) => {
      console.warn('Failed to create template on backend:', error);
      setUseLocalStorage(true);
    },
    onCompleted: () => {
      refetch(); // Refresh the template list
    }
  });

  const [deleteTemplateMutation] = useMutation(DELETE_TEMPLATE, {
    onError: (error) => {
      console.warn('Failed to delete template on backend:', error);
      setUseLocalStorage(true);
    },
    onCompleted: () => {
      refetch(); // Refresh the template list
    }
  });

  const [updateTemplateMutation] = useMutation(UPDATE_TEMPLATE, {
    onError: (error) => {
      console.warn('Failed to update template on backend:', error);
      setUseLocalStorage(true);
    },
    onCompleted: () => {
      refetch(); // Refresh the template list
    }
  });

  // Load templates on mount
  useEffect(() => {
    if (!loading && !error && !data) {
      // If backend is not available, load from localStorage
      const localTemplates = templateStorage.load();
      setSavedTemplates(localTemplates);
      setUseLocalStorage(true);
    }
  }, [loading, error, data]);

  const saveTemplate = async (
    name: string, 
    description: string, 
    fileData: FileData,
    setAlert: (alert: AlertState) => void
  ): Promise<void> => {
    const columnMapping: ColumnMapping[] = fileData.columns.map((col, index) => ({
      field: col.field,
      headerName: col.headerName || col.field,
      type: col.type || 'string',
      width: col.width || 150,
      order: index
    }));

    const templateInput: CreateTemplateInput = {
      name,
      description,
      columnMapping
    };

    if (useLocalStorage) {
      // Use localStorage fallback
      const template = templateStorage.create(name, description, fileData);
      const updatedTemplates = [...savedTemplates, template];
      setSavedTemplates(updatedTemplates);
      templateStorage.save(updatedTemplates);

      setAlert({
        open: true,
        message: `Template "${name}" saved locally (backend unavailable)!`,
        severity: 'warning'
      });
    } else {
      try {
        await createTemplateMutation({
          variables: { input: templateInput }
        });

        setAlert({
          open: true,
          message: `Template "${name}" saved successfully to backend!`,
          severity: 'success'
        });
      } catch (error) {
        console.error('Failed to save template to backend, falling back to localStorage:', error);
        setUseLocalStorage(true);
        
        // Fallback to localStorage
        const template = templateStorage.create(name, description, fileData);
        const updatedTemplates = [...savedTemplates, template];
        setSavedTemplates(updatedTemplates);
        templateStorage.save(updatedTemplates);

        setAlert({
          open: true,
          message: `Template "${name}" saved locally (backend failed)!`,
          severity: 'warning'
        });
      }
    }
  };

  const applyTemplate = (
    template: Template, 
    fileData: FileData,
    setFileData: (data: FileData) => void,
    setAlert: (alert: AlertState) => void
  ): void => {
    const updatedFileData = applyTemplateToData(fileData, template);
    setFileData(updatedFileData);

    setAlert({
      open: true,
      message: `Template "${template.name}" applied successfully! Columns reordered and filtered.`,
      severity: 'success'
    });
  };

  const deleteTemplate = async (
    templateId: string,
    setAlert: (alert: AlertState) => void
  ): Promise<void> => {
    if (useLocalStorage) {
      // Use localStorage fallback
      const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
      setSavedTemplates(updatedTemplates);
      templateStorage.save(updatedTemplates);

      setAlert({
        open: true,
        message: 'Template deleted successfully from local storage!',
        severity: 'success'
      });
    } else {
      try {
        await deleteTemplateMutation({
          variables: { id: templateId }
        });

        setAlert({
          open: true,
          message: 'Template deleted successfully from backend!',
          severity: 'success'
        });
      } catch (error) {
        console.error('Failed to delete template from backend, falling back to localStorage:', error);
        setUseLocalStorage(true);
        
        // Fallback to localStorage
        const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
        setSavedTemplates(updatedTemplates);
        templateStorage.save(updatedTemplates);

        setAlert({
          open: true,
          message: 'Template deleted from local storage (backend failed)!',
          severity: 'warning'
        });
      }
    }
  };

  const retryBackendConnection = async (): Promise<void> => {
    try {
      await refetch();
      setUseLocalStorage(false);
    } catch (error) {
      console.warn('Backend still unavailable:', error);
    }
  };

  const forceLocalStorage = (): void => {
    setUseLocalStorage(true);
    const localTemplates = templateStorage.load();
    setSavedTemplates(localTemplates);
  };

  return {
    savedTemplates,
    saveTemplate,
    applyTemplate,
    deleteTemplate,
    loading,
    useLocalStorage,
    retryBackendConnection,
    forceLocalStorage
  };
};
