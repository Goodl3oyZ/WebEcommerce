import { db } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

// Validate coupon code
const validateCoupon = async (req, res, next) => {
  try {
    const { code, amount } = req.query;
    if (!code || !amount) {
      throw new ApiError(400, "Coupon code and amount are required");
    }

    const [coupon] = await db.query(
      `SELECT * FROM coupons 
       WHERE code = ? 
       AND is_active = true 
       AND start_date <= NOW() 
       AND (end_date IS NULL OR end_date >= NOW())
       AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      [code]
    );

    if (!coupon) {
      throw new ApiError(400, "Invalid or expired coupon");
    }

    if (amount < coupon.min_purchase) {
      throw new ApiError(
        400,
        `Minimum purchase amount is ${coupon.min_purchase}`
      );
    }

    const discount =
      coupon.type === "percentage"
        ? Math.min(amount * (coupon.value / 100), coupon.max_discount)
        : coupon.value;

    res.json({
      valid: true,
      discount,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minPurchase: coupon.min_purchase,
        maxDiscount: coupon.max_discount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get available coupons
const getAvailableCoupons = async (req, res, next) => {
  try {
    const [coupons] = await db.query(
      `SELECT * FROM coupons 
       WHERE is_active = true 
       AND start_date <= NOW() 
       AND (end_date IS NULL OR end_date >= NOW())
       AND (usage_limit IS NULL OR usage_count < usage_limit)`
    );

    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

// Create new coupon (admin only)
const createCoupon = async (req, res, next) => {
  try {
    const {
      code,
      type,
      value,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      userLimit,
      isActive,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO coupons (
        code, type, value, min_purchase, max_discount,
        start_date, end_date, usage_limit, user_limit, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        type,
        value,
        minPurchase,
        maxDiscount,
        startDate,
        endDate,
        usageLimit,
        userLimit,
        isActive,
      ]
    );

    const [coupon] = await db.query("SELECT * FROM coupons WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

// Update coupon (admin only)
const updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      type,
      value,
      minPurchase,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      userLimit,
      isActive,
    } = req.body;

    await db.query(
      `UPDATE coupons SET
        type = ?,
        value = ?,
        min_purchase = ?,
        max_discount = ?,
        start_date = ?,
        end_date = ?,
        usage_limit = ?,
        user_limit = ?,
        is_active = ?
      WHERE id = ?`,
      [
        type,
        value,
        minPurchase,
        maxDiscount,
        startDate,
        endDate,
        usageLimit,
        userLimit,
        isActive,
        id,
      ]
    );

    const [coupon] = await db.query("SELECT * FROM coupons WHERE id = ?", [id]);

    if (!coupon) {
      throw new ApiError(404, "Coupon not found");
    }

    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

// Delete coupon (admin only)
const deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM coupons WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Coupon not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Activate coupon (admin only)
const activateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE coupons SET is_active = true WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Coupon not found");
    }

    const [coupon] = await db.query("SELECT * FROM coupons WHERE id = ?", [id]);

    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

// Deactivate coupon (admin only)
const deactivateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "UPDATE coupons SET is_active = false WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Coupon not found");
    }

    const [coupon] = await db.query("SELECT * FROM coupons WHERE id = ?", [id]);

    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

// Get coupon statistics (admin only)
const getCouponStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const [stats] = await db.query(
      `SELECT 
        COUNT(*) as totalCoupons,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as activeCoupons
      FROM coupons
      WHERE (? IS NULL OR created_at >= ?)
      AND (? IS NULL OR created_at <= ?)`,
      [startDate, startDate, endDate, endDate]
    );
    const [coupons] = await db.query("SELECT * FROM coupons");
    res.json({
      ...stats[0],
      coupons,
    });
  } catch (error) {
    next(error);
  }
};

// Get coupon usage history (admin only)
const getCouponUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [usage] = await db.query(
      `SELECT 
        cu.*,
        u.email as user_email,
        o.id as order_id
      FROM coupon_usage cu
      JOIN users u ON cu.user_id = u.id
      JOIN orders o ON cu.order_id = o.id
      WHERE cu.coupon_id = ?
      ORDER BY cu.used_at DESC
      LIMIT ? OFFSET ?`,
      [id, parseInt(limit), offset]
    );

    const [total] = await db.query(
      "SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ?",
      [id]
    );

    res.json({
      items: usage,
      total: total[0].count,
      page: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
};

export const couponController = {
  validateCoupon,
  getAvailableCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  activateCoupon,
  deactivateCoupon,
  getCouponStatistics,
  getCouponUsage,
};
