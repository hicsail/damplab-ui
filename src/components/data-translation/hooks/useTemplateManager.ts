import { useState, useEffect } from 'react';
import { Template, FileData, AlertState } from '../types';
import { templateStorage, applyTemplateToData } from '../utils';

export const useTemplateManager = () => {
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);

  // Load saved templates on mount
  useEffect(() => {
    setSavedTemplates(templateStorage.load());
  }, []);

  const saveTemplate = (
    name: string, 
    description: string, 
    fileData: FileData,
    setAlert: (alert: AlertState) => void
  ): void => {
    const template = templateStorage.create(name, description, fileData);
    const updatedTemplates = [...savedTemplates, template];
    
    setSavedTemplates(updatedTemplates);
    templateStorage.save(updatedTemplates);

    setAlert({
      open: true,
      message: `Template "${name}" saved successfully!`,
      severity: 'success'
    });
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

  const deleteTemplate = (
    templateId: string,
    setAlert: (alert: AlertState) => void
  ): void => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    templateStorage.save(updatedTemplates);

    setAlert({
      open: true,
      message: 'Template deleted successfully!',
      severity: 'success'
    });
  };

  return {
    savedTemplates,
    saveTemplate,
    applyTemplate,
    deleteTemplate
  };
};
