import { loyaltyService } from "../services/loyaltyService.js";
import { parsePagination } from "../utils/pagination.js";

export const loyaltyController = {
  async getLoyaltyPoints(req, res) {
    res.json(await loyaltyService.getLoyaltyPoints(req.user.id));
  },

  async getPointsHistory(req, res) {
    res.json(await loyaltyService.getPointsHistory(req.user.id, parsePagination(req.query)));
  },

  async getAvailableRewards(req, res) {
    res.json(loyaltyService.getAvailableRewards());
  },

  async redeemReward(req, res) {
    res.status(201).json(await loyaltyService.redeemReward(req.user.id, req.params.id));
  },

  // --- Admin ---------------------------------------------------------------
  async getLoyaltyStatistics(req, res) {
    res.json(await loyaltyService.getLoyaltyStatistics(req.query));
  },

  async getLoyaltyTiers(req, res) {
    res.json(loyaltyService.getLoyaltyTiers());
  },

  createLoyaltyTier() {
    loyaltyService.createLoyaltyTier();
  },
  updateLoyaltyTier() {
    loyaltyService.updateLoyaltyTier();
  },
  createReward() {
    loyaltyService.createReward();
  },
  updateReward() {
    loyaltyService.updateReward();
  },
  deleteReward() {
    loyaltyService.deleteReward();
  },
};
