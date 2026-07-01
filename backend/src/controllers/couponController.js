import { couponService } from "../services/couponService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const couponController = {
  validateCoupon: catchAsync(async (req, res) => {
    const { code, amount } = req.query;
    const result = await couponService.validateCoupon(code, amount);
    res.json(result);
  }),

  getAvailableCoupons: catchAsync(async (req, res) => {
    const coupons = await couponService.getAvailableCoupons();
    res.json(coupons);
  }),

  getCoupons: catchAsync(async (req, res) => {
    const coupons = await couponService.getCoupons();
    res.json(coupons);
  }),

  getCouponById: catchAsync(async (req, res) => {
    const coupon = await couponService.getCouponById(req.params.id);
    res.json(coupon);
  }),

  createCoupon: catchAsync(async (req, res) => {
    const coupon = await couponService.createCoupon(req.body);
    res.status(201).json(coupon);
  }),

  updateCoupon: catchAsync(async (req, res) => {
    const coupon = await couponService.updateCoupon(req.params.id, req.body);
    res.json(coupon);
  }),

  deleteCoupon: catchAsync(async (req, res) => {
    await couponService.deleteCoupon(req.params.id);
    res.status(204).send();
  }),

  activateCoupon: catchAsync(async (req, res) => {
    const coupon = await couponService.activateCoupon(req.params.id);
    res.json(coupon);
  }),

  deactivateCoupon: catchAsync(async (req, res) => {
    const coupon = await couponService.deactivateCoupon(req.params.id);
    res.json(coupon);
  }),

  getCouponStatistics: catchAsync(async (req, res) => {
    const stats = await couponService.getCouponStatistics(req.query);
    res.json(stats);
  }),

  getCouponUsage: catchAsync(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const usage = await couponService.getCouponUsage(req.params.id, {
      page,
      limit,
    });
    res.json(usage);
  }),
};
