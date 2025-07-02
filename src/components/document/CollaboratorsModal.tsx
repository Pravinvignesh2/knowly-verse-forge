import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { z } from "zod";

const emailSchema = z.string().email();

interface Collaborator {
  id: string;
  email: string;
  permission: "view" | "edit";
}

interface CollaboratorsModalProps {
  documentId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthor: boolean;
  onCollaboratorsChange?: (collaborators: Collaborator[]) => void;
}

export default function CollaboratorsModal({
  documentId,
  isOpen,
  onOpenChange,
  isAuthor,
  onCollaboratorsChange,
}: CollaboratorsModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPermission, setAddPermission] = useState<"view" | "edit">("view");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError("");
    supabase
      .from("document_collaborators")
      .select("id, user_id, permission, profiles:profiles(email)")
      .eq("document_id", documentId)
      .then(({ data, error }) => {
        if (error) {
          setError("Failed to load collaborators");
          setLoading(false);
          return;
        }
        const mapped = (data || []).map((row: any) => ({
          id: row.id,
          email: row.profiles?.email || "",
          permission: row.permission as "view" | "edit",
        }));
        setCollaborators(mapped);
        setLoading(false);
        onCollaboratorsChange?.(mapped);
      });
  }, [isOpen, documentId, onCollaboratorsChange]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    // Validate email
    const parsed = emailSchema.safeParse(addEmail);
    if (!parsed.success) {
      setAddError("Invalid email address");
      setAddLoading(false);
      return;
    }
    // Find user by email
    const { data: users, error: userError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", addEmail)
      .single();
    if (userError || !users) {
      setAddError("User not found");
      setAddLoading(false);
      return;
    }
    // Check if already a collaborator
    const { data: existing, error: existingError } = await supabase
      .from("document_collaborators")
      .select("id")
      .eq("document_id", documentId)
      .eq("user_id", users.id)
      .single();
    if (existing) {
      // Update permission if already exists
      const { error: updateError } = await supabase
        .from("document_collaborators")
        .update({ permission: addPermission })
        .eq("id", existing.id);
      if (updateError) {
        setAddError(updateError.message || "Failed to update collaborator permission");
        setAddLoading(false);
        return;
      }
    } else {
      // Insert collaborator
      const { error: insertError } = await supabase
        .from("document_collaborators")
        .insert({
          document_id: documentId,
          user_id: users.id,
          permission: addPermission,
        });
      if (insertError) {
        setAddError(insertError.message || "Failed to add collaborator");
        setAddLoading(false);
        return;
      }
    }
    setAddEmail("");
    setAddPermission("view");
    setAddLoading(false);
    // Refresh list
    setLoading(true);
    const { data, error } = await supabase
      .from("document_collaborators")
      .select("id, user_id, permission, profiles:profiles(email)")
      .eq("document_id", documentId);
    if (!error && data) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        email: row.profiles?.email || "",
        permission: row.permission as "view" | "edit",
      }));
      setCollaborators(mapped);
      onCollaboratorsChange?.(mapped);
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("document_collaborators").delete().eq("id", id);
    if (error) {
      setError(error.message || "Failed to remove collaborator");
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("document_collaborators")
      .select("id, user_id, permission, profiles:profiles(email)")
      .eq("document_id", documentId);
    if (!fetchError && data) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        email: row.profiles?.email || "",
        permission: row.permission as "view" | "edit",
      }));
      setCollaborators(mapped);
      onCollaboratorsChange?.(mapped);
    }
    setLoading(false);
  };

  const handlePermissionChange = async (id: string, permission: "view" | "edit") => {
    setLoading(true);
    await supabase.from("document_collaborators").update({ permission }).eq("id", id);
    const { data, error } = await supabase
      .from("document_collaborators")
      .select("id, user_id, permission, profiles:profiles(email)")
      .eq("document_id", documentId);
    if (!error && data) {
      const mapped = data.map((row: any) => ({
        id: row.id,
        email: row.profiles?.email || "",
        permission: row.permission as "view" | "edit",
      }));
      setCollaborators(mapped);
      onCollaboratorsChange?.(mapped);
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>
            Add collaborators by email and set their permissions.
          </DialogDescription>
        </DialogHeader>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleAdd} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="add-email">Email</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  required
                  disabled={!isAuthor || addLoading}
                />
              </div>
              <div>
                <Label htmlFor="add-permission">Permission</Label>
                <select
                  id="add-permission"
                  className="border rounded px-2 py-1"
                  value={addPermission}
                  onChange={e => setAddPermission(e.target.value as "view" | "edit")}
                  disabled={!isAuthor || addLoading}
                >
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                </select>
              </div>
              <Button type="submit" disabled={!isAuthor || addLoading}>
                {addLoading ? "Adding..." : "Add"}
              </Button>
            </form>
            {addError && <div className="text-red-600 text-sm">{addError}</div>}
            <div>
              <Label>Current Collaborators</Label>
              <div className="mt-2 space-y-2">
                {collaborators.length === 0 && <div className="text-muted-foreground text-sm">No collaborators yet.</div>}
                {collaborators.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 border rounded px-2 py-1">
                    <div className="flex-1">{c.email}</div>
                    <select
                      className="border rounded px-1 py-0.5 text-xs"
                      value={c.permission}
                      onChange={e => handlePermissionChange(c.id, e.target.value as "view" | "edit")}
                      disabled={!isAuthor}
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                    </select>
                    {isAuthor && (
                      <Button size="sm" variant="destructive" onClick={() => handleRemove(c.id)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 