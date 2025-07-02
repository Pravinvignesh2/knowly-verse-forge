import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
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

const DocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getDocument, getVersions, isLoading } = useDocuments();
  const { user } = useAuth();
  const [document, setDocument] = useState<Document | null>(null);
  const hasCollaborators = useCollaboratorCounts(document ? [document.id] : []);

  useEffect(() => {
    if (!id) return;
    if (isLoading) return; // Wait for documents to load
    const doc = getDocument(id);
    setDocument(doc);
    if (!doc) {
      navigate("/documents");
    }
  }, [id, getDocument, navigate, isLoading]);

  if (isLoading || !document) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const canEdit = document.authorId === user?.id;
  const versions = getVersions(document.id);

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
              <Button asChild>
                <Link to={`/documents/${document.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
          </div>
        </div>

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
                <div className="whitespace-pre-wrap leading-relaxed">
                  {document.content}
                </div>
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
              <div className="space-y-3">
                {versions.slice(-5).reverse().map((version) => (
                  <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Version {version.version}</p>
                      <p className="text-sm text-muted-foreground">
                        {version.changes} • {version.authorName} • {new Date(version.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {version.version === document.version ? "Current" : "Historic"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default DocumentView;
