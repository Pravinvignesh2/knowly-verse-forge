
import { useState, useEffect } from 'react';
import { Document, DocumentVersion } from '@/types/document';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'kb_documents';
const VERSIONS_KEY = 'kb_document_versions';

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDocuments(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDocuments = (docs: Document[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
      setDocuments(docs);
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  };

  const createDocument = (title: string, content: string = '', isPublic: boolean = false): Document => {
    if (!user) throw new Error('User not authenticated');

    const newDoc: Document = {
      id: Date.now().toString(),
      title,
      content,
      authorId: user.id,
      authorName: user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic,
      permissions: [],
      tags: [],
      version: 1,
    };

    const updatedDocs = [...documents, newDoc];
    saveDocuments(updatedDocs);
    
    // Save initial version
    saveVersion(newDoc.id, content, 'Document created');
    
    return newDoc;
  };

  const updateDocument = (id: string, updates: Partial<Document>): Document | null => {
    if (!user) throw new Error('User not authenticated');

    const docIndex = documents.findIndex(doc => doc.id === id);
    if (docIndex === -1) return null;

    const updatedDoc = {
      ...documents[docIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: documents[docIndex].version + 1,
    };

    const updatedDocs = [...documents];
    updatedDocs[docIndex] = updatedDoc;
    saveDocuments(updatedDocs);

    // Save version if content changed
    if (updates.content && updates.content !== documents[docIndex].content) {
      saveVersion(id, updates.content, 'Content updated');
    }

    return updatedDoc;
  };

  const deleteDocument = (id: string): boolean => {
    const updatedDocs = documents.filter(doc => doc.id !== id);
    saveDocuments(updatedDocs);
    return true;
  };

  const getDocument = (id: string): Document | null => {
    return documents.find(doc => doc.id === id) || null;
  };

  const searchDocuments = (query: string): Document[] => {
    if (!query.trim()) return documents;
    
    const lowercaseQuery = query.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(lowercaseQuery) ||
      doc.content.toLowerCase().includes(lowercaseQuery) ||
      doc.authorName.toLowerCase().includes(lowercaseQuery)
    );
  };

  const saveVersion = (documentId: string, content: string, changes: string) => {
    if (!user) return;

    try {
      const versions = getVersions(documentId);
      const newVersion: DocumentVersion = {
        id: `${documentId}_v${versions.length + 1}`,
        documentId,
        version: versions.length + 1,
        content,
        authorId: user.id,
        authorName: user.name,
        createdAt: new Date().toISOString(),
        changes,
      };

      const allVersions = JSON.parse(localStorage.getItem(VERSIONS_KEY) || '[]');
      allVersions.push(newVersion);
      localStorage.setItem(VERSIONS_KEY, JSON.stringify(allVersions));
    } catch (error) {
      console.error('Error saving version:', error);
    }
  };

  const getVersions = (documentId: string): DocumentVersion[] => {
    try {
      const allVersions = JSON.parse(localStorage.getItem(VERSIONS_KEY) || '[]');
      return allVersions.filter((v: DocumentVersion) => v.documentId === documentId);
    } catch (error) {
      console.error('Error loading versions:', error);
      return [];
    }
  };

  return {
    documents,
    isLoading,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    searchDocuments,
    getVersions,
  };
};
