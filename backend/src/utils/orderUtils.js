// Utility functions for order management

// Generate a unique order number (e.g. ORD20240601-XXXX)
export function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `ORD${datePart}-${randomPart}`;
}

// Calculate total price from order items
export function calculateOrderTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Check if order status is valid
export function isValidOrderStatus(status) {
  const validStatuses = [
    "pending",
    "paid",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];
  return validStatuses.includes(status);
}

// Format order date
export function formatOrderDate(date) {
  return new Date(date).toLocaleString();
}
