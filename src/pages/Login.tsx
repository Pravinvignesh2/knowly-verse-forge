import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await login(email, password);
    
    if (error) {
      toast({
        title: "Login failed",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      navigate(from, { replace: true });
    }
    
    setIsLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + "/auth/login"
    });
    if (error) {
      setForgotError(error.message || "Failed to send reset email.");
    } else {
      setForgotSuccess("Password reset email sent. Please check your inbox.");
    }
    setForgotLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="text-right mt-1">
              <Dialog open={showForgot} onOpenChange={setShowForgot}>
                <DialogTrigger asChild>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => setShowForgot(true)}>
                    Forgot password?
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                    <DialogDescription>Enter your email to receive a password reset link.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    {forgotError && <div className="text-red-600 text-sm">{forgotError}</div>}
                    {forgotSuccess && <div className="text-green-600 text-sm">{forgotSuccess}</div>}
                    <DialogFooter>
                      <Button type="submit" disabled={forgotLoading}>
                        {forgotLoading ? "Sending..." : "Send Reset Link"}
                      </Button>
                      <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => { setForgotError(""); setForgotSuccess(""); }}>Cancel</Button>
                      </DialogClose>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don't have an account?{" "}
          <Link to="/auth/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default Login;
