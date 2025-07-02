import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useCollaboratorCounts
 * Fetches whether each document in the list has collaborators (excluding the author).
 * @param documentIds Array of document IDs
 * @returns Object mapping documentId to boolean (true if has collaborators)
 */
export function useCollaboratorCounts(documentIds: string[]) {
  const [hasCollaborators, setHasCollaborators] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!documentIds.length) {
      setHasCollaborators({});
      return;
    }
    let isMounted = true;
    async function fetchCounts() {
      // Query all document_collaborators for these document IDs
      const { data, error } = await supabase
        .from('document_collaborators')
        .select('document_id')
        .in('document_id', documentIds);
      if (error) {
        // Fail gracefully: treat as no collaborators
        if (isMounted) setHasCollaborators({});
        return;
      }
      // Build a set of document IDs that have at least one collaborator
      const docIdsWithCollab = new Set(data.map((row: { document_id: string }) => row.document_id));
      const result: Record<string, boolean> = {};
      for (const id of documentIds) {
        result[id] = docIdsWithCollab.has(id);
      }
      if (isMounted) setHasCollaborators(result);
    }
    fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [documentIds.join(',')]);

  return hasCollaborators;
} 