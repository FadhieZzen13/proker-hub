import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { lazy, Suspense } from "react";
import OnboardingPage from "./pages/OnboardingPage";
import { useMemberStore, ADMIN_NAME } from "@/hooks/useMemberStore";
import { Menu, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";

const Index = lazy(() => import("./pages/Index"));
const DivisionPage = lazy(() => import("./pages/DivisionPage"));
const MembersPage = lazy(() => import("./pages/MembersPage"));
const AdminBhepPage = lazy(() => import("./pages/AdminBhepPage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const LapakKerjaPage = lazy(() => import("./pages/LapakKerjaPage"));
const TrackersHub = lazy(() => import("./pages/TrackersHub"));
const PersonalTrackerPage = lazy(() => import("./pages/PersonalTrackerPage"));
const EvaluationPage = lazy(() => import("./pages/EvaluationPage"));
const LinksPage = lazy(() => import("./pages/LinksPage"));
const GrandTimelinePage = lazy(() => import("./pages/GrandTimelinePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function AppShell() {
  const { currentMember, isAdmin, logout } = useMemberStore();

  // Not logged in — show onboarding
  if (!currentMember && !isAdmin) return <OnboardingPage />;

  const firstName = isAdmin ? ADMIN_NAME : (currentMember?.name.split(" ")[0] ?? "");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card sticky top-0 z-10 gap-3">
            <SidebarTrigger className="mr-1">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <span className="text-sm font-semibold text-primary">PPI UPM Dashboard</span>
            <span className="text-xs text-muted-foreground">Management System</span>
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{ADMIN_NAME}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">Admin</Badge>
                </div>
              ) : (
                <span className="text-sm text-foreground">
                  Hello, <span className="font-semibold text-primary">{firstName}</span> 👋
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/division/:division" element={<DivisionPage />} />
                <Route path="/members" element={<MembersPage />} />
                <Route path="/lapak-kerja" element={<LapakKerjaPage />} />
                <Route path="/trackers" element={<TrackersHub />} />
                <Route path="/tracker" element={<PersonalTrackerPage />} />
                <Route path="/evaluation" element={<EvaluationPage />} />
                <Route path="/links" element={<LinksPage />} />
                <Route path="/grand-timeline" element={<GrandTimelinePage />} />
                <Route path="/admin/bhep" element={<AdminBhepPage />} />
                <Route path="/guide" element={<GuidePage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
