import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { AuthDialog } from "@/components/AuthDialog";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, TrendingUp, Shield, Zap, LogOut } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) setShowChat(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setShowChat(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowChat(false);
  };

  if (showChat && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary animate-glow" />
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Project SILK AI
              </h1>
            </div>
            <Button onClick={handleSignOut} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
          <ChatInterface />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-block">
            <div className="flex items-center gap-3 justify-center mb-4">
              <Sparkles className="h-16 w-16 text-primary animate-float" />
            </div>
            <h1 className="text-6xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
              Project SILK AI
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your Intelligent Relationship Manager for Personal Loans
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="glass-effect p-8 rounded-2xl space-y-4 hover:shadow-xl transition-all">
              <TrendingUp className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Smart Loan Options</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered calculations and personalized EMI plans tailored to your needs
              </p>
            </div>

            <div className="glass-effect p-8 rounded-2xl space-y-4 hover:shadow-xl transition-all">
              <Shield className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Secure & Trusted</h3>
              <p className="text-sm text-muted-foreground">
                Bank-grade security with instant KYC verification and credit checks
              </p>
            </div>

            <div className="glass-effect p-8 rounded-2xl space-y-4 hover:shadow-xl transition-all">
              <Zap className="h-12 w-12 text-primary mx-auto" />
              <h3 className="text-xl font-semibold">Instant Approval</h3>
              <p className="text-sm text-muted-foreground">
                Get your sanction letter in minutes with immediate disbursal options
              </p>
            </div>
          </div>

          <div className="mt-12">
            <Button
              onClick={() => setShowAuth(true)}
              size="lg"
              className="gradient-primary text-lg px-8 py-6 rounded-full shadow-elegant hover:shadow-2xl transition-all animate-glow"
            >
              Get Started with SILK AI
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            Experience the future of personal lending with empathetic AI
          </p>
        </div>
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
};

export default Index;
