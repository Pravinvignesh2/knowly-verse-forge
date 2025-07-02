import { useState, useEffect } from 'react';
import { Document, DocumentVersion } from '@/types/document';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'kb_documents';
const VERSIONS_KEY = 'kb_document_versions';

const getUserStorageKey = (userId: string) => `kb_documents_${userId}`;

const loadAllPublicDocuments = (): Document[] => {
  // Scan all localStorage keys for public documents
  const docs: Document[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('kb_documents_')) {
      try {
        const userDocs: Document[] = JSON.parse(localStorage.getItem(key) || '[]');
        docs.push(...userDocs.filter(doc => doc.isPublic));
      } catch {}
    }
  }
  return docs;
};

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadDocuments();
    } else {
      setDocuments([]);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDocuments = () => {
    try {
      if (!user) return;
      // Load current user's documents
      const userDocsRaw = localStorage.getItem(getUserStorageKey(user.id));
      const userDocs: Document[] = userDocsRaw ? JSON.parse(userDocsRaw) : [];
      // Load all public documents from all users (excluding current user's own public docs to avoid duplicates)
      const publicDocs = loadAllPublicDocuments().filter(doc => doc.authorId !== user.id);
      setDocuments([...userDocs, ...publicDocs]);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDocuments = (docs: Document[]) => {
    if (!user) return;
    try {
      localStorage.setItem(getUserStorageKey(user.id), JSON.stringify(docs));
      // After saving, reload to update the combined list
      loadDocuments();
    } catch (error) {
      console.error('Error saving documents:', error);
    }
  };

  const createDocument = (title: string, content: string = '', isPublic: boolean = false): Document => {
    if (!user) throw new Error('User not authenticated');

    const userDocsRaw = localStorage.getItem(getUserStorageKey(user.id));
    const userDocs: Document[] = userDocsRaw ? JSON.parse(userDocsRaw) : [];

    const newDoc: Document = {
      id: Date.now().toString(),
      title,
      content,
      authorId: user.id,
      authorName: user.user_metadata?.name || user.email || 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic,
      permissions: [],
      tags: [],
      version: 1,
    };

    const updatedDocs = [...userDocs, newDoc];
    saveDocuments(updatedDocs);
    // Save initial version
    saveVersion(newDoc.id, content, 'Document created');
    return newDoc;
  };

  const updateDocument = (id: string, updates: Partial<Document>): Document | null => {
    if (!user) throw new Error('User not authenticated');
    const userDocsRaw = localStorage.getItem(getUserStorageKey(user.id));
    const userDocs: Document[] = userDocsRaw ? JSON.parse(userDocsRaw) : [];
    const docIndex = userDocs.findIndex(doc => doc.id === id);
    if (docIndex === -1) return null;
    const updatedDoc = {
      ...userDocs[docIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      version: userDocs[docIndex].version + 1,
    };
    const updatedDocs = [...userDocs];
    updatedDocs[docIndex] = updatedDoc;
    saveDocuments(updatedDocs);
    // Save version if content changed
    if (updates.content && updates.content !== userDocs[docIndex].content) {
      saveVersion(id, updates.content, 'Content updated');
    }
    return updatedDoc;
  };

  const deleteDocument = (id: string): boolean => {
    if (!user) return false;
    const userDocsRaw = localStorage.getItem(getUserStorageKey(user.id));
    const userDocs: Document[] = userDocsRaw ? JSON.parse(userDocsRaw) : [];
    const updatedDocs = userDocs.filter(doc => doc.id !== id);
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

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .not('username', 'is', null)
    .neq('username', '');
  if (error) throw error;
  return data;
}
