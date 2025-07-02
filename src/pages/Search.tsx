
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, FileText, Calendar, User, Globe, Lock } from "lucide-react";

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const { searchDocuments } = useDocuments();
  const { user } = useAuth();

  const results = searchDocuments(query);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Search Documents</h1>
        <p className="text-muted-foreground">
          Find documents by title, content, or author
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter your search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="text-lg"
              />
            </div>
            <Button type="submit">
              <SearchIcon className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {query && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Search Results for "{query}"
            </h2>
            <p className="text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {results.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground text-center">
                  Try adjusting your search terms or browse all documents
                </p>
                <Button asChild className="mt-4" variant="outline">
                  <Link to="/documents">Browse Documents</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          <Link 
                            to={`/documents/${doc.id}`} 
                            className="hover:text-primary"
                          >
                            {doc.title}
                          </Link>
                        </h3>
                        <p className="text-muted-foreground line-clamp-2 mb-3">
                          {doc.content ? 
                            doc.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...' :
                            'No content available'
                          }
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-4">
                        {doc.isPublic ? (
                          <Globe className="h-4 w-4 text-green-600" />
                        ) : (
                          <Lock className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.authorName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {doc.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            Public
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          v{doc.version}
                        </Badge>
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
