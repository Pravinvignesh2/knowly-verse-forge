
import { useState } from "react";
import { Link } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, FileText, Calendar, User, Globe, Lock } from "lucide-react";

const Documents = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "mine" | "public">("all");
  
  const { documents, isLoading } = useDocuments();
  const { user } = useAuth();

  const filteredDocuments = documents
    .filter(doc => {
      if (filter === "mine") return doc.authorId === user?.id;
      if (filter === "public") return doc.isPublic;
      return true;
    })
    .filter(doc => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query) ||
        doc.authorName.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage and browse your knowledge base documents
          </p>
        </div>
        <Button asChild>
          <Link to="/documents/new">
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filter === "mine" ? "default" : "outline"}
            onClick={() => setFilter("mine")}
            size="sm"
          >
            Mine
          </Button>
          <Button
            variant={filter === "public" ? "default" : "outline"}
            onClick={() => setFilter("public")}
            size="sm"
          >
            Public
          </Button>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No documents found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery 
                ? `No documents match "${searchQuery}"`
                : "Get started by creating your first document"
              }
            </p>
            <Button asChild>
              <Link to="/documents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Document
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg truncate">
                    <Link to={`/documents/${doc.id}`} className="hover:text-primary">
                      {doc.title}
                    </Link>
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {doc.isPublic ? (
                      <Globe className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
                <CardDescription className="line-clamp-2">
                  {doc.content ? 
                    doc.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...' :
                    'No content yet'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {doc.authorName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex gap-1">
                    {doc.isPublic && (
                      <Badge variant="secondary" className="text-xs">
                        Public
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      v{doc.version}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/documents/${doc.id}`}>View</Link>
                    </Button>
                    {doc.authorId === user?.id && (
                      <Button asChild size="sm">
                        <Link to={`/documents/${doc.id}/edit`}>Edit</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Documents;
