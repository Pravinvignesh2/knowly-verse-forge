import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Database } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const nameFromMetadata = user?.user_metadata?.name as string | undefined;
  const [name, setName] = useState(nameFromMetadata || "");
  const [email, setEmail] = useState(user?.email || "");
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [changeError, setChangeError] = useState("");
  const newPasswordRef = useRef<HTMLInputElement>(null);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would update the user profile
    toast({
      title: "Profile updated",
      description: "Your profile has been updated successfully.",
    });
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all your data? This action cannot be undone.")) {
      localStorage.clear();
      toast({
        title: "Data cleared",
        description: "All your data has been cleared from local storage.",
      });
      logout();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangeError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError("New passwords do not match.");
      return;
    }
    setIsChanging(true);
    try {
      const { data, error } = await supabase.rpc('changepassword', {
        current_plain_password: currentPassword,
        new_plain_password: newPassword,
        current_id: user.id,
      });
      if (error) {
        setChangeError(error.message || "Failed to change password.");
        setIsChanging(false);
        return;
      }
      if (data === 'incorrect') {
        setChangeError("Current password is incorrect.");
        setIsChanging(false);
        return;
      }
      if (data === 'success') {
        toast({ title: "Password changed", description: "You have been logged out. Please log in with your new password." });
        setShowChangePassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setIsChanging(false);
        await logout();
        return;
      }
      setChangeError("Unexpected response. Please try again.");
    } catch (err: any) {
      setChangeError(err.message || "Failed to change password.");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar} />
              <AvatarFallback className="text-lg">
                {(nameFromMetadata
                  ? nameFromMetadata.split(' ').map(n => n[0]).join('').toUpperCase()
                  : (user?.email ? user.email[0].toUpperCase() : '?'))}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{nameFromMetadata || user?.email || "User"}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <Separator />

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <Button type="submit">Update Profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Security
          </CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Change Password</h4>
              <p className="text-sm text-muted-foreground">
                Update your account password
              </p>
            </div>
            <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setShowChangePassword(true)}>
                  Change Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>Enter your current password and choose a new password.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                      ref={newPasswordRef}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  {changeError && <div className="text-red-600 text-sm">{changeError}</div>}
                  <DialogFooter>
                    <Button type="submit" disabled={isChanging}>
                      {isChanging ? "Changing..." : "Change Password"}
                    </Button>
                    <DialogClose asChild>
                      <Button type="button" variant="outline" onClick={() => setChangeError("")}>Cancel</Button>
                    </DialogClose>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => setShow2FAModal(true)}>
                  Enable 2FA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Two-Factor Authentication</DialogTitle>
                  <DialogDescription>
                    Two-factor authentication (2FA) is not yet available. This feature is coming soon to enhance your account security.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Manage your application data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Export Data</h4>
              <p className="text-sm text-muted-foreground">
                Download all your documents and data
              </p>
            </div>
            <Button variant="outline">
              Export
            </Button>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-red-600">Clear All Data</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your data from this device
              </p>
            </div>
            <Button variant="destructive" onClick={handleClearData}>
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
