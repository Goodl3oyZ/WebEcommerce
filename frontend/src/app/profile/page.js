"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI } from "@/lib/api/users";
import { addressAPI } from "@/lib/api/address";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ProductImage from "@/components/ui/ProductImage";
import { CouponWallet } from "@/components/shop/CouponList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import classNames from "classnames";
import {
  PlusIcon,
  MapPin,
  Phone,
  Star,
  Home,
  Fullscreen,
  User,
  Truck,
  Package,
  Ticket,
  LogOut,
  ChevronRight,
  User as UserIcon,
  X as CloseIcon,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Mail,
  ShieldCheck,
  ShoppingBag,
  CreditCard,
  Edit3,
  Sparkles,
  Clock,
} from "lucide-react";
import { shippingAPI } from "@/lib/api/shipping";
import errorPage from "../error";
import loadingPage from "../loading";

const TABS = [
  { id: "personal", label: "ข้อมูลส่วนตัว", icon: User },
  { id: "shipping", label: "ที่อยู่", icon: Truck },
  { id: "orders", label: "การสั่งซื้อ", icon: Package },
  { id: "coupons", label: "คูปอง", icon: Ticket },
];

export default function Profile() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("personal");
  const [profile, setProfile] = useState(null);
  const [userStats, setUserStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    addressCount: 0,
    roles: [],
  });
  const [points, setPoints] = useState(0);
  const [amloading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });

  // Address management state
  const [addresses, setAddresses] = useState([]);
  const [editAddress, setEditAddress] = useState(false);
  const [editId, setEditId] = useState(null);
  const [addressData, setAddressData] = useState({
    fullName: "",
    address: "",
    subdistrict: "",
    city: "",
    state: "",
    country: "Thailand",
    postalCode: "",
    phoneNumber: "",
    isDefault: false,
  });

  // Add state for toast notifications
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  // New states for provinces, districts, subdistricts, and shippingZoneId
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);
  const [shippingZoneId, setShippingZoneId] = useState("");

  // เพิ่ม state สำหรับ orders
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [errorOrders, setErrorOrders] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [profileRes, pointsRes, addressRes] = await Promise.all([
          usersAPI.getProfile(),
          usersAPI.getUserPoints(),
          addressAPI.getAddresses(),
        ]);

        if (profileRes?.data?.user) {
          const u = profileRes.data.user;
          setProfile(u);
          if (profileRes.data.stats) {
            setUserStats(profileRes.data.stats);
          }
          setFormData({ name: u.name || "", phone: u.phone || "" });
          setImagePreview(u.avatar || null);
        }

        if (addressRes?.addresses) {
          setAddresses(addressRes.addresses);
        }

        setPoints(pointsRes?.data?.points || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, loading, router]);

  // Show toast for 2.5s
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // โหลด provinces ตอน mount
    const fetchProvinces = async () => {
      const data = await addressAPI.getProvinces();
      setProvinces(data);
    };
    fetchProvinces();
  }, []);

  useEffect(() => {
    // โหลด districts เมื่อเลือก province
    if (!addressData.state) {
      setDistricts([]);
      setSubdistricts([]);
      setShippingZoneId("");
      return;
    }
    const fetchDistricts = async () => {
      const data = await addressAPI.getDistricts(addressData.state);
      setDistricts(data);
      setSubdistricts([]);
      // map shippingZoneId อัตโนมัติ (ถ้ามี)
      if (data.length > 0 && data[0].shippingZoneId) {
        setShippingZoneId(data[0].shippingZoneId);
      } else {
        setShippingZoneId("");
      }
    };
    fetchDistricts();
  }, [addressData.state]);

  useEffect(() => {
    // โหลด subdistricts เมื่อเลือก district
    if (!addressData.city) {
      setSubdistricts([]);
      return;
    }
    const fetchSubdistricts = async () => {
      const data = await addressAPI.getSubdistricts(addressData.city, addressData.state);
      setSubdistricts(data);
    };
    fetchSubdistricts();
  }, [addressData.city]);

  // ดึง orders เมื่อเข้า tab orders
  useEffect(() => {
    if (activeTab !== "orders" || !user) return;
    const fetchOrders = async () => {
      try {
        setLoadingOrders(true);
        setErrorOrders(null);
        const response = await import("@/lib/api/orders").then((m) =>
          m.orderAPI.getOrders(user.id, { page: 1, limit: 10 })
        );
        const ordersArr = response.data?.orders || response.orders || [];
        setOrders(
          ordersArr.filter((order) => String(order.userId) === String(user.id))
        );
      } catch (err) {
        setErrorOrders(err.message || "ไม่สามารถดึงข้อมูลคำสั่งซื้อได้");
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [activeTab, user]);

  const handleSubmitAddress = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload = {
        fullName: addressData.fullName,
        addressLine1: addressData.address,
        subdistrict: addressData.subdistrict,
        district: addressData.city,
        province: addressData.state,
        postalCode: addressData.postalCode,
        country: addressData.country,
        phoneNumber: addressData.phoneNumber,
        isDefault: addressData.isDefault || !addresses.some((a) => a.isDefault),
        shippingZoneId: shippingZoneId || undefined,
      };

      let response;
      if (editId) {
        // Update existing address
        response = await addressAPI.updateAddress(editId, payload);
        setSuccessMsg("อัปเดตที่อยู่เรียบร้อยแล้ว");
      } else {
        // Create new address
        response = await addressAPI.createAddress(payload);
        setSuccessMsg("เพิ่มที่อยู่ใหม่เรียบร้อยแล้ว");
      }

      // Refresh addresses
      const addressRes = await addressAPI.getAddresses();
      setAddresses(addressRes.addresses || []);

      // Reset form
      setEditAddress(false);
      setEditId(null);
    } catch (err) {
      console.error("Error saving address:", err);
      setErrorMsg(
        "เกิดข้อผิดพลาด: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm("คุณแน่ใจว่าต้องการลบที่อยู่นี้ใช่หรือไม่?")) return;

    try {
      const addrToDelete = addresses.find((a) => a.id === id);
      if (!addrToDelete) throw new Error("ไม่พบที่อยู่");

      // If deleting default address and there are other addresses
      if (addrToDelete.isDefault && addresses.length > 1) {
        const otherAddress = addresses.find((a) => a.id !== id);
        if (otherAddress) {
          await addressAPI.setDefaultAddress(otherAddress.id);
        }
      }

      await addressAPI.deleteAddress(id);

      // Refresh addresses
      const addressRes = await addressAPI.getAddresses();
      setAddresses(addressRes.addresses || []);

      setSuccessMsg("ลบที่อยู่เรียบร้อยแล้ว");
    } catch (err) {
      console.error("Error deleting address:", err);
      setErrorMsg("ลบไม่สำเร็จ: " + err.message);
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await addressAPI.setDefaultAddress(id);

      // Refresh addresses
      const addressRes = await addressAPI.getAddresses();
      setAddresses(addressRes.addresses || []);

      setSuccessMsg("ตั้งที่อยู่หลักเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Error setting default address:", err);
      setErrorMsg("ตั้งที่อยู่หลักไม่สำเร็จ: " + err.message);
    }
  };

  const startEditAddress = (addr) => {
    setEditAddress(true);
    setEditId(addr.id);
    setAddressData({
      fullName: addr.fullName || "",
      address: addr.addressLine1 || "",
      subdistrict: addr.subdistrict || "",
      city: addr.district || addr.city || "",
      state: addr.province || addr.state || "",
      country: addr.country || "Thailand",
      postalCode: addr.postalCode || "",
      phoneNumber: addr.phoneNumber || "",
      isDefault: addr.isDefault || false,
    });
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddressData((prev) => {
      if (name === "state") {
        return {
          ...prev,
          state: value,
          city: "",
          subdistrict: "",
          postalCode: "",
        };
      }
      if (name === "city") {
        return { ...prev, city: value, subdistrict: "", postalCode: "" };
      }
      if (name === "subdistrict") {
        // หา object subdistrict ที่ตรงกับ value
        const sub = subdistricts.find((s) => s.nameTh === value);
        return { ...prev, subdistrict: value, postalCode: sub?.zipcode || "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const payload = new FormData();
      if (formData.name) payload.append("name", formData.name);
      if (formData.phone) payload.append("phone", formData.phone);
      if (selectedImage) payload.append("avatar", selectedImage);

      const res = await usersAPI.updateProfile(payload);
      const updated = res?.data || res;
      if (updated) {
        setProfile((prev) => ({
          ...prev,
          name: updated.name || prev?.name,
          avatar: updated.avatar || prev?.avatar,
          phone: updated.phone || prev?.phone,
        }));
        if (updated.avatar) setImagePreview(updated.avatar);
      }
      setToast({ show: true, type: "success", message: "บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว" });
      setEditMode(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึก: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add skeleton loader for loading state
  if (amloading) {
    loadingPage;
  }

  if (error) {
    errorPage;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-canvas to-white">
      {/* Sidebar open button for mobile (user icon) - only when sidebar is closed */}
      {!sidebarOpen && (
        <button
          className="fixed top-20 right-4 z-50 md:hidden bg-white rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-fg"
          aria-label="เปิดเมนูโปรไฟล์"
          onClick={() => setSidebarOpen(true)}
        >
          <UserIcon className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar for desktop */}
      <aside className="hidden md:flex w-72 p-6 border-r bg-white shadow-lg flex-col justify-between min-h-screen">
        <div>
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-20 h-20 mb-2">
              <Image
                src={imagePreview || "/default-avatar.png"}
                alt="Avatar"
                className="rounded-full object-cover border-4 border-border shadow"
                fill
              />
            </div>
            <div className="text-lg font-semibold text-gray-800">
              {formData.name || "-"}
            </div>
            <div className="text-xs text-gray-500">{user?.email || "-"}</div>
            <div className="mt-2 px-3 py-1 bg-surface-muted text-fg rounded-full text-xs font-medium flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {points} แต้มสะสม
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition text-base font-medium",
                  activeTab === tab.id
                    ? "bg-fg text-white shadow"
                    : "hover:bg-fg/5 text-gray-700"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Sidebar Drawer for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-label="ปิดเมนูโปรไฟล์"
            tabIndex={-1}
          />
          {/* Drawer */}
          <aside className="relative w-64 max-w-full bg-white p-6 shadow-lg h-full flex flex-col justify-start animate-slide-in-left">
            {/* Close button (X) above profile */}
            <button
              className="absolute top-4 left-4 bg-gray-100 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-fg"
              aria-label="ปิดเมนูโปรไฟล์"
              onClick={() => setSidebarOpen(false)}
            >
              <CloseIcon className="w-6 h-6" />
            </button>
            <div className="flex flex-col items-center mb-8 mt-12">
              <div className="relative w-20 h-20 mb-2">
                <Image
                  src={imagePreview || "/default-avatar.png"}
                  alt="Avatar"
                  className="rounded-full object-cover border-4 border-border shadow"
                  fill
                />
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {formData.name || "-"}
              </div>
              <div className="text-xs text-gray-500">{user?.email || "-"}</div>
              <div className="mt-2 px-3 py-1 bg-surface-muted text-fg rounded-full text-xs font-medium flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {points} แต้มสะสม
              </div>
            </div>
            <nav className="flex flex-col gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarOpen(false);
                  }}
                  className={classNames(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition text-base font-medium",
                    activeTab === tab.id
                      ? "bg-fg text-white shadow"
                      : "hover:bg-fg/5 text-gray-700"
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-8 md:p-12 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-8 tracking-tight">
          บัญชีผู้ใช้
        </h1>

        {/* Toast notification */}
        {toast.show && (
          <div
            className={classNames(
              "fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white text-base font-medium transition-all",
              toast.type === "success" ? "bg-green-500" : "bg-red-500"
            )}
          >
            {toast.message}
          </div>
        )}

        {/* Personal Info Tab */}
        {activeTab === "personal" && (
          <div className="space-y-6 animate-fade-in mb-8">
            {/* Profile Hero Card */}
            <Card className="overflow-hidden border-0 shadow-lg bg-white">
              {/* Top Banner Gradient */}
              <div className="h-32 bg-gradient-to-r from-[#0f0f0f] via-[#1c1c1c] to-[#0f0f0f] relative">
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    {profile?.isVerified !== false ? "บัญชีได้รับการยืนยันแล้ว" : "ยังไม่ได้ยืนยันบัญชี"}
                  </span>
                </div>
              </div>

              <CardContent className="px-6 pb-6 relative pt-0">
                <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 mb-6 gap-4 border-b pb-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                    <div className="relative w-28 h-28 group shrink-0">
                      <Image
                        src={imagePreview || "/default-avatar.png"}
                        alt="Avatar"
                        className="rounded-full object-cover border-4 border-white shadow-xl bg-white"
                        fill
                      />
                      <button
                        type="button"
                        onClick={() => setEditMode(!editMode)}
                        className="absolute bottom-1 right-1 p-2 bg-fg hover:bg-fg/85 text-white rounded-full shadow-md transition-transform hover:scale-105"
                        title="เปลี่ยนรูปโปรไฟล์"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {profile?.name || formData.name || "ผู้ใช้งาน"}
                        </h2>
                        {userStats.roles?.includes("admin") && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1.5 justify-center sm:justify-start mt-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {profile?.email || user?.email || "-"}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => setEditMode(!editMode)}
                    variant={editMode ? "ghost" : "outline"}
                    className="flex items-center gap-2 border-border text-fg hover:bg-fg/5"
                  >
                    <Edit3 className="w-4 h-4" />
                    {editMode ? "ยกเลิกแก้ไข" : "แก้ไขโปรไฟล์"}
                  </Button>
                </div>

                {/* Edit Form */}
                {editMode && (
                  <form onSubmit={handleSubmit} className="space-y-6 pt-2 border-b pb-6 mb-4">
                    <h3 className="text-base font-bold text-gray-800 border-b pb-2">
                      แก้ไขข้อมูลส่วนตัว
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          เปลี่ยนรูปโปรไฟล์
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="relative w-14 h-14 rounded-full overflow-hidden border shrink-0">
                            <Image
                              src={imagePreview || "/default-avatar.png"}
                              alt="Preview"
                              className="object-cover"
                              fill
                            />
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          ชื่อ-นามสกุล <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="กรอกชื่อ-นามสกุล"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          อีเมล (ไม่สามารถแก้ไขได้)
                        </label>
                        <Input
                          value={profile?.email || user?.email || ""}
                          disabled
                          className="bg-gray-100 text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          เบอร์โทรศัพท์
                        </label>
                        <Input
                          name="phone"
                          value={formData.phone || ""}
                          onChange={handleInputChange}
                          placeholder="08X-XXX-XXXX"
                        />
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {errorMsg}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button type="submit" disabled={isSubmitting} className="bg-fg hover:bg-fg/85 text-white">
                        {isSubmitting ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setEditMode(false)}
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Quick Stat Cards Dashboard (4 Stats Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Orders Card */}
              <button
                onClick={() => setActiveTab("orders")}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 bg-surface-muted text-fg rounded-xl group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-5 h-5" />
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">
                  {userStats.totalOrders || 0}
                </div>
                <div className="text-xs text-gray-500 font-medium">คำสั่งซื้อทั้งหมด</div>
              </button>

              {/* Total Spent Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">
                  ฿{Number(userStats.totalSpent || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 font-medium">ยอดชำระสะสม</div>
              </div>

              {/* Points Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-left">
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                    <Star className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                    สะสมแต้ม
                  </span>
                </div>
                <div className="text-2xl font-bold text-amber-600 mb-0.5">
                  {points || profile?.points || 0}
                </div>
                <div className="text-xs text-gray-500 font-medium">แต้มสะสมทั้งหมด</div>
              </div>

              {/* Saved Addresses Card */}
              <button
                onClick={() => setActiveTab("shipping")}
                className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                    <MapPin className="w-5 h-5" />
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-0.5">
                  {addresses.length || userStats.addressCount || 0}
                </div>
                <div className="text-xs text-gray-500 font-medium">ที่อยู่จัดส่งที่บันทึก</div>
              </button>
            </div>

            {/* Detail Info Cards Grid (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Info Details */}
              <Card className="border border-gray-100 shadow-sm">
                <CardHeader className="border-b pb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <User className="w-4 h-4 text-fg" />
                    ข้อมูลรายละเอียดบัญชี
                  </h3>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-medium text-gray-500">ชื่อ-นามสกุล</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {profile?.name || formData.name || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-medium text-gray-500">อีเมล</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">
                        {profile?.email || user?.email || "-"}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" title="อีเมลได้รับการยืนยัน" />
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-medium text-gray-500">เบอร์โทรศัพท์</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {formData.phone || profile?.phone || "ไม่ได้ระบุ"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-medium text-gray-500">วิธีเข้าสู่ระบบ</span>
                    <span className="text-sm font-semibold text-gray-800 capitalize">
                      {profile?.provider === "google" ? "Google Account" : "Email & Password"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-medium text-gray-500">วันที่สมัครสมาชิก</span>
                    <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-medium text-gray-500">เข้าใช้งานล่าสุด</span>
                    <span className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {profile?.lastLoginAt
                        ? new Date(profile.lastLoginAt).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "เมื่อเร็วๆ นี้"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Summary & Perks Card */}
              <Card className="border border-gray-100 shadow-sm flex flex-col justify-between">
                <div>
                  <CardHeader className="border-b pb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      ที่อยู่หลัก & สิทธิประโยชน์
                    </h3>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Default Shipping Address Overview */}
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-fg" />
                          ที่อยู่หลักสำหรับจัดส่ง
                        </span>
                        <button
                          onClick={() => setActiveTab("shipping")}
                          className="text-xs text-fg hover:underline font-medium"
                        >
                          จัดการที่อยู่
                        </button>
                      </div>

                      {addresses.find((a) => a.isDefault) || addresses[0] ? (
                        (() => {
                          const defAddr = addresses.find((a) => a.isDefault) || addresses[0];
                          return (
                            <div className="text-xs text-gray-600 space-y-0.5">
                              <p className="font-semibold text-gray-800">{defAddr.fullName}</p>
                              <p>{defAddr.addressLine1} {defAddr.subdistrict} {defAddr.district} {defAddr.province} {defAddr.postalCode}</p>
                              <p className="text-gray-500">โทร: {defAddr.phoneNumber}</p>
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-xs text-gray-400 italic">
                          ยังไม่ได้เพิ่มที่อยู่จัดส่ง
                        </p>
                      )}
                    </div>

                    {/* Member Benefits */}
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-bold text-amber-900">
                          สิทธิพิเศษสำหรับสมาชิก
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        ทุกๆ การสั่งซื้อสินค้า 100 บาท รับทันที 1 แต้มสะสม เพื่อนำไปแลกเป็นคูปองส่วนลดและสิทธิพิเศษมากมาย!
                      </p>
                    </div>
                  </CardContent>
                </div>

                <div className="p-6 pt-0">
                  <Button
                    onClick={() => setActiveTab("orders")}
                    className="w-full bg-surface-muted hover:bg-fg/10 text-fg border-0 flex items-center justify-center gap-2 font-medium text-sm py-2.5"
                  >
                    <Package className="w-4 h-4" />
                    ดูประวัติคำสั่งซื้อทั้งหมด
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Address Tab */}
        {activeTab === "shipping" && (
          <Card className="animate-fade-in">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">ที่อยู่จัดส่ง</h2>
              <Button
                className="flex items-center gap-2"
                onClick={() => {
                  setEditAddress(true);
                  setEditId(null);
                  setAddressData({
                    fullName: "",
                    address: "",
                    subdistrict: "",
                    city: "",
                    state: "",
                    country: "Thailand",
                    postalCode: "",
                    phoneNumber: "",
                    isDefault: addresses.length === 0,
                  });
                }}
              >
                <PlusIcon className="w-4 h-4" /> เพิ่มที่อยู่ใหม่
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              {!editAddress ? (
                <div className="space-y-6">
                  {addresses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <MapPin className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-gray-500 text-lg">ยังไม่มีที่อยู่</p>
                      <p className="text-gray-400 text-sm">
                        เพิ่มที่อยู่สำหรับการจัดส่งสินค้า
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={classNames(
                          "border rounded-xl p-5 bg-white shadow-sm relative group transition-all",
                          addr.isDefault
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {addr.isDefault ? (
                              <Star className="w-5 h-5 text-yellow-500 fill-yellow-300" />
                            ) : (
                              <MapPin className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="font-semibold text-gray-800">
                                {addr.fullName || "ไม่ระบุ"}
                              </p>
                              {addr.isDefault && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                  หลัก
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {addr.addressLine1 || "ไม่ระบุที่อยู่"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {addr.subdistrict && `${addr.subdistrict}, `}
                              {addr.district}, {addr.province} {addr.postalCode}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <Phone className="w-3 h-3 mr-1" />
                              <span>
                                {addr.phoneNumber || "ไม่ระบุเบอร์โทร"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            onClick={() => startEditAddress(addr)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteAddress(addr.id)}
                          >
                            ลบ
                          </Button>
                          {!addr.isDefault && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                            >
                              ตั้งเป็นที่อยู่หลัก
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmitAddress}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in"
                >
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-600 mb-1">
                        ชื่อ-นามสกุล
                      </label>
                      <Input
                        name="fullName"
                        value={addressData.fullName}
                        onChange={handleAddressChange}
                        placeholder="ชื่อ-นามสกุล"
                        required
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-600 mb-1">
                      ที่อยู่ (บ้านเลขที่, อาคาร, ถนน)
                    </label>
                    <Textarea
                      name="address"
                      value={addressData.address}
                      onChange={handleAddressChange}
                      placeholder="ที่อยู่ (บ้านเลขที่, อาคาร, ถนน)"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">จังหวัด</label>
                    <select
                      name="state"
                      value={addressData.state}
                      onChange={handleAddressChange}
                      required
                      className="w-full border rounded px-3 py-2 text-gray-800 bg-white"
                    >
                      <option value="" className="text-gray-800 bg-white">เลือกจังหวัด</option>
                      {provinces.map((prov) => (
                        <option key={prov.id} value={prov.nameTh} className="text-gray-800 bg-white">
                          {prov.nameTh}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">
                      เขต/อำเภอ
                    </label>
                    <select
                      name="city"
                      value={addressData.city}
                      onChange={handleAddressChange}
                      required
                      className="w-full border rounded px-3 py-2 text-gray-800 bg-white"
                      disabled={!addressData.state}
                    >
                      <option value="" className="text-gray-800 bg-white">เลือกอำเภอ</option>
                      {districts.map((dist) => (
                        <option key={dist.id} value={dist.nameTh} className="text-gray-800 bg-white">
                          {dist.nameTh}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">ตำบล</label>
                    <select
                      name="subdistrict"
                      value={addressData.subdistrict}
                      onChange={handleAddressChange}
                      required
                      className="w-full border rounded px-3 py-2 text-gray-800 bg-white"
                      disabled={!addressData.city}
                    >
                      <option value="" className="text-gray-800 bg-white">เลือกตำบล</option>
                      {subdistricts.map((sub) => (
                        <option key={sub.id} value={sub.nameTh} className="text-gray-800 bg-white">
                          {sub.nameTh}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">ประเทศ</label>
                    <Input
                      name="country"
                      value={addressData.country}
                      onChange={handleAddressChange}
                      placeholder="ประเทศ"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">
                      รหัสไปรษณีย์
                    </label>
                    <Input
                      name="postalCode"
                      value={addressData.postalCode}
                      onChange={handleAddressChange}
                      placeholder="รหัสไปรษณีย์"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1">
                      เบอร์โทรศัพท์
                    </label>
                    <Input
                      name="phoneNumber"
                      value={addressData.phoneNumber}
                      onChange={handleAddressChange}
                      placeholder="เบอร์โทรศัพท์"
                      required
                    />
                  </div>
                  {addresses.length === 0 && (
                    <div className="md:col-span-2 flex items-center mt-2">
                      <input
                        type="checkbox"
                        id="isDefault"
                        checked={addressData.isDefault}
                        onChange={(e) =>
                          setAddressData((prev) => ({
                            ...prev,
                            isDefault: e.target.checked,
                          }))
                        }
                        className="mr-2 accent-indigo-500"
                      />
                      <label htmlFor="isDefault" className="text-gray-600">
                        ตั้งเป็นที่อยู่หลัก
                      </label>
                    </div>
                  )}
                  <div className="md:col-span-2 flex gap-2 mt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting
                        ? "กำลังบันทึก..."
                        : editId
                        ? "บันทึกการแก้ไข"
                        : "บันทึกที่อยู่ใหม่"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setEditAddress(false);
                        setEditId(null);
                      }}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                  {successMsg && (
                    <p className="md:col-span-2 text-green-600">{successMsg}</p>
                  )}
                  {errorMsg && (
                    <p className="md:col-span-2 text-red-500">{errorMsg}</p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <Card className="animate-fade-in">
            <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                ประวัติการสั่งซื้อ
              </h2>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingOrders ? (
                <div className="text-gray-500 text-center py-8">
                  กำลังโหลด...
                </div>
              ) : errorOrders ? (
                <div className="text-red-500 text-center py-8">
                  {errorOrders}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  ยังไม่มีประวัติการสั่งซื้อ
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const firstItem = order.items?.[0];
                    const moreCount = (order.items?.length || 0) - 1;
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between bg-white rounded-xl border p-4 mb-4 shadow-sm hover:shadow transition"
                      >
                        {/* รูปสินค้า */}
                        <div className="relative mr-4 h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                          <ProductImage
                            imageUrl={firstItem?.product?.imageUrl}
                            alt={firstItem?.product?.name || "สินค้า"}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        {/* ข้อมูลออเดอร์ */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {/* getStatusBadge ใช้จากหน้า profile หรือคัดลอกฟังก์ชันจาก orders/page.js */}
                            {getStatusBadge(order.status)}
                            <span className="text-xs text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="font-bold text-gray-800 text-sm">
                            Order ID: {order.id}
                          </div>
                          <div className="truncate text-gray-700 text-sm">
                            {firstItem?.product?.name}
                            {moreCount > 0 && (
                              <span className="text-fg ml-1">
                                & {moreCount} more item&#39;s
                              </span>
                            )}
                          </div>
                        </div>
                        {/* ยอดรวมและปุ่มดูรายละเอียด */}
                        <div className="text-right ml-4 flex flex-col items-end">
                          <div className="font-bold text-fg text-base">
                            ฿
                            {order.total?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="mt-2 text-fg hover:text-fg"
                            aria-label="ดูรายละเอียด"
                          >
                            <ChevronRight className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {activeTab === "coupons" && (
          <Card className="animate-fade-in">
            <CardHeader className="border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">คูปองของฉัน</h2>
            </CardHeader>
            <CardContent className="pt-6">
              <CouponWallet />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// เพิ่ม getStatusBadge ฟังก์ชัน (คัดลอกจาก orders/page.js)
function getStatusBadge(status) {
  const map = {
    pending: { color: "bg-yellow-100 text-yellow-800", icon: Package },
    processing: { color: "bg-blue-100 text-blue-800", icon: Package },
    shipped: { color: "bg-purple-100 text-purple-800", icon: Package },
    delivered: { color: "bg-green-100 text-green-800", icon: Package },
    cancelled: { color: "bg-red-100 text-red-800", icon: Package },
    refunded: { color: "bg-gray-100 text-gray-800", icon: Package },
  };
  const key = status?.toLowerCase();
  const badge = map[key] || map["pending"];
  const Icon = badge.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}
    >
      <Icon className="w-4 h-4" />
      {status}
    </span>
  );
}
