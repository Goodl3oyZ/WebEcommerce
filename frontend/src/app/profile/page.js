"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usersAPI } from "@/lib/api/users";
import { addressAPI } from "@/lib/api/address";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
          const user = profileRes.data.user;
          setProfile(user);
          setFormData({ name: user.name });
          setImagePreview(user.avatar || null);
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
      const data = await addressAPI.getSubdistricts(addressData.city);
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
        const sub = subdistricts.find((s) => s.name_th === value);
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
      Object.entries(formData).forEach(([k, v]) => payload.append(k, v));
      if (selectedImage) payload.append("image", selectedImage);

      const updated = await usersAPI.updateProfile(payload);
      setProfile((prev) => ({ ...prev, avatar: updated.url }));
      setSuccessMsg("บันทึกข้อมูลเรียบร้อยแล้ว");
      setEditMode(false);
    } catch (err) {
      setErrorMsg("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
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
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      {/* Sidebar open button for mobile (user icon) - only when sidebar is closed */}
      {!sidebarOpen && (
        <button
          className="fixed top-20 right-4 z-50 md:hidden bg-white rounded-full p-2 shadow focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="rounded-full object-cover border-4 border-indigo-200 shadow"
                fill
              />
            </div>
            <div className="text-lg font-semibold text-gray-800">
              {formData.name || "-"}
            </div>
            <div className="text-xs text-gray-500">{user?.email || "-"}</div>
            <div className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium flex items-center gap-1">
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
                    ? "bg-indigo-600 text-white shadow"
                    : "hover:bg-indigo-50 text-gray-700"
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
              className="absolute top-4 left-4 bg-gray-100 rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="rounded-full object-cover border-4 border-indigo-200 shadow"
                  fill
                />
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {formData.name || "-"}
              </div>
              <div className="text-xs text-gray-500">{user?.email || "-"}</div>
              <div className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium flex items-center gap-1">
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
                      ? "bg-indigo-600 text-white shadow"
                      : "hover:bg-indigo-50 text-gray-700"
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
          <Card className="mb-8 animate-fade-in">
            <CardHeader className="flex flex-col md:flex-row items-center gap-8 border-b pb-6">
              <div className="relative w-36 h-36 group">
                <Image
                  src={imagePreview || "/default-avatar.png"}
                  alt="Avatar"
                  className="rounded-full object-cover border-4 border-indigo-200 shadow-lg"
                  fill
                />
                {editMode && (
                  <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs mb-1">เปลี่ยนรูป</span>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!editMode ? (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div>
                      <div className="text-gray-500 text-xs mb-1">ชื่อ</div>
                      <div className="text-lg font-medium">
                        {formData.name || "-"}
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => setEditMode(true)} className="mt-2">
                    แก้ไขข้อมูล
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div>
                    <label className="block text-gray-600 mb-1">
                      ชื่อ-นามสกุล
                    </label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="ชื่อ-นามสกุล"
                      required
                    />
                  </div>

                  <div className="col-span-full flex gap-2 mt-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditMode(false)}
                    >
                      ยกเลิก
                    </Button>
                  </div>
                  {successMsg && (
                    <p className="col-span-full text-green-600">{successMsg}</p>
                  )}
                  {errorMsg && (
                    <p className="col-span-full text-red-500">{errorMsg}</p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
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
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">เลือกจังหวัด</option>
                      {provinces.map((prov) => (
                        <option key={prov.id} value={prov.name_th}>
                          {prov.name_th}
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
                      className="w-full border rounded px-3 py-2"
                      disabled={!addressData.state}
                    >
                      <option value="">เลือกอำเภอ</option>
                      {districts.map((dist) => (
                        <option key={dist.id} value={dist.name_th}>
                          {dist.name_th}
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
                      className="w-full border rounded px-3 py-2"
                      disabled={!addressData.city}
                    >
                      <option value="">เลือกตำบล</option>
                      {subdistricts.map((sub) => (
                        <option key={sub.id} value={sub.name_th}>
                          {sub.name_th}
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
                        <Image
                          src={
                            firstItem?.product?.imageUrl?.[0] ||
                            "/placeholder.png"
                          }
                          alt={firstItem?.product?.name || "Product"}
                          className="w-16 h-16 object-cover rounded border mr-4"
                          width={64}
                          height={64}
                          style={{ objectFit: "cover" }}
                        />
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
                              <span className="text-indigo-600 ml-1">
                                & {moreCount} more item&#39;s
                              </span>
                            )}
                          </div>
                        </div>
                        {/* ยอดรวมและปุ่มดูรายละเอียด */}
                        <div className="text-right ml-4 flex flex-col items-end">
                          <div className="font-bold text-indigo-600 text-base">
                            ฿
                            {order.total?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="mt-2 text-indigo-600 hover:text-indigo-800"
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
