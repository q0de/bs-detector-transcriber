import { BrowserRouter, Routes, Route } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { Providers } from "./providers";

// Import pages
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import PricingPage from "./pages/PricingPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import FreeTrialResultPage from "./pages/FreeTrialResultPage";

// Import components
import Navbar from "./components/Navbar";
import FeedbackButton from "./components/FeedbackButton";
import ProtectedRoute from "./components/ProtectedRoute";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

function AppContent() {
  return (
    <Providers>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/free-trial-result" element={<FreeTrialResultPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute><HistoryPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />
          </Routes>
        </main>
        <FeedbackButton />
      </div>
    </Providers>
  );
}

function App() {
  const content = (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );

  if (stripePromise) {
    return <Elements stripe={stripePromise}>{content}</Elements>;
  }
  
  return content;
}

export default App;

