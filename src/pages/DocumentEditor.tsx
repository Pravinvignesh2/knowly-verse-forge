
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocuments } from "@/hooks/useDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, ArrowLeft } from "lucide-react";

const DocumentEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createDocument, updateDocument, getDocument } = useDocuments();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing && id) {
      const doc = getDocument(id);
      if (doc) {
        setTitle(doc.title);
        setContent(doc.content);
        setIsPublic(doc.isPublic);
      } else {
        toast({
          title: "Document not found",
          description: "The document you're trying to edit doesn't exist.",
          variant: "destructive",
        });
        navigate("/documents");
      }
    }
  }, [id, isEditing, getDocument, navigate, toast]);

  // Auto-save functionality
  useEffect(() => {
    if (!isEditing || !id || !title) return;

    const autoSaveTimer = setTimeout(() => {
      updateDocument(id, { title, content, isPublic });
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [title, content, isPublic, id, isEditing, updateDocument]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your document.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing && id) {
        const updatedDoc = updateDocument(id, { title, content, isPublic });
        if (updatedDoc) {
          toast({
            title: "Document updated",
            description: "Your changes have been saved successfully.",
          });
        }
      } else {
        const newDoc = createDocument(title, content, isPublic);
        toast({
          title: "Document created",
          description: "Your new document has been created successfully.",
        });
        navigate(`/documents/${newDoc.id}/edit`);
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "There was an error saving your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (isEditing && id) {
      navigate(`/documents/${id}`);
    } else {
      navigate("/documents");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Document" : "New Document"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter document title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="public">Public Document</Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone with the link to view this document
              </p>
            </div>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Start writing your document..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[400px] resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {isEditing && "Auto-saves every 2 seconds"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentEditor;
