"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import {
  cartAPI,
  addressAPI,
  paymentsAPI,
  orderAPI,
  shippingAPI,
} from "@/lib/api";
import useCartStore from "@/store/cartStore";
import { FiPhone } from "react-icons/fi";
import Image from "next/image";

// เพิ่มฟังก์ชัน mapping error message เป็นภาษาไทย (วางไว้บนสุดของไฟล์)
const omiseErrorMap = {
  "number is invalid": "หมายเลขบัตรไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
  "number is invalid and brand not supported (unknown)":
    "หมายเลขบัตรไม่ถูกต้อง หรือบัตรนี้ไม่รองรับ กรุณาตรวจสอบอีกครั้ง",
  "brand not supported": "บัตรนี้ไม่รองรับ กรุณาใช้บัตรอื่น",
  "expiration_month is invalid": "เดือนหมดอายุไม่ถูกต้อง",
  "expiration_year is invalid": "ปีหมดอายุไม่ถูกต้อง",
  "security code is invalid": "CVC/CVV ไม่ถูกต้อง",
  "name is invalid": "ชื่อบนบัตรไม่ถูกต้อง",
  "network error":
    "ไม่สามารถเชื่อมต่อกับระบบชำระเงิน กรุณาตรวจสอบอินเทอร์เน็ตหรือข้อมูลบัตรอีกครั้ง",
  // เพิ่มเติมตามที่ Omise ส่งกลับมาได้
};
function getOmiseErrorMessage(msg) {
  if (!msg) return "เกิดข้อผิดพลาดในการชำระเงิน กรุณาตรวจสอบข้อมูลบัตรอีกครั้ง";
  const lower = msg.toLowerCase();
  // ลอง match แบบ contains ด้วย
  for (const key in omiseErrorMap) {
    if (lower.includes(key)) return omiseErrorMap[key];
  }
  return (
    omiseErrorMap[lower] ||
    "เกิดข้อผิดพลาดในการชำระเงิน กรุณาตรวจสอบข้อมูลบัตรอีกครั้ง"
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [qrUrl, setQrUrl] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardNumberError, setCardNumberError] = useState("");
  const [cardNameError, setCardNameError] = useState("");
  const [expiryError, setExpiryError] = useState("");
  const [cvvError, setCvvError] = useState("");
  const modalMethod =
    paymentMethods.find((m) => m.id === paymentMethodId) ||
    paymentMethods.find((m) => m.code?.toLowerCase() === "card") ||
    paymentMethods[0];
  const [modalQrUrl, setModalQrUrl] = useState(null);
  const [modalOrderId, setModalOrderId] = useState(null);
  const clearCartStore = useCartStore((state) => state.clearCart);
  const [orderIdForRetry, setOrderIdForRetry] = useState(null);
  const [error, setError] = useState("");

  const formatPrice = (price) => new Intl.NumberFormat("th-TH").format(price);

  // Fix double-URL prefix from malformed Minio uploads
  const getCleanImageUrl = (url) => {
    if (!url) return "/images/placeholder.svg";
    try {
      const match = url.match(/(https?:\/\/.+)(https?:\/\/)/);
      if (match) return url.slice(match[1].length);
      return url;
    } catch {
      return "/images/placeholder.svg";
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        // โหลด cart
        const cartRes = await cartAPI.getCart();
        setCart(cartRes);

        // โหลด addresses
        setAddressLoading(true);
        const addrRes = await addressAPI.getAddresses();
        setAddresses(addrRes.addresses || []);
        setAddressLoading(false);

        // ตั้งค่า address ที่เลือก
        const defaultAddr =
          (addrRes.addresses || []).find((a) => a.isDefault) ||
          (addrRes.addresses || [])[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          const shippingRes = await shippingAPI.getMethods(defaultAddr.id);
          setShippingMethods(shippingRes);
          setShippingCost(
            shippingRes.length > 0 ? Number(shippingRes[0].price) : 0
          );
          if (shippingRes.length > 0) setShippingMethodId(shippingRes[0].id);
        }

        const paymentRes = await paymentsAPI.getPaymentMethods();
        setPaymentMethods(paymentRes);
        if (paymentRes.length > 0) setPaymentMethodId(paymentRes[0].id);
      } catch (err) {
        console.error(err);
        toast.error("โหลดข้อมูลล้มเหลว");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // โหลด shipping methods ใหม่เมื่อเปลี่ยน address
  useEffect(() => {
    const loadShippingMethods = async () => {
      if (!selectedAddressId) return;
      try {
        setShippingMethods([]);
        setShippingCost(111);
        setShippingLoading(true);
        const shippingRes = await shippingAPI.getMethods(selectedAddressId);
        setShippingMethods(shippingRes);
        setShippingCost(
          shippingRes.length > 0 ? Number(shippingRes[0].price) : 0
        );
        if (shippingRes.length > 0) setShippingMethodId(shippingRes[0].id);
        else setShippingMethodId("");
      } catch (err) {
        setShippingMethods([]);
        setShippingCost(111);
        setShippingMethodId("");
      } finally {
        setShippingLoading(false);
      }
    };
    loadShippingMethods();
  }, [selectedAddressId]);

  // Reset QR เมื่อเปลี่ยน payment method
  useEffect(() => {
    setQrUrl(null);
  }, [paymentMethodId]);

  // Create the PromptPay order once per payment attempt (the ref also guards
  // against React running the effect twice in development).
  const promptPayAttempt = useRef(false);
  useEffect(() => {
    const isPromptPay = modalMethod?.code?.toLowerCase() === "promptpay";
    if (!showPaymentModal || !isPromptPay || modalOrderId || promptPayAttempt.current) return;
    promptPayAttempt.current = true;
    const createPromptPay = async () => {
      setModalQrUrl(null);
      setIsSubmitting(true);
      try {
        const orderRes = await orderAPI.createOrder({
          shippingAddressId: selectedAddressId,
          shippingMethodId,
          paymentMethodId,
          items: cart.items.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id || null,
            quantity: item.quantity,
          })),
        });
        const order = orderRes.data || orderRes;
        if (order?.id) setModalOrderId(order.id);
        const qrUri =
          order?.charge?.qrCodeUrl || order?.charge?.source?.scannable_code?.image?.download_uri;
        if (qrUri) {
          setModalQrUrl(qrUri);
        } else {
          toast.error("ไม่สามารถสร้าง QR Code ได้");
        }
      } catch (err) {
        promptPayAttempt.current = false;
        console.error("Error creating PromptPay QR:", err.response?.data?.message || err.message, err);
        toast.error("สร้าง QR ไม่สำเร็จ: " + (err.response?.data?.message || err.message));
      } finally {
        setIsSubmitting(false);
      }
    };
    createPromptPay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPaymentModal, modalMethod, modalOrderId]);

  // Closing the modal without paying cancels the PromptPay order so its stock
  // is released; "done" (after scanning) keeps it pending until paid.
  const closePaymentModal = async ({ keepOrder = false } = {}) => {
    setShowPaymentModal(false);
    if (modalOrderId && !keepOrder) {
      await orderAPI.cancelOrder(modalOrderId, "Payment cancelled at checkout").catch(() => {});
    }
    setModalOrderId(null);
    setModalQrUrl(null);
    promptPayAttempt.current = false;
  };

  // ตั้งค่า default paymentMethodId หลังโหลด paymentMethods
  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethodId) {
      const credit = paymentMethods.find(
        (m) => m.code?.toLowerCase() === "card"
      );
      setPaymentMethodId(credit ? credit.id : paymentMethods[0].id);
    }
  }, [paymentMethods, paymentMethodId, cart.subtotal]);

  // เพิ่มฟังก์ชัน mapping code สำหรับ backend
  function getBackendPaymentMethod(code) {
    switch (code?.toLowerCase()) {
      case "card":
        return "credit_card";
      case "promptpay":
        return "promptpay";
      case "cod":
        return "cash_on_delivery";
      default:
        return code?.toLowerCase();
    }
  }

  // เพิ่ม useEffect สำหรับคำนวณค่าจัดส่งจริงด้วย shippingAPI.calculateShippingCost
  useEffect(() => {
    const fetchShippingCost = async () => {
      if (!selectedAddressId || cart.items.length === 0) return;
      setShippingLoading(true);
      try {
        // เรียก shippingAPI.calculateShippingCost เพื่อให้ค่าจัดส่งตรง backend
        const shippingCosts = await shippingAPI.calculateShippingCost(
          selectedAddressId,
          cart.items.map((item) => ({
            productId: item.product.id,
            variantId: item.variant?.id || null,
            quantity: item.quantity,
            weight: item.product.weight || 1, // ถ้ามี weight
          }))
        );
        if (shippingCosts.length > 0) {
          setShippingMethods(
            shippingCosts.map((m) => ({
              id: m.methodId,
              name: m.methodName,
              price: m.cost,
            }))
          );
          setShippingCost(Number(shippingCosts[0].cost));
          setShippingMethodId(shippingCosts[0].methodId);
        } else {
          setShippingMethods([]);
          setShippingCost(0);
          setShippingMethodId("");
        }
      } catch (err) {
        setShippingMethods([]);
        setShippingCost(0);
        setShippingMethodId("");
        toast.error("ไม่สามารถคำนวณค่าจัดส่งได้");
      } finally {
        setShippingLoading(false);
      }
    };
    fetchShippingCost();
  }, [selectedAddressId, cart.items, cart.subtotal]);

  // เพิ่มฟังก์ชันชำระเงินที่รองรับการชำระเงินสำเร็จและล้มเหลว
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!shippingMethodId) {
      toast.error("กรุณาเลือกวิธีการจัดส่ง");
      return;
    }
    if (!paymentMethodId) {
      toast.error("กรุณาเลือกวิธีการชำระเงิน");
      return;
    }
    const backendMethod = getBackendPaymentMethod(modalMethod?.code);
    try {
      setIsSubmitting(true);
      const shippingAddress = addresses.find((a) => a.id === selectedAddressId);
      const items = cart.items.map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id || null,
        quantity: item.quantity,
      }));
      // เรียก shippingAPI.calculateShippingCost อีกครั้งก่อน submit เพื่อความแม่นยำ
      const shippingCosts = await shippingAPI.calculateShippingCost(
        selectedAddressId,
        items
      );
      const selectedShipping = shippingCosts.find(
        (m) => m.methodId === shippingMethodId
      );
      if (!selectedShipping) {
        toast.error("วิธีจัดส่งไม่ถูกต้อง กรุณาเลือกใหม่");
        setIsSubmitting(false);
        return;
      }
      const orderData = {
        shippingAddressId: shippingAddress.id,
        billingAddressId: shippingAddress.id,
        shippingMethodId,
        paymentMethodId,
        items,
        shippingCost: selectedShipping.cost,
        paymentAmount: cart.subtotal + Number(selectedShipping.cost),
      };
      if (backendMethod === "credit_card") {
        // Validate
        const nErr = validateCardNumber(cardNumber);
        const nmErr = validateCardName(cardName);
        const exErr = validateExpiry(expiry);
        const cvErr = validateCvv(cvv);
        setCardNumberError(nErr);
        setCardNameError(nmErr);
        setExpiryError(exErr);
        setCvvError(cvErr);
        if (nErr || nmErr || exErr || cvErr) {
          setIsSubmitting(false);
          return;
        }
        // Omise.js
        const [expiration_month, expiration_year] = expiry.split("/");
        if (!window.Omise) {
          toast.error("Omise.js not loaded");
          setIsSubmitting(false);
          return;
        }
        window.Omise.setPublicKey(
          process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ||
            "pkey_test_5u15668b556f8f53703"
        );
        const cardToken = await new Promise((resolve, reject) => {
          window.Omise.createToken(
            "card",
            {
              name: cardName,
              number: cardNumber.replace(/\s/g, ""),
              expiration_month: expiration_month,
              expiration_year:
                expiration_year.length === 2
                  ? "20" + expiration_year
                  : expiration_year,
              security_code: cvv,
            },
            (statusCode, response) => {
              if (statusCode === 200) {
                resolve(response.id);
              } else {
                toast.error(getOmiseErrorMessage(response.message));
                setIsSubmitting(false);
                reject({ handled: true });
              }
            }
          );
        });
        // ส่ง token ไปกับ orderData
        orderData.omiseToken = cardToken;
      }
      try {
        const orderRes = await orderAPI.createOrder(orderData);
        const order = orderRes.data;
        if (order && order.paymentStatus === "completed") {
          router.push(`/orders/${order.id}`);
        } else if (order && order.paymentStatus === "pending") {
          toast.error("รอการยืนยันการชำระเงิน กรุณาตรวจสอบสถานะอีกครั้ง");
        } else {
          toast.error("การชำระเงินล้มเหลว กรุณาลองใหม่");
        }
      } catch (err) {
        // Debug ดู error ที่เกิดขึ้นจริง
        console.log("Payment error:", err);
        // ถ้า error ถูก handle แล้ว หรือเป็น Network error string ตรงๆ ไม่ต้อง toast ซ้ำ
        if (
          (err && err.handled) ||
          err === "Network error" ||
          err?.message === "Network error"
        ) {
          return;
        }
        if (
          (typeof err === "string" && err.toLowerCase().includes("network")) ||
          (err?.message && err.message.toLowerCase().includes("network"))
        ) {
          toast.error(omiseErrorMap["network error"]);
        } else {
          toast.error(getOmiseErrorMessage(err?.message));
        }
      }
    } catch (err) {
      toast.error(err?.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalPayment = async () => {
    if (isSubmitting) return;
    if (!shippingMethodId) {
      toast.error("กรุณาเลือกวิธีการจัดส่ง");
      return;
    }
    if (!paymentMethodId) {
      toast.error("กรุณาเลือกวิธีการชำระเงิน");
      return;
    }
    const backendMethod = getBackendPaymentMethod(modalMethod?.code);
    setIsSubmitting(true);
    try {
      const shippingAddress = addresses.find((a) => a.id === selectedAddressId);
      const items = cart.items.map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id || null,
        quantity: item.quantity,
      }));
      // เรียก shippingAPI.calculateShippingCost อีกครั้งก่อน submit เพื่อความแม่นยำ
      const shippingCosts = await shippingAPI.calculateShippingCost(
        selectedAddressId,
        items
      );
      const selectedShipping = shippingCosts.find(
        (m) => m.methodId === shippingMethodId
      );
      if (!selectedShipping) {
        toast.error("วิธีจัดส่งไม่ถูกต้อง กรุณาเลือกใหม่");
        return;
      }
      const orderData = {
        shippingAddressId: shippingAddress.id,
        billingAddressId: shippingAddress.id,
        shippingMethodId,
        paymentMethodId,
        items,
        shippingCost: selectedShipping.cost,
        paymentAmount: cart.subtotal + Number(selectedShipping.cost),
      };
      if (backendMethod === "credit_card") {
        // Validate
        const nErr = validateCardNumber(cardNumber);
        const nmErr = validateCardName(cardName);
        const exErr = validateExpiry(expiry);
        const cvErr = validateCvv(cvv);
        setCardNumberError(nErr);
        setCardNameError(nmErr);
        setExpiryError(exErr);
        setCvvError(cvErr);
        if (nErr || nmErr || exErr || cvErr) {
          return;
        }
        // Omise.js
        const [expiration_month, expiration_year] = expiry.split("/");
        if (!window.Omise) {
          toast.error("Omise.js not loaded");
          return;
        }
        window.Omise.setPublicKey(
          process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY ||
            "pkey_test_5u15668b556f8f53703"
        );
        try {
          const cardToken = await new Promise((resolve, reject) => {
            window.Omise.createToken(
              "card",
              {
                name: cardName,
                number: cardNumber.replace(/\s/g, ""),
                expiration_month: expiration_month,
                expiration_year:
                  expiration_year.length === 2
                    ? "20" + expiration_year
                    : expiration_year,
                security_code: cvv,
              },
              (statusCode, response) => {
                if (statusCode === 200) {
                  resolve(response.id);
                } else {
                  toast.error(getOmiseErrorMessage(response.message));
                  reject({ handled: true });
                }
              }
            );
          });
          orderData.omiseToken = cardToken;
        } catch (err) {
          // ถ้า error ถูก handle แล้ว หรือเป็น Network error string ตรงๆ ไม่ต้อง toast ซ้ำ
          if (
            (err && err.handled) ||
            err === "Network error" ||
            err?.message === "Network error"
          ) {
            return;
          }
          if (
            (typeof err === "string" &&
              err.toLowerCase().includes("network")) ||
            (err?.message && err.message.toLowerCase().includes("network"))
          ) {
            toast.error(omiseErrorMap["network error"]);
          } else {
            toast.error(getOmiseErrorMessage(err?.message));
          }
          return;
        }
      }
      try {
        const orderRes = await orderAPI.createOrder(orderData);
        const order = orderRes.data;
        if (order && order.paymentStatus === "completed") {
          router.push(`/orders/${order.id}`);
        } else if (order && order.paymentStatus === "pending") {
          toast.error("รอการยืนยันการชำระเงิน กรุณาตรวจสอบสถานะอีกครั้ง");
        } else {
          toast.error("การชำระเงินล้มเหลว กรุณาลองใหม่");
        }
      } catch (err) {
        // Debug ดู error ที่เกิดขึ้นจริง
        console.log("Payment error:", err);
        if (
          (err && err.handled) ||
          err === "Network error" ||
          err?.message === "Network error"
        ) {
          return;
        }
        if (
          (typeof err === "string" && err.toLowerCase().includes("network")) ||
          (err?.message && err.message.toLowerCase().includes("network"))
        ) {
          toast.error(omiseErrorMap["network error"]);
        } else {
          toast.error(getOmiseErrorMessage(err?.message));
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCardNumber = (num) => {
    const clean = num.replace(/\s+/g, "");
    if (!clean) return "กรุณากรอกหมายเลขบัตร";
    if (clean.length < 13 || clean.length > 19)
      return "หมายเลขบัตรต้องมี 13-19 หลัก";
    return "";
  };
  const validateCardName = (name) => {
    if (!name.trim()) return "กรุณากรอกชื่อบนบัตร";
    return "";
  };
  const validateExpiry = (exp) => {
    if (!/^\d{2}\/\d{2}$/.test(exp)) return "รูปแบบ MM/YY";
    const [mm, yy] = exp.split("/");
    const month = parseInt(mm, 10);
    const year = parseInt(yy.length === 2 ? "20" + yy : yy, 10);
    const now = new Date();
    if (month < 1 || month > 12) return "เดือนต้องอยู่ระหว่าง 01-12";
    if (
      year < now.getFullYear() ||
      (year === now.getFullYear() && month < now.getMonth() + 1)
    )
      return "วันหมดอายุในอดีต";
    return "";
  };
  const validateCvv = (cvv) => {
    if (!/^\d{3,4}$/.test(cvv)) return "CVC ต้องมี 3 หรือ 4 หลัก";
    return "";
  };

  const handleCardNumberChange = (e) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 19);
    // ถ้าใส่หมายเลขบัตรทดสอบ Omise 4242... (14-15 หลัก) ให้ขยายเป็น 16 หลักสำหรับเทสอัตโนมัติ
    if (raw.startsWith("4242") && raw.length >= 14 && raw.length < 16) {
      raw = raw.padEnd(16, "42");
    }
    let formatted = raw.replace(/(.{4})/g, "$1 ").trim();
    setCardNumber(formatted);
    setCardNumberError(validateCardNumber(raw));
  };
  const handleCardNameChange = (e) => {
    setCardName(e.target.value);
    setCardNameError(validateCardName(e.target.value));
  };
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/[^\d]/g, "");
    if (value.length > 4) value = value.slice(0, 4);
    // auto-format: MM/YY
    if (value.length > 2) value = value.slice(0, 2) + "/" + value.slice(2);
    setExpiry(value);
    setExpiryError(validateExpiry(value));
  };
  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCvv(value);
    setCvvError(validateCvv(value));
  };

  // handleCheckoutClick: เปิด modal
  const handleCheckoutClick = (e) => {
    e.preventDefault();
    if (!paymentMethodId) {
      toast.error("กรุณาเลือกวิธีการชำระเงิน");
      return;
    }
    setShowPaymentModal(true);
    setModalQrUrl(null);
    setModalOrderId(null);
  };

  // เพิ่ม useEffect นี้แทน
  useEffect(() => {
    const selected = shippingMethods.find((m) => m.id === shippingMethodId);
    setShippingCost(Number(selected?.price || 0));
  }, [shippingMethodId, shippingMethods]);

  // เพิ่มฟังก์ชัน waitForPaymentStatus
  async function waitForPaymentStatus(orderId, router, setLoading, setError) {
    let maxTries = 15; // 30 วินาที
    for (let i = 0; i < maxTries; i++) {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (data?.data?.paymentStatus === "completed") {
          setLoading(false);
          router.push(`/orders/${orderId}`);
          return;
        }
        if (data?.data?.paymentStatus === "failed") {
          setLoading(false);
          setError("การชำระเงินล้มเหลว กรุณาลองใหม่");
          return;
        }
      } catch (e) {
        // ignore
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setLoading(false);
    setError("ตรวจสอบสถานะการชำระเงินไม่สำเร็จ กรุณาตรวจสอบภายหลัง");
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen animate-fade-in">
        <Loader2 className="animate-spin h-12 w-12 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-8 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center tracking-tight animate-fade-in-down">
        สรุปคำสั่งซื้อ
      </h1>
      <div className="flex flex-col lg:flex-row gap-8 animate-fade-in-up">
        {/* LEFT: รายละเอียดคำสั่งซื้อ */}
        <div className="flex-1 space-y-6">
          {/* ที่อยู่ */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeWidth="2"
                    d="M12 21s8-6.5 8-11.5A8 8 0 0 0 4 9.5C4 14.5 12 21 12 21Z"
                  />
                  <circle
                    cx="12"
                    cy="9.5"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                ที่อยู่จัดส่ง
              </h2>
            </div>
            {addressLoading ? (
              <div className="text-gray-500 animate-pulse">
                กำลังโหลดที่อยู่...
              </div>
            ) : addresses.length === 0 ? (
              <div className="text-gray-500">
                ไม่พบที่อยู่สำหรับจัดส่ง กรุณา
                <a href="/profile" className="text-blue-600 underline ml-1">
                  เพิ่มที่อยู่
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`border rounded-xl p-4 flex flex-col gap-1 bg-gray-50 cursor-pointer transition-all duration-150 ${
                      selectedAddressId === addr.id
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">
                        {addr.fullName}
                      </div>
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                    </div>
                    <div className="text-gray-700 text-sm space-y-1 leading-6">
                      <div>
                        {addr.addressLine1}
                        {addr.subdistrict && `, ${addr.subdistrict}`}
                        {addr.district && `, ${addr.district}`}
                        {addr.province && `, ${addr.province}`}
                        {addr.city && `, ${addr.city}`}
                        {addr.state && `, ${addr.state}`}
                        {addr.postalCode && ` ${addr.postalCode}`}
                        {addr.country && `, ${addr.country}`}
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 font-medium">
                        <FiPhone className="w-4 h-4" />
                        <span>{addr.phoneNumber}</span>
                      </div>
                    </div>

                    {addr.isDefault && (
                      <span className="inline-block text-xs text-green-600 font-semibold">
                        ค่าเริ่มต้น
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* รายการสินค้า */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <rect
                    width="18"
                    height="14"
                    x="3"
                    y="7"
                    stroke="currentColor"
                    strokeWidth="2"
                    rx="2"
                  />
                  <path
                    stroke="currentColor"
                    strokeWidth="2"
                    d="M16 3v4M8 3v4"
                  />
                </svg>
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                รายการสินค้า{" "}
                <span className="text-gray-500 font-normal">
                  ({cart.items.length})
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {cart.items.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  ไม่มีสินค้าในตะกร้า
                </div>
              ) : (
                cart.items.map((item) => (
                  <div
                    key={`${item.id}-${item.variantId || ""}`}
                    className="py-4 flex items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image
                        src={getCleanImageUrl(item.product?.imageUrl?.[0])}
                        alt={item.product?.name || "สินค้า"}
                        width={64}
                        height={64}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {item.product.name}
                      </div>
                      {item.variant && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                            {item.variant.color}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-700">
                            {item.variant.size}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        จำนวน: {item.quantity}
                      </div>
                    </div>
                    <div className="font-semibold text-gray-900 whitespace-nowrap">
                      ฿{formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* วิธีการจัดส่ง */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <rect
                    width="18"
                    height="10"
                    x="3"
                    y="7"
                    stroke="currentColor"
                    strokeWidth="2"
                    rx="2"
                  />
                  <path
                    stroke="currentColor"
                    strokeWidth="2"
                    d="M7 17v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2"
                  />
                </svg>
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                วิธีการจัดส่ง
              </h2>
            </div>
            {shippingLoading ? (
              <div className="text-gray-500 flex items-center gap-2 animate-pulse">
                <Loader2 className="animate-spin h-4 w-4" />{" "}
                กำลังโหลดวิธีการจัดส่ง...
              </div>
            ) : shippingMethods.length === 0 ? (
              <div className="text-gray-400">
                ไม่พบวิธีการจัดส่งสำหรับที่อยู่นี้
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {shippingMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                      shippingMethodId === method.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingMethod"
                      value={method.id}
                      checked={shippingMethodId === method.id}
                      onChange={() => setShippingMethodId(method.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {method.name}{" "}
                      {method.price ? (
                        <span className="text-xs text-gray-500">
                          (+฿{formatPrice(method.price)})
                        </span>
                      ) : (
                        ""
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* วิธีการชำระเงิน */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-blue-600">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <rect
                    width="18"
                    height="12"
                    x="3"
                    y="6"
                    stroke="currentColor"
                    strokeWidth="2"
                    rx="2"
                  />
                  <path
                    stroke="currentColor"
                    strokeWidth="2"
                    d="M7 10h.01M7 14h.01M17 10h.01M17 14h.01"
                  />
                </svg>
              </span>
              <h2 className="text-lg font-semibold text-gray-900">
                วิธีการชำระเงิน
              </h2>
            </div>
            {paymentMethods.length === 0 ? (
              <div className="text-gray-400">ไม่พบวิธีการชำระเงิน</div>
            ) : (
              <div className="flex flex-col gap-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                      paymentMethodId === method.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={paymentMethodId === method.id}
                      onChange={() => setPaymentMethodId(method.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {method.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: สรุปคำสั่งซื้อ */}
        <div className="w-full lg:w-96">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 sticky top-8 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              สรุปยอด
            </h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>ราคาสินค้า</span>
                <span>฿{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>ค่าจัดส่ง</span>
                <span>
                  {shippingLoading ? (
                    <Loader2 className="inline animate-spin h-4 w-4 text-gray-400" />
                  ) : shippingMethodId ? (
                    `฿${formatPrice(shippingCost)}`
                  ) : (
                    "-"
                  )}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    ยอดรวม
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    ฿{formatPrice(cart.subtotal + Number(shippingCost || 0))}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleCheckoutClick}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-bold text-base shadow hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none animate-fade-in"
              disabled={isSubmitting || cart.items.length === 0}
            >
              {isSubmitting ? "กำลังดำเนินการ..." : "ยืนยันคำสั่งซื้อ"}
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              การคลิกปุ่ม &#39;ชำระเงิน&#39; หมายความว่าคุณยอมรับ
              <a href="#" className="text-blue-600 hover:underline">
                ข้อกำหนดและเงื่อนไข
              </a>{" "}
              ของเรา
            </p>
          </div>
        </div>
      </div>

      {/* Modal สำหรับชำระเงิน */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4">ชำระเงิน</h2>
            {/* Loading state */}
            {paymentMethods.length === 0 ? (
              <div className="text-gray-500 py-8 text-center">
                กำลังโหลดวิธีชำระเงิน...
              </div>
            ) : modalMethod?.code?.toLowerCase() === "card" ? (
              <div className="space-y-2 my-4">
                <input
                  type="text"
                  autoFocus
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="หมายเลขบัตร (16 หลัก)"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className={`w-full border rounded px-3 py-2 ${
                    cardNumberError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {cardNumberError && (
                  <div className="text-xs text-red-500">{cardNumberError}</div>
                )}
                <input
                  type="text"
                  placeholder="ชื่อบนบัตร (ภาษาอังกฤษ)"
                  value={cardName}
                  onChange={handleCardNameChange}
                  className={`w-full border rounded px-3 py-2 ${
                    cardNameError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {cardNameError && (
                  <div className="text-xs text-red-500">{cardNameError}</div>
                )}
                <div className="flex gap-2">
                  <div className="w-1/2">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={handleExpiryChange}
                      maxLength={5}
                      className={`w-full border rounded px-3 py-2 ${
                        expiryError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {expiryError && (
                      <div className="text-xs text-red-500">{expiryError}</div>
                    )}
                  </div>
                  <div className="w-1/2">
                    <input
                      type="text"
                      placeholder="CVC"
                      value={cvv}
                      onChange={handleCvvChange}
                      maxLength={4}
                      className={`w-full border rounded px-3 py-2 ${
                        cvvError ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {cvvError && (
                      <div className="text-xs text-red-500">{cvvError}</div>
                    )}
                  </div>
                </div>
                <button
                  className="bg-indigo-600 text-white px-4 py-2 rounded font-bold w-full mt-4"
                  onClick={handleModalPayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "กำลังชำระเงิน..." : "ยืนยันชำระเงิน"}
                </button>
              </div>
            ) : modalMethod?.code?.toLowerCase() === "promptpay" ? (
              <div className="flex flex-col items-center gap-2 my-4">
                {modalQrUrl ? (
                  <>
                    <p className="mb-2 text-gray-700">สแกน QR เพื่อชำระเงิน</p>
                    <Image
                      src={modalQrUrl}
                      alt="PromptPay QR"
                      width={192}
                      height={192}
                      style={{ objectFit: "cover" }}
                    />
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded font-bold mt-4"
                      onClick={() => {
                        closePaymentModal({ keepOrder: true });
                        router.push("/orders");
                      }}
                    >
                      เสร็จสิ้น
                    </button>
                  </>
                ) : (
                  <div className="text-gray-500 py-8">
                    กำลังสร้าง QR Code...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 py-8 text-center">
                กรุณาเลือกวิธีชำระเงิน
              </div>
            )}
            <button
              className="bg-gray-300 px-4 py-2 rounded w-full mt-2"
              onClick={() => closePaymentModal()}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
