import { couponService } from "../services/couponService.js";
import { parsePagination } from "../utils/pagination.js";

export const couponController = {
  async validateCoupon(req, res) {
    const { code, amount } = req.query;
    res.json(await couponService.validateCoupon(code, amount, req.user.id));
  },

  async getAvailableCoupons(req, res) {
    res.json(await couponService.getAvailableCoupons());
  },

  async getCoupons(req, res) {
    res.json(await couponService.getCoupons({ search: req.query.search }));
  },

  async getCouponById(req, res) {
    res.json(await couponService.getCouponById(req.params.id));
  },

  async createCoupon(req, res) {
    res.status(201).json(await couponService.createCoupon(req.body));
  },

  async updateCoupon(req, res) {
    res.json(await couponService.updateCoupon(req.params.id, req.body));
  },

  async deleteCoupon(req, res) {
    const coupon = await couponService.deleteCoupon(req.params.id);
    res.json({
      success: true,
      data: coupon,
      message:
        coupon.usageCount > 0
          ? "คูปองเคยถูกใช้แล้ว จึงปิดการใช้งานแทนการลบ"
          : "ปิดการใช้งานคูปองแล้ว",
    });
  },

  async activateCoupon(req, res) {
    res.json(await couponService.setActive(req.params.id, true));
  },

  async deactivateCoupon(req, res) {
    res.json(await couponService.setActive(req.params.id, false));
  },

  async getCouponStatistics(req, res) {
    res.json(await couponService.getCouponStatistics());
  },

  async getCouponUsage(req, res) {
    res.json(await couponService.getCouponUsage(req.params.id, parsePagination(req.query)));
  },
};
