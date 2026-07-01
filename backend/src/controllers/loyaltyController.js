import { loyaltyService } from "../services/loyaltyService.js";
import { catchAsync } from "../utils/catchAsync.js";

export const loyaltyController = {
  getLoyaltyPoints: catchAsync(async (req, res) => {
    const points = await loyaltyService.getLoyaltyPoints(req.user.id);
    res.json(points);
  }),

  getPointsHistory: catchAsync(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const history = await loyaltyService.getPointsHistory(req.user.id, {
      page,
      limit,
    });
    res.json(history);
  }),

  getAvailableRewards: catchAsync(async (req, res) => {
    const rewards = loyaltyService.getAvailableRewards();
    res.json(rewards);
  }),

  redeemReward: catchAsync(async (req, res) => {
    const result = await loyaltyService.redeemReward(
      req.user.id,
      req.params.id
    );
    res.json(result);
  }),

  createReward: catchAsync(async (req, res) => {
    const reward = await loyaltyService.createReward(req.body);
    res.status(201).json(reward);
  }),

  updateReward: catchAsync(async (req, res) => {
    const reward = await loyaltyService.updateReward(req.params.id, req.body);
    res.json(reward);
  }),

  deleteReward: catchAsync(async (req, res) => {
    await loyaltyService.deleteReward(req.params.id);
    res.status(204).send();
  }),

  getLoyaltyTiers: catchAsync(async (req, res) => {
    const tiers = loyaltyService.getLoyaltyTiers();
    res.json(tiers);
  }),

  createLoyaltyTier: catchAsync(async (req, res) => {
    const tier = await loyaltyService.createLoyaltyTier(req.body);
    res.status(201).json(tier);
  }),

  updateLoyaltyTier: catchAsync(async (req, res) => {
    const tier = await loyaltyService.updateLoyaltyTier(
      req.params.id,
      req.body
    );
    res.json(tier);
  }),

  getLoyaltyStatistics: catchAsync(async (req, res) => {
    const stats = await loyaltyService.getLoyaltyStatistics(req.query);
    res.json(stats);
  }),
};
