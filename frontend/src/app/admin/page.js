"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent } from "@/components/ui/Tabs";
import { BrandsPanel } from "@/components/admin/BrandsPanel";
import { CategoriesPanel } from "@/components/admin/CategoriesPanel";
import { ProductsPanel } from "@/components/admin/ProductsPanel";
import { ReviewsPanel } from "@/components/admin/ReviewsPanel";
import { OrdersPanel } from "@/components/admin/OrdersPanel";
import { UsersPanel } from "@/components/admin/UsersPanel";
import { CouponsPanel } from "@/components/admin/CouponsPanel";
import { ShippingPanel } from "@/components/admin/ShippingPanel";
import { PaymentsPanel } from "@/components/admin/PaymentsPanel";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { ReportsPanel } from "@/components/admin/ReportsPanel";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { SeedDataPanel } from "@/components/admin/SeedDataPanel";
import { SupportPanel } from "@/components/admin/SupportPanel";
import { adminAPI } from "@/lib/api/admin";
import DashboardSummary from "@/components/admin/DashboardSummary";
import { isAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/layout/AdminShell";
import { PanelSkeleton } from "@/components/admin/ui/PanelSkeleton";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);
  const [tab, setTab] = useState("product-dashboard");
  const staffOnly = user?.role === "moderator";

  // Chat agents (moderators) only have the support inbox.
  useEffect(() => {
    if (staffOnly) setTab("support");
  }, [staffOnly]);

  const loadDashboard = () => {
    setDashLoading(true);
    setDashError(null);
    adminAPI
      .getDashboard()
      .then((data) => setDashboard(data))
      .catch((err) =>
        setDashError(err.message || "ไม่สามารถโหลดแดชบอร์ดได้")
      )
      .finally(() => setDashLoading(false));
  };

  useEffect(() => {
    if (!loading && isAdmin(user)) {
      loadDashboard();
    } else if (!loading) {
      setDashLoading(false);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="admin-shell font-admin min-h-screen bg-canvas p-6">
        <PanelSkeleton cards={4} charts={3} rows={4} />
      </div>
    );
  }

  if (!user || (!isAdmin(user) && !staffOnly)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-danger">Access Denied</h1>
          <p className="mt-2 text-fg-muted">
            You need admin privileges to access this page.
          </p>
          <p className="mt-1 text-sm text-fg-subtle">
            Use admin@example.com / admin123 after seed, or ask an admin to
            upgrade your role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <AdminShell>
        <div className="rounded-2xl border border-border bg-surface p-3 shadow-card sm:p-5">
          <TabsContent value="product-dashboard" className="mt-0">
            <DashboardSummary
              dashboard={dashboard}
              loading={dashLoading}
              error={dashError}
              onRetry={loadDashboard}
            />
          </TabsContent>
          <TabsContent value="products" className="mt-0">
            <ProductsPanel />
          </TabsContent>
          <TabsContent value="categories" className="mt-0">
            <CategoriesPanel />
          </TabsContent>
          <TabsContent value="brands" className="mt-0">
            <BrandsPanel />
          </TabsContent>
          <TabsContent value="reviews" className="mt-0">
            <ReviewsPanel />
          </TabsContent>
          <TabsContent value="orders" className="mt-0">
            <OrdersPanel />
          </TabsContent>
          <TabsContent value="users" className="mt-0">
            <UsersPanel />
          </TabsContent>
          <TabsContent value="coupons" className="mt-0">
            <CouponsPanel />
          </TabsContent>
          <TabsContent value="shipping" className="mt-0">
            <ShippingPanel />
          </TabsContent>
          <TabsContent value="payments" className="mt-0">
            <PaymentsPanel />
          </TabsContent>
          <TabsContent value="notifications" className="mt-0">
            <NotificationsPanel />
          </TabsContent>
          <TabsContent value="reports" className="mt-0">
            <ReportsPanel />
          </TabsContent>
          <TabsContent value="settings" className="mt-0">
            <SettingsPanel />
          </TabsContent>
          <TabsContent value="seed" className="mt-0">
            <SeedDataPanel />
          </TabsContent>
          <TabsContent value="support" className="mt-0">
            <SupportPanel />
          </TabsContent>
        </div>
      </AdminShell>
    </Tabs>
  );
}
