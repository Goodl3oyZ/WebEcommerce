"use client";

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
  FaChartLine,
  FaDatabase,
  FaHeadset,
  FaNewspaper,
} from "react-icons/fa";
import { TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { navFor } from "@/components/admin/adminNav";
import { useAuth } from "@/contexts/AuthContext";

const ICONS = {
  "product-dashboard": FaChartLine,
  products: FaBoxOpen,
  categories: FaTags,
  brands: FaBuilding,
  reviews: FaStar,
  orders: FaTruck,
  users: FaUsers,
  coupons: FaTicketAlt,
  shipping: FaShip,
  payments: FaCreditCard,
  notifications: FaBell,
  reports: FaChartBar,
  settings: FaCog,
  support: FaHeadset,
  seed: FaDatabase,
  content: FaNewspaper,
};

export function AdminSidebar({ onNavigate }) {
  const { user } = useAuth();
  let lastGroup = "";

  return (
    <nav aria-label="เมนูแอดมิน" className="h-full">
      <TabsList className="flex w-full flex-col items-stretch gap-1 overflow-visible bg-transparent pb-0">
        {navFor(user).map((item) => {
          const Icon = ICONS[item.value];
          const showGroup = item.group !== lastGroup;
          lastGroup = item.group;
          return (
            <div key={item.value}>
              {showGroup && (
                <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                  {item.group}
                </p>
              )}
              <TabsTrigger
                value={item.value}
                onClick={() => onNavigate?.()}
                className="flex w-full items-center justify-start gap-3 px-3 py-2.5 text-left text-sm text-fg-muted hover:bg-surface-muted hover:text-fg data-[state=active]:bg-fg data-[state=active]:text-canvas data-[state=active]:shadow-sm"
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                {item.label}
              </TabsTrigger>
            </div>
          );
        })}
      </TabsList>
    </nav>
  );
}
