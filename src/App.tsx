import { Routes, Route } from "react-router-dom";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { AdminLayout } from "@/components/admin-layout";
import HomePage from "@/pages/HomePage";
import GamesPage from "@/pages/GamesPage";
import GameDetailPage from "@/pages/GameDetailPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import AdminPage from "@/pages/AdminPage";
import CheckoutPage from "@/pages/CheckoutPage";

function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold neon-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-[var(--gradient-primary)] px-4 py-2 text-sm font-medium text-primary-foreground neon-ring"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Admin routes — own layout with sidebar, no site header/footer */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminPage />} />
        <Route path="products" element={<AdminPage />} />
        <Route path="transactions" element={<AdminPage />} />
        <Route path="settings" element={<AdminPage />} />
      </Route>

      {/* Public routes — site header/footer */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col">
            <SiteHeader />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/games" element={<GamesPage />} />
                <Route path="/games/:slug" element={<GameDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <SiteFooter />
            <WhatsAppFloat />
          </div>
        }
      />
    </Routes>
  );
}
