"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
// import { SeedDataPanel } from "@/components/admin/SeedDataPanel";
import {
  FaBoxOpen,
  FaTags,
  FaBuilding,
  FaStar,
  FaTruck,
  FaUsers,
  FaTicketAlt,
  FaShip,
  FaCreditCard,
  FaBell,
  FaChartBar,
  FaCog,
  FaDatabase,
  FaMoneyBillWave,
  FaUserPlus,
  FaClipboardList,
  FaChartLine,
  FaBoxes,
} from "react-icons/fa";
import { adminAPI } from "@/lib/api/admin";
import DashboardSummary from "@/components/admin/DashboardSummary";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      adminAPI.getDashboard().then((data) => {
        setDashboard(data);
        setDashLoading(false);
      });
    }
  }, [loading, user]);

  if (loading || dashLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 animate-fade-in">
      <Tabs
        defaultValue="product-dashboard"
        orientation="vertical"
        className="flex flex-col md:flex-row gap-4"
      >
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-white shadow-lg rounded-2xl md:rounded-r-2xl md:rounded-l-none p-2 md:p-4 mb-4 md:mb-0 overflow-x-auto md:overflow-visible">
          <TabsList className="flex md:flex-col flex-row gap-2 w-full bg-transparent min-w-max md:min-w-0">
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
              value="product-dashboard"
            >
              <FaChartLine className="text-xl" /> Product Dashboard
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 rounded-xl data-[state=active]:bg-blue-100 data-[state=active]:text-blue-600"
              value="products"
            >
              <FaBoxOpen className="text-xl" /> Product Management
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-green-50 hover:text-green-600 rounded-xl data-[state=active]:bg-green-100 data-[state=active]:text-green-600"
              value="categories"
            >
              <FaTags className="text-xl" /> Categories
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-purple-50 hover:text-purple-600 rounded-xl data-[state=active]:bg-purple-100 data-[state=active]:text-purple-600"
              value="brands"
            >
              <FaBuilding className="text-xl" /> Brands
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-yellow-50 hover:text-yellow-600 rounded-xl data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-600"
              value="reviews"
            >
              <FaStar className="text-xl" /> Store Reviews
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-600"
              value="orders"
            >
              <FaTruck className="text-xl" /> Orders
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-red-50 hover:text-red-600 rounded-xl data-[state=active]:bg-red-100 data-[state=active]:text-red-600"
              value="users"
            >
              <FaUsers className="text-xl" /> Users
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-pink-50 hover:text-pink-600 rounded-xl data-[state=active]:bg-pink-100 data-[state=active]:text-pink-600"
              value="coupons"
            >
              <FaTicketAlt className="text-xl" /> Coupons
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-cyan-50 hover:text-cyan-600 rounded-xl data-[state=active]:bg-cyan-100 data-[state=active]:text-cyan-600"
              value="shipping"
            >
              <FaShip className="text-xl" /> Shipping
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-600"
              value="payments"
            >
              <FaCreditCard className="text-xl" /> Payments
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-orange-50 hover:text-orange-600 rounded-xl data-[state=active]:bg-orange-100 data-[state=active]:text-orange-600"
              value="notifications"
            >
              <FaBell className="text-xl" /> Notifications
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-teal-50 hover:text-teal-600 rounded-xl data-[state=active]:bg-teal-100 data-[state=active]:text-teal-600"
              value="reports"
            >
              <FaChartBar className="text-xl" /> Reports
            </TabsTrigger>
            <TabsTrigger
              className="w-full flex items-center gap-3 p-3 text-left text-base font-medium transition-all duration-200 hover:bg-gray-50 hover:text-gray-600 rounded-xl data-[state=active]:bg-gray-100 data-[state=active]:text-gray-600"
              value="settings"
            >
              <FaCog className="text-xl" /> Settings
            </TabsTrigger>
          </TabsList>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 bg-white rounded-2xl shadow-lg p-2 sm:p-4 md:p-6 w-full">
          <TabsContent value="product-dashboard" className="mt-0">
            <DashboardSummary dashboard={dashboard} loading={dashLoading} />
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
        </div>
      </Tabs>
    </div>
  );
}
