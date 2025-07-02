import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Document } from '@/types/document';
import { useToast } from '@/hooks/use-toast';

// Map Supabase row to UI Document type
const mapDocument = (doc: any): Document => ({
  id: doc.id,
  title: doc.title,
  content: doc.content,
  authorId: doc.author_id,
  authorName: doc.profiles?.username || doc.profiles?.email || '',
  createdAt: doc.created_at,
  updatedAt: doc.updated_at,
  isPublic: doc.is_public,
  permissions: [], // Fill if you fetch permissions
  tags: [], // Fill if you add tags
  version: 1, // Default to 1 for now
});

// Save a new version to Supabase
export type SaveVersionParams = {
  documentId: string;
  content: string;
  authorId: string;
  changes: string;
  version: number;
};

export const saveVersion = async ({ documentId, content, authorId, changes, version }: SaveVersionParams) => {
  const { error } = await supabase.from('document_versions').insert({
    document_id: documentId,
    version,
    content,
    author_id: authorId,
    changes,
  });
  if (error) throw error;
};

// Fetch all versions for a document
export const getVersions = async (documentId: string) => {
  const { data, error } = await supabase
    .from('document_versions')
    .select('id, version, content, author_id, created_at, changes')
    .eq('document_id', documentId)
    .order('version', { ascending: false });
  if (error) throw error;
  return data;
};

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all accessible documents for the user
  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // 1. Public documents (join profiles)
      const { data: publicDocs, error: publicError } = await supabase
        .from('documents')
        .select('*, profiles:author_id(username, email)')
        .eq('is_public', true);
      if (publicError) throw publicError;

      // 2. Documents where user is author (join profiles)
      const { data: myDocs, error: myError } = await supabase
        .from('documents')
        .select('*, profiles:author_id(username, email)')
        .eq('author_id', user.id);
      if (myError) throw myError;

      // 3. Documents where user is a collaborator
      const { data: collabRows, error: collabError } = await supabase
        .from('document_collaborators')
        .select('document_id')
        .eq('user_id', user.id);
      if (collabError) throw collabError;
      const collabDocIds = collabRows?.map(row => row.document_id) || [];
      let collabDocs: Document[] = [];
      if (collabDocIds.length > 0) {
        const { data, error } = await supabase
          .from('documents')
          .select('*, profiles:author_id(username, email)')
          .in('id', collabDocIds);
        if (error) throw error;
        collabDocs = (data || []).map(mapDocument);
      }

      // Merge and deduplicate, map all
      const allDocs = [
        ...(publicDocs || []).map(mapDocument),
        ...(myDocs || []).map(mapDocument),
        ...collabDocs,
      ];
      const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values());

      // Fetch latest version for each document
      const docsWithVersion = await Promise.all(
        uniqueDocs.map(async (doc) => {
          const { data: versionRows, error: versionError } = await supabase
            .from('document_versions')
            .select('version')
            .eq('document_id', doc.id)
            .order('version', { ascending: false })
            .limit(1);
          if (!versionError && versionRows && versionRows.length > 0) {
            return { ...doc, version: versionRows[0].version };
          }
          return doc;
        })
      );
      setDocuments(docsWithVersion as Document[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load documents');
      setDocuments([]);
      console.error('Document fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Create a new document
  const createDocument = async (title: string, content: string = '', isPublic: boolean = false): Promise<Document | null> => {
    if (!user) throw new Error('User not authenticated');
    const { data, error } = await supabase.from('documents').insert({
      title,
      content,
      author_id: user.id,
      is_public: isPublic,
    }).select('*').single();
    if (error) {
      console.error('Supabase insert error:', error);
      toast({
        title: 'Document creation failed',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
    // Save initial version
    await saveVersion({
      documentId: data.id,
      content: data.content,
      authorId: user.id,
      changes: 'Document created',
      version: 1,
    });
    await fetchDocuments();
    toast({
      title: 'Document created',
      description: 'Your new document has been created successfully.',
    });
    return data as Document;
  };

  // Update a document
  const updateDocument = async (id: string, updates: Record<string, any>): Promise<Document | null> => {
    if (!user) throw new Error('User not authenticated');
    // Get latest version number
    const versions = await getVersions(id);
    const latestVersion = versions && versions.length > 0 ? versions[0].version : 1;
    const { data, error } = await supabase.from('documents').update({
      ...updates,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single();
    if (error) throw error;
    // Save new version if content changed
    if (updates.content) {
      await saveVersion({
        documentId: id,
        content: updates.content,
        authorId: user.id,
        changes: 'Content updated',
        version: latestVersion + 1,
      });
    }
    await fetchDocuments();
    return data as Document;
  };

  // Delete a document
  const deleteDocument = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    await fetchDocuments();
    return true;
  };

  // Get a single document from the loaded list
  const getDocument = (id: string): Document | null => {
    return documents.find(doc => doc.id === id) || null;
  };

  // Search documents by title/content/author
  const searchDocuments = (query: string): Document[] => {
    if (!query.trim()) return documents;
    const lowercaseQuery = query.toLowerCase();
    return documents.filter(doc =>
      doc.title.toLowerCase().includes(lowercaseQuery) ||
      (doc.content || '').toLowerCase().includes(lowercaseQuery)
    );
  };

  return {
    documents,
    isLoading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    searchDocuments,
    refetch: fetchDocuments,
  };
};

// Fetch profiles helper remains unchanged
export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, avatar_url')
    .not('username', 'is', null)
    .neq('username', '');
  if (error) throw error;
  return data;
}
