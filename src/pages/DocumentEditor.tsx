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
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlock from '@tiptap/extension-code-block';
import Mention from '@tiptap/extension-mention';
import { fetchProfiles } from '@/hooks/useDocuments';
import React from "react";
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DocumentEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createDocument, updateDocument, getDocument, isLoading } = useDocuments();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState({ title: '', content: '', isPublic: false });
  const [editorContent, setEditorContent] = useState(content);
  const initialContentLoaded = React.useRef(false);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [collaboratorQuery, setCollaboratorQuery] = useState('');
  const [selectedCollaborators, setSelectedCollaborators] = useState([]); // [{id, username, email}]

  const isEditing = Boolean(id);

  // Add a ref to track last version save time
  const lastVersionSaveTimeRef = React.useRef<number>(Date.now());

  useEffect(() => {
    fetchProfiles().then(users => {
      setMentionUsers(users);
      console.log('Mention users:', users);
    }).catch(console.error);
  }, []);

  // Debug: log current user and mentionUsers
  console.log('Current user:', user);
  console.log('Mention users:', mentionUsers);

  // Filter users for collaborator search (exclude current user and already added collaborators)
  const filteredCollaborators = mentionUsers.filter(u =>
    u.id !== user?.id &&
    !selectedCollaborators.some(c => c.id === u.id)
  );
  console.log('Filtered collaborators:', filteredCollaborators);

  // Fix MentionList typing and usage
  interface MentionListProps {
    items: any[];
    command: (arg: any) => void;
  }
  const MentionList = React.forwardRef<HTMLDivElement, MentionListProps>(({ items, command }, ref) => {
    const filteredItems = items.filter(item => item.id !== user?.id);
    console.log('Mention filteredItems:', filteredItems);
    return (
      <div ref={ref} className="bg-white border rounded shadow p-2 max-h-60 overflow-y-auto dark:bg-neutral-900 dark:text-white dark:border-neutral-700">
        {filteredItems.length ? (
          filteredItems.map((item, index) => (
            <div
              key={item.id}
              className="p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-neutral-800"
              onClick={() => command({ id: item.id, label: item.username })}
            >
              @{item.username}
            </div>
          ))
        ) : (
          <div className="p-2 text-gray-400 dark:text-gray-500">No users found</div>
        )}
      </div>
    );
  });

  // Fetch collaborators from Supabase
  const fetchCollaborators = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('document_collaborators')
      .select('user_id, profiles:profiles(username, email)')
      .eq('document_id', id);

    console.log('Fetched collaborators:', data, error);

    if (!error && data) {
      setSelectedCollaborators(
        data
          .filter(row => row.profiles) // Only include rows with a valid profile
          .map(row => ({
            id: row.user_id,
            username: row.profiles.username,
            email: row.profiles.email,
          }))
      );
    }
  };

  // Fetch collaborators when modal opens
  useEffect(() => {
    if (showCollaborators) fetchCollaborators();
  }, [showCollaborators]);

  // Add collaborator with debug logs
  const addCollaborator = async (collaborator) => {
    console.log('Add button clicked', collaborator);
    if (!id || !user) {
      console.log('Missing id or user', id, user);
      return;
    }
    try {
      const { error: collabError, data: collabData } = await supabase.from('document_collaborators').insert({
        document_id: id,
        user_id: collaborator.id,
        added_by: user.id,
      });
      console.log('collabError:', collabError, 'collabData:', collabData);
      if (collabError) throw collabError;
      const { error: notifError, data: notifData } = await supabase.from('notifications').insert({
        user_id: collaborator.id,
        type: 'collaborator_added',
        document_id: id,
        message: `${user.user_metadata?.name || user.email} added you as a collaborator.`,
      });
      console.log('notifError:', notifError, 'notifData:', notifData);
      if (notifError) throw notifError;
      setCollaboratorQuery('');
      // Optimistically update UI
      setSelectedCollaborators(prev => [
        ...prev,
        { id: collaborator.id, username: collaborator.username, email: collaborator.email }
      ]);
      toast({ title: 'Collaborator added', description: `@${collaborator.username} has been added.` });
    } catch (err) {
      console.log('Add collaborator error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to add collaborator', variant: 'destructive' });
    }
  };

  const removeCollaborator = async (userId) => {
    if (!id) return;
    await supabase.from('document_collaborators').delete().eq('document_id', id).eq('user_id', userId);
    // Optimistically update UI
    setSelectedCollaborators(prev => prev.filter(u => u.id !== userId));
  };

  // Memoize mention extension to avoid recreating on every render
  const mentionExtension = React.useMemo(() =>
    Mention.configure({
      HTMLAttributes: { class: 'mention' },
      suggestion: {
        items: ({ query }) => {
          // Only show users with a username, not the current user
          const filtered = mentionUsers
            .filter(
              u =>
                u.username &&
                u.username.toLowerCase().includes(query.toLowerCase()) &&
                u.id !== user?.id
            )
            .slice(0, 5);
          // Debug: log what is being suggested
          console.log('Mention suggestion items:', filtered, 'query:', query);
          return filtered;
        },
        render: () => {
          let reactRenderer;
          let popup;
          return {
            onStart: props => {
              reactRenderer = new ReactRenderer(MentionList as any, {
                props,
                editor: props.editor,
              });
              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: reactRenderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },
            onUpdate(props) {
              reactRenderer.updateProps(props);
              if (popup) {
                popup[0].setProps({ getReferenceClientRect: props.clientRect });
              }
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }
              return false;
            },
            onExit() {
              if (popup) popup[0].destroy();
              if (reactRenderer) reactRenderer.destroy();
            },
          };
        },
      },
    }), [mentionUsers, user]);

  // useEditor must be called at the top level
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Underline,
      mentionExtension,
    ],
    content: editorContent,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[400px] p-3 border rounded-md bg-white text-black focus:outline-none dark:bg-neutral-900 dark:text-white dark:border-neutral-700',
      },
    },
  });

  // Set editor content only once after editor and doc are ready
  useEffect(() => {
    if (!isEditing || !id) return;
    if (isLoading) return;
    const doc = getDocument(id);
    if (
      doc &&
      editor &&
      editor.commands &&
      typeof editor.commands.setContent === 'function' &&
      !initialContentLoaded.current
    ) {
      editor.commands.setContent(doc.content || '');
      initialContentLoaded.current = true;
    }
  }, [id, isEditing, getDocument, isLoading, editor]);

  // Set React state only if different
  useEffect(() => {
    if (!isEditing || !id) return;
    if (isLoading) return;
      const doc = getDocument(id);
      if (doc) {
      if (title !== doc.title) setTitle(doc.title);
      if (content !== doc.content) setContent(doc.content);
      if (isPublic !== doc.isPublic) setIsPublic(doc.isPublic);
    }
  }, [id, isEditing, getDocument, isLoading]);

  // Auto-save functionality (throttled versioning)
  useEffect(() => {
    if (!isEditing || !id || !title) return;
    const latestContent = editor?.getHTML() ?? content;
    if (
      title === lastSaved.title &&
      latestContent === lastSaved.content &&
      isPublic === lastSaved.isPublic
    ) {
      return;
    }
    const autoSaveTimer = setTimeout(async () => {
      const now = Date.now();
      // Only create a new version if at least 1 minute has passed since last version
      if (now - lastVersionSaveTimeRef.current >= 60000) {
        await updateDocument(id, { title, content: latestContent, is_public: isPublic });
        lastVersionSaveTimeRef.current = now;
      } else {
        // Just update the document without creating a new version (skip versioning logic)
        await supabase.from('documents').update({
          title,
          content: latestContent,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        }).eq('id', id);
      }
      setLastSaved({ title, content: latestContent, isPublic });
    }, 2000);
    return () => clearTimeout(autoSaveTimer);
  }, [title, content, isPublic, id, isEditing, updateDocument, lastSaved, editor]);

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
      const latestContent = editor?.getHTML() ?? content;
      // Parse mentions from content
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const mentionedUsernames = Array.from(latestContent.matchAll(mentionRegex)).map(m => m[1]);
      const mentionedUsers = mentionUsers.filter(u => mentionedUsernames.includes(u.username));

      let docId;
      if (isEditing && id) {
        const updatedDoc = await updateDocument(id, { title, content: latestContent, is_public: isPublic });
        docId = id;
        if (updatedDoc) {
          toast({
            title: "Document updated",
            description: "Your changes have been saved successfully.",
          });
          navigate("/documents");
        }
      } else {
        const newDoc = await createDocument(title, latestContent, isPublic);
        if (newDoc) {
          docId = newDoc.id;
          toast({
            title: "Document created",
            description: "Your new document has been created successfully.",
          });
          navigate(`/documents/${newDoc.id}`);
        }
      }

      // Auto-share and notify mentioned users
      for (const user of mentionedUsers) {
        // Add to permissions (if not already present)
        // (Assume updateDocument handles permissions array, or add logic here)
        // Send notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          document_id: docId,
          message: `You were mentioned in "${title}"`,
        });
      }
    } catch (error) {
      console.error('Save error:', error);
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

  // Only render modal and mention UI if user is loaded
  if (!user) return null;

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
        <div className="flex gap-2">
          <Button onClick={() => setShowCollaborators(true)} variant="outline">Collaborators</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
      </div>

      {/* Collaborators Modal */}
      <Dialog open={showCollaborators} onOpenChange={setShowCollaborators}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collaborators</DialogTitle>
          </DialogHeader>
          <div className="mb-2">
            <Input
              placeholder="Search users..."
              value={collaboratorQuery}
              onChange={e => setCollaboratorQuery(e.target.value)}
              className="bg-white text-black border dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
            />
          </div>
          <div className="max-h-40 overflow-y-auto mb-2">
            {filteredCollaborators.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded">
                <span>@{user.username} ({user.email})</span>
                <Button size="sm" variant="outline" onClick={() => addCollaborator(user)}>
                  Add
                </Button>
              </div>
            ))}
            {filteredCollaborators.length === 0 && <div className="text-gray-400 dark:text-gray-500 p-2">No users found</div>}
          </div>
          <div>
            <div className="font-semibold mb-1">Current Collaborators:</div>
            {selectedCollaborators.length === 0 && <div className="text-gray-400 dark:text-gray-500">None</div>}
            {selectedCollaborators.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2">
                <span>@{user.username} ({user.email})</span>
                <Button size="sm" variant="destructive" onClick={() => removeCollaborator(user.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <DialogClose asChild>
            <Button className="mt-4 w-full">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>

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
              className="text-lg bg-white text-black border dark:bg-neutral-900 dark:text-white dark:border-neutral-700"
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
            {/* TipTap Editor Toolbar */}
            {editor && (
              <div className="flex flex-wrap gap-2 mb-2">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('bold') ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>Bold</button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('italic') ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>Italic</button>
                <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} disabled={!editor.can().chain().focus().toggleUnderline().run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('underline') ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>Underline</button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>H1</button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>H2</button>
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('bulletList') ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>Bullet List</button>
                <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('orderedList') ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>Ordered List</button>
                <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('blockquote') ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>Blockquote</button>
                <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`px-3 py-1 rounded border text-sm ${editor.isActive('codeBlock') ? 'bg-gray-200 font-bold dark:bg-neutral-700' : 'bg-white dark:bg-neutral-900'} dark:text-white dark:border-neutral-700`}>Code Block</button>
              </div>
            )}
            <EditorContent editor={editor} key={mentionUsers.map(u => u.id).join(',')} />
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
