import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './services/queryClient';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CareerProvider } from './context/CareerContext';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import MobileNav from './components/layout/MobileNav';
import AIAssistantDrawer from './components/layout/AIAssistantDrawer';
import PageSkeleton from './components/common/PageSkeleton';

// Code-splitting via dynamic imports for instant initial shell load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const CompanyIntelPage = lazy(() => import('./pages/CompanyIntelPage'));
const ResumeATSPage = lazy(() => import('./pages/ResumeATSPage'));
const ResumeBuilderPage = lazy(() => import('./pages/ResumeBuilderPage'));
const SkillGapPage = lazy(() => import('./pages/SkillGapPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const InterviewCenterPage = lazy(() => import('./pages/InterviewCenterPage'));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'));
const ApplicationTrackerPage = lazy(() => import('./pages/ApplicationTrackerPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const CollegeAdminLoginPage = lazy(() => import('./pages/college/CollegeAdminLoginPage'));
const CollegeAdminDashboardPage = lazy(() => import('./pages/college/CollegeAdminDashboardPage'));

// Main App Layout for dashboard and internal pages with persistent shell
function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageSkeleton />}>
            {children}
          </Suspense>
        </main>
      </div>
      <MobileNav />
      <AIAssistantDrawer />
    </div>
  );
}

// Protected Route Component: uses route-level skeleton instead of blocking the entire site
function ProtectedRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  // If verifying session, display app shell with component skeleton immediately
  if (loading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If student has not completed first-login onboarding, redirect to onboarding
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// Protected Route Component for College Placement Administrators
function CollegeAdminProtectedRoute({ children }) {
  const token = localStorage.getItem('college_admin_token');
  if (!token) {
    return <Navigate to="/college" replace />;
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  );
}

// Onboarding route wrapper
function OnboardingRouteWrapper() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If onboarding is already completed, go straight to Student Dashboard
  if (user && user.onboardingCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <OnboardingPage />
    </Suspense>
  );
}

// Login/Signup wrapper to handle redirects if already authenticated
function AuthRouteWrapper({ mode }) {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    if (user && !user.onboardingCompleted) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <AuthPage 
        initialMode={mode} 
        onSuccess={(loggedUser) => {
          if (loggedUser && !loggedUser.onboardingCompleted) {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
        }} 
        onNavigateDashboard={() => navigate('/dashboard')} 
      />
    </Suspense>
  );
}

// Home route handler: only renders for verified authenticated sessions
function HomeRoute() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <AppLayout>
        <PageSkeleton />
      </AppLayout>
    );
  }

  // First-time or unauthenticated visitors MUST be redirected to /login immediately
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<AuthRouteWrapper mode="login" />} />
      <Route path="/signup" element={<AuthRouteWrapper mode="signup" />} />
      <Route path="/auth" element={<AuthRouteWrapper mode="login" />} />

      {/* First-login Onboarding Route */}
      <Route path="/onboarding" element={<OnboardingRouteWrapper />} />

      {/* Main Pages inside Layout - All strictly Protected */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        } 
      />
      
      {/* Protected Profile Route */}
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage onNavigateDashboard={() => navigate('/dashboard')} />
            </AppLayout>
          </ProtectedRoute>
        } 
      />

      {/* Other App Pages */}
      <Route 
        path="/jobs" 
        element={
          <ProtectedRoute>
            <AppLayout><JobsPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/company-intel" 
        element={
          <ProtectedRoute>
            <AppLayout><CompanyIntelPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resume" 
        element={
          <ProtectedRoute>
            <AppLayout><ResumeATSPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/resume-builder" 
        element={
          <ProtectedRoute>
            <AppLayout><ResumeBuilderPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/job-match" 
        element={
          <ProtectedRoute>
            <AppLayout><JobsPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/applications" 
        element={
          <ProtectedRoute>
            <AppLayout><ApplicationTrackerPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/interview" 
        element={
          <ProtectedRoute>
            <AppLayout><InterviewCenterPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/communication" 
        element={
          <ProtectedRoute>
            <AppLayout><CommunicationPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/skills" 
        element={
          <ProtectedRoute>
            <AppLayout><SkillGapPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/skills-gap" 
        element={
          <ProtectedRoute>
            <AppLayout><SkillGapPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/roadmap" 
        element={
          <ProtectedRoute>
            <AppLayout><RoadmapPage /></AppLayout>
          </ProtectedRoute>
        } 
      />
      {/* College Admin Routes */}
      <Route 
        path="/college" 
        element={
          <Suspense fallback={<PageSkeleton />}>
            <CollegeAdminLoginPage />
          </Suspense>
        } 
      />
      <Route 
        path="/college/dashboard" 
        element={
          <CollegeAdminProtectedRoute>
            <CollegeAdminDashboardPage />
          </CollegeAdminProtectedRoute>
        } 
      />

      {/* Catch-all redirect to Home (which redirects unauthenticated visitors to /login) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <CareerProvider>
            <AppRoutes />
          </CareerProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
