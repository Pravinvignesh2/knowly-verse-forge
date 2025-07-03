import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDocuments } from "@/hooks/useDocuments";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, Users } from "lucide-react";
import { useCollaboratorCounts } from "@/hooks/useCollaboratorCounts";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import html2pdf from "html2pdf.js";


const Index = () => {
  const { user } = useAuth();
  const { documents } = useDocuments();

  const recentDocuments = documents
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const documentIds = recentDocuments.map(doc => doc.id);
  const hasCollaborators = useCollaboratorCounts(documentIds);

  const myDocuments = documents.filter(doc => doc.authorId === user?.id);
  const publicDocuments = documents.filter(doc => doc.isPublic);

const handleDownloadPDF = async (docId: string) => {
  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", docId)
    .single();

  if (error || !doc) {
    console.error("Failed to fetch document for PDF:", error);
    return;
  }

  const container = document.getElementById("pdf-export-container");
  if (!container) return;

  // Inject full document HTML
  container.innerHTML = `
    <div style="padding: 24px; font-family: sans-serif; max-width: 800px;">
      <h1 style="margin-bottom: 8px;">${doc.title}</h1>
      <div style="font-size: 14px; color: #555;">
        <p><strong>Author ID:</strong> ${doc.author_id}</p>
        <p><strong>Created:</strong> ${new Date(doc.created_at).toLocaleString()}</p>
        <p><strong>Updated:</strong> ${new Date(doc.updated_at).toLocaleString()}</p>
        <p><strong>Visibility:</strong> ${doc.is_public ? "Public" : "Private"}</p>
        <p><strong>Version:</strong> v${doc.version || 1}</p>
      </div>
      <hr style="margin: 16px 0;" />
      <div style="white-space: normal; font-size: 15px;">
        ${doc.content || "<i>No content available.</i>"}
      </div>
    </div>
  `;

  // Temporarily show container to allow rendering
  container.style.display = "block";

  // Use setTimeout to allow the DOM to finish rendering before pdf generation
  setTimeout(() => {
    const opt = {
      margin: 0.5,
      filename: `${doc.title || "document"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf()
      .from(container)
      .set(opt)
      .save()
      .then(() => {
        container.style.display = "none"; // Hide again after generating PDF
      });
  }, 100); // Slight delay for DOM readiness
};



  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back, {user?.user_metadata?.name || user?.email || ''}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Here's what's happening in your knowledge base today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Documents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myDocuments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Public Documents</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{publicDocuments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Action</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="w-full">
                <Link to="/documents/new">New Document</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>
                Your recently updated documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentDocuments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No documents yet. Create your first document to get started!
                  </p>
                ) : (
                  recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <Link to={`/documents/${doc.id}`} className="font-medium hover:text-primary truncate block">
                            {doc.title}
                          </Link>
                          {hasCollaborators[doc.id] && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Users className="h-4 w-4 text-blue-500" />
                              </TooltipTrigger>
                              <TooltipContent>Has collaborators</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Updated {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadPDF(doc.id)}
                      >
                        <Download className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Button>

                      <div className="flex items-center gap-2">
                        {doc.isPublic && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                            Public
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}

              </div>
              <div className="mt-4">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/documents">View All Documents</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to get you started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link to="/documents/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Document
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link to="/search">
                    <Search className="mr-2 h-4 w-4" />
                    Search Documents
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start" variant="outline">
                  <Link to="/documents">
                    <FileText className="mr-2 h-4 w-4" />
                    Browse All Documents
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <div id="pdf-export-container" style={{ display: "none" }}></div>

    </TooltipProvider>
  );
};

export default Index;
