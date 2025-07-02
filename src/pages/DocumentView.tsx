import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDocuments, getVersions } from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Globe, 
  Lock,
  History,
  Users
} from "lucide-react";
import { Document } from "@/types/document";
import { useCollaboratorCounts } from "@/hooks/useCollaboratorCounts";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import CollaboratorsModal from "@/components/document/CollaboratorsModal";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDocument, isLoading } = useDocuments();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const hasCollaborators = useCollaboratorCounts(document ? [document.id] : []);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);
  const [userPermission, setUserPermission] = useState<null | 'view' | 'edit'>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (isLoading) return; // Wait for documents to load
    const doc = getDocument(id);
    setDocument(doc);
    if (!doc) {
      navigate("/documents");
    }
  }, [id, getDocument, navigate, isLoading]);

  useEffect(() => {
    if (!document) return;
    if (document.isPublic) {
      setUserPermission('view');
      setCheckingPermission(false);
      return;
    }
    if (!user) {
      setUserPermission(null);
      setCheckingPermission(false);
      return;
    }
    if (document.authorId === user.id) {
      setUserPermission('edit');
      setCheckingPermission(false);
      return;
    }
    // Check if user is a collaborator
    setCheckingPermission(true);
    supabase
      .from('document_collaborators')
      .select('permission')
      .eq('document_id', document.id)
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (data && data.permission) {
          setUserPermission(data.permission);
        } else {
          setUserPermission(null);
        }
        setCheckingPermission(false);
      });
  }, [document, user]);

  useEffect(() => {
    if (!document) return;
    setLoadingVersions(true);
    getVersions(document.id)
      .then((data) => setVersions(data || []))
      .catch((err) => {
        setVersions([]);
        console.error('Failed to fetch versions:', err);
      })
      .finally(() => setLoadingVersions(false));
  }, [document]);

  const handlePrivacyToggle = async () => {
    if (!document) return;
    setUpdatingPrivacy(true);
    const { error } = await supabase
      .from("documents")
      .update({ is_public: !document.isPublic })
      .eq("id", document.id);
    if (!error) {
      // Refetch the updated document from Supabase
      const { data: updatedDoc, error: fetchError } = await supabase
        .from('documents')
        .select('*, profiles:author_id(username, email)')
        .eq('id', document.id)
        .single();
      if (!fetchError && updatedDoc) {
        setDocument({
          id: updatedDoc.id,
          title: updatedDoc.title,
          content: updatedDoc.content,
          authorId: updatedDoc.author_id,
          authorName: updatedDoc.profiles?.username || updatedDoc.profiles?.email || '',
          createdAt: updatedDoc.created_at,
          updatedAt: updatedDoc.updated_at,
          isPublic: updatedDoc.is_public,
          permissions: [],
          tags: [],
          version: 1,
        });
      }
      toast({
        title: `Document is now ${!document.isPublic ? "public" : "private"}`,
      });
    } else {
      toast({
        title: "Failed to update privacy",
        description: error.message,
        variant: "destructive",
      });
    }
    setUpdatingPrivacy(false);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/documents/${document?.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  };

  if (isLoading || !document || checkingPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!document.isPublic && userPermission === null) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Lock className="h-8 w-8 mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this document.</p>
      </div>
    );
  }

  const canEdit = userPermission === 'edit' || (document.authorId === user?.id);

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/documents">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button asChild>
                  <Link to={`/documents/${document.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                <Button variant="outline" onClick={() => setShowCollaborators(true)}>
                  <Users className="h-4 w-4 mr-1" /> Share
                </Button>
                <Button
                  variant={document.isPublic ? "secondary" : "outline"}
                  onClick={handlePrivacyToggle}
                  disabled={updatingPrivacy}
                >
                  {document.isPublic ? <Globe className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                  {document.isPublic ? "Public" : "Private"}
                </Button>
                <Button variant="outline" onClick={handleCopyLink}>
                  Copy Link
                </Button>
              </>
            )}
            {!canEdit && (
              <Button variant="outline" onClick={handleCopyLink}>
                Copy Link
              </Button>
            )}
          </div>
        </div>
        <CollaboratorsModal
          documentId={document.id}
          isOpen={showCollaborators}
          onOpenChange={setShowCollaborators}
          isAuthor={canEdit}
        />

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2 flex items-center gap-1">
                  {document.title}
                  {hasCollaborators[document.id] && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Users className="h-5 w-5 text-blue-500" />
                      </TooltipTrigger>
                      <TooltipContent>Has collaborators</TooltipContent>
                    </Tooltip>
                  )}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {document.authorName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {new Date(document.createdAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    Updated {new Date(document.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {document.isPublic ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Private
                  </Badge>
                )}
                <Badge variant="outline">v{document.version}</Badge>
              </div>
            </div>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="pt-6">
            <div className="prose max-w-none">
              {document.content ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: document.content || '' }}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  This document is empty. {canEdit && "Click Edit to add content."}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {versions.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingVersions ? (
                <div className="text-center py-4">Loading versions...</div>
              ) : (
                <div className="space-y-3">
                  {versions.slice(0, 5).map((version) => (
                    <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Version {version.version}</p>
                        <p className="text-sm text-muted-foreground">
                          {version.changes} • {version.author_id} • {new Date(version.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {version.version === 1 ? 'Current' : 'Historic'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default DocumentView;
