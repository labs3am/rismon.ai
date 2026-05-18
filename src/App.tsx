import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import Index from "./pages/Index";
import { usePageTracker } from "@/hooks/usePageTracker";
import PageSkeleton from "@/components/PageSkeleton";

// Code-split every non-landing route so the initial bundle stays small.
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Connect = lazy(() => import("./pages/Connect"));
const Analyze = lazy(() => import("./pages/Analyze"));
const Report = lazy(() => import("./pages/Report"));
const Settings = lazy(() => import("./pages/Settings"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const AdminWaitlist = lazy(() => import("./pages/AdminWaitlist"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SampleReport = lazy(() => import("./pages/SampleReport"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const Contact = lazy(() => import("./pages/Contact"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminBroadcast = lazy(() => import("./pages/AdminBroadcast"));
const Security = lazy(() => import("./pages/Security"));
const About = lazy(() => import("./pages/About"));
const OpenSource = lazy(() => import("./pages/OpenSource"));
const ForPlatform = lazy(() => import("./pages/ForPlatform"));
const HowWeScore = lazy(() => import("./pages/HowWeScore"));
const Status = lazy(() => import("./pages/Status"));
const PromiseAudit = lazy(() => import("./pages/PromiseAudit"));
const AdminAuditTest = lazy(() => import("./pages/AdminAuditTest"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => <PageSkeleton />;

// Tracks page views on route change. Lives inside <BrowserRouter>.
const PageTracker = () => {
  usePageTracker();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <PageTracker />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/sample-report" element={<SampleReport />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/security" element={<Security />} />
              <Route path="/status" element={<Status />} />
              <Route path="/about" element={<About />} />
              <Route path="/open-source" element={<OpenSource />} />
              <Route path="/how-we-score" element={<HowWeScore />} />
              <Route path="/promise-audit" element={<PromiseAudit />} />
              <Route path="/promise-audit/:id" element={<PromiseAudit />} />
              <Route path="/for/:platform" element={<ForPlatform />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin/blog" element={<AdminRoute><AdminBlog /></AdminRoute>} />
              <Route path="/admin/blog/:id" element={<AdminRoute><AdminBlog /></AdminRoute>} />
              <Route path="/admin/waitlist" element={<AdminRoute><AdminWaitlist /></AdminRoute>} />
              <Route path="/admin/reviews" element={<AdminRoute><AdminReviews /></AdminRoute>} />
              <Route path="/admin/broadcast" element={<AdminRoute><AdminBroadcast /></AdminRoute>} />
              <Route path="/admin/audit-test" element={<AdminRoute><AdminAuditTest /></AdminRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/connect" element={<ProtectedRoute><Connect /></ProtectedRoute>} />
              <Route path="/analyze/:appId" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
              <Route path="/report/:analysisId" element={<ProtectedRoute><Report /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
