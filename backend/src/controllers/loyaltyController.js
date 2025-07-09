import { db } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

// Get user's loyalty points
const getLoyaltyPoints = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [points] = await db.query(
      `SELECT 
        points,
        tier,
        (SELECT name FROM loyalty_tiers WHERE min_points <= points ORDER BY min_points DESC LIMIT 1) as tier_name
      FROM user_loyalty
      WHERE user_id = ?`,
      [userId]
    );

    if (!points) {
      throw new ApiError(404, "Loyalty account not found");
    }

    res.json(points[0]);
  } catch (error) {
    next(error);
  }
};

// Get points history
const getPointsHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [history] = await db.query(
      `SELECT 
        ph.*,
        o.id as order_id,
        o.total
      FROM points_history ph
      LEFT JOIN orders o ON ph.order_id = o.id
      WHERE ph.user_id = ?
      ORDER BY ph.created_at DESC
      LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), offset]
    );

    const [total] = await db.query(
      "SELECT COUNT(*) as count FROM points_history WHERE user_id = ?",
      [userId]
    );

    res.json({
      items: history,
      total: total[0].count,
      page: parseInt(page),
    });
  } catch (error) {
    next(error);
  }
};

// Get available rewards
const getAvailableRewards = async (req, res, next) => {
  try {
    const [rewards] = await db.query(
      `SELECT * FROM loyalty_rewards
       WHERE is_active = true
       AND start_date <= NOW()
       AND (end_date IS NULL OR end_date >= NOW())
       AND (max_redemptions IS NULL OR redemption_count < max_redemptions)`
    );

    res.json(rewards);
  } catch (error) {
    next(error);
  }
};

// Redeem reward
const redeemReward = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Start transaction
    await db.beginTransaction();

    try {
      // Get user's points
      const [userPoints] = await db.query(
        "SELECT points FROM user_loyalty WHERE user_id = ?",
        [userId]
      );

      // Get reward details
      const [reward] = await db.query(
        "SELECT * FROM loyalty_rewards WHERE id = ? AND is_active = true",
        [id]
      );

      if (!reward) {
        throw new ApiError(404, "Reward not found or inactive");
      }

      if (userPoints[0].points < reward.points_cost) {
        throw new ApiError(400, "Insufficient points");
      }

      // Check user's redemption limit
      const [userRedemptions] = await db.query(
        "SELECT COUNT(*) as count FROM reward_redemptions WHERE user_id = ? AND reward_id = ?",
        [userId, id]
      );

      if (userRedemptions[0].count >= reward.user_limit) {
        throw new ApiError(400, "User redemption limit reached");
      }

      // Deduct points
      await db.query(
        "UPDATE user_loyalty SET points = points - ? WHERE user_id = ?",
        [reward.points_cost, userId]
      );

      // Record redemption
      const [redemption] = await db.query(
        `INSERT INTO reward_redemptions (
          user_id, reward_id, points_cost, redemption_code
        ) VALUES (?, ?, ?, ?)`,
        [userId, id, reward.points_cost, generateRedemptionCode()]
      );

      // Update reward redemption count
      await db.query(
        "UPDATE loyalty_rewards SET redemption_count = redemption_count + 1 WHERE id = ?",
        [id]
      );

      // Add points history entry
      await db.query(
        `INSERT INTO points_history (
          user_id, points, type, description, order_id
        ) VALUES (?, ?, 'debit', ?, NULL)`,
        [userId, -reward.points_cost, `Redeemed reward: ${reward.name}`]
      );

      await db.commit();

      res.json({
        redemptionId: redemption.insertId,
        pointsDeducted: reward.points_cost,
        remainingPoints: userPoints[0].points - reward.points_cost,
      });
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

// Admin: Create new reward
const createReward = async (req, res, next) => {
  try {
    const {
      name,
      description,
      pointsCost,
      type,
      value,
      maxRedemptions,
      userLimit,
      startDate,
      endDate,
      isActive,
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO loyalty_rewards (
        name, description, points_cost, type, value,
        max_redemptions, user_limit, start_date, end_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        pointsCost,
        type,
        value,
        maxRedemptions,
        userLimit,
        startDate,
        endDate,
        isActive,
      ]
    );

    const [reward] = await db.query(
      "SELECT * FROM loyalty_rewards WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json(reward[0]);
  } catch (error) {
    next(error);
  }
};

// Admin: Update reward
const updateReward = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      pointsCost,
      type,
      value,
      maxRedemptions,
      userLimit,
      startDate,
      endDate,
      isActive,
    } = req.body;

    await db.query(
      `UPDATE loyalty_rewards SET
        name = ?,
        description = ?,
        points_cost = ?,
        type = ?,
        value = ?,
        max_redemptions = ?,
        user_limit = ?,
        start_date = ?,
        end_date = ?,
        is_active = ?
      WHERE id = ?`,
      [
        name,
        description,
        pointsCost,
        type,
        value,
        maxRedemptions,
        userLimit,
        startDate,
        endDate,
        isActive,
        id,
      ]
    );

    const [reward] = await db.query(
      "SELECT * FROM loyalty_rewards WHERE id = ?",
      [id]
    );

    if (!reward[0]) {
      throw new ApiError(404, "Reward not found");
    }

    res.json(reward[0]);
  } catch (error) {
    next(error);
  }
};

// Admin: Delete reward
const deleteReward = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM loyalty_rewards WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      throw new ApiError(404, "Reward not found");
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Admin: Get all loyalty tiers
const getLoyaltyTiers = async (req, res, next) => {
  try {
    const [tiers] = await db.query(
      "SELECT * FROM loyalty_tiers ORDER BY min_points ASC"
    );

    res.json(tiers);
  } catch (error) {
    next(error);
  }
};

// Admin: Create loyalty tier
const createLoyaltyTier = async (req, res, next) => {
  try {
    const { name, minPoints, benefits, multiplier } = req.body;

    const [result] = await db.query(
      `INSERT INTO loyalty_tiers (
        name, min_points, benefits, multiplier
      ) VALUES (?, ?, ?, ?)`,
      [name, minPoints, JSON.stringify(benefits), multiplier]
    );

    const [tier] = await db.query("SELECT * FROM loyalty_tiers WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json(tier[0]);
  } catch (error) {
    next(error);
  }
};

// Admin: Update loyalty tier
const updateLoyaltyTier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, minPoints, benefits, multiplier } = req.body;

    await db.query(
      `UPDATE loyalty_tiers SET
        name = ?,
        min_points = ?,
        benefits = ?,
        multiplier = ?
      WHERE id = ?`,
      [name, minPoints, JSON.stringify(benefits), multiplier, id]
    );

    const [tier] = await db.query("SELECT * FROM loyalty_tiers WHERE id = ?", [
      id,
    ]);

    if (!tier[0]) {
      throw new ApiError(404, "Tier not found");
    }

    res.json(tier[0]);
  } catch (error) {
    next(error);
  }
};

// Admin: Get loyalty statistics
const getLoyaltyStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const [stats] = await db.query(
      `SELECT 
        SUM(points) as totalPoints,
        COUNT(DISTINCT user_id) as activeUsers,
        COUNT(DISTINCT CASE WHEN type = 'credit' THEN id END) as totalEarnings,
        COUNT(DISTINCT CASE WHEN type = 'debit' THEN id END) as totalRedemptions,
        (
          SELECT JSON_OBJECTAGG(tier, count)
          FROM (
            SELECT 
              (SELECT name FROM loyalty_tiers WHERE min_points <= points ORDER BY min_points DESC LIMIT 1) as tier,
              COUNT(*) as count
            FROM user_loyalty
            GROUP BY tier
          ) as tier_counts
        ) as tierDistribution
      FROM points_history ph
      WHERE (? IS NULL OR ph.created_at >= ?)
      AND (? IS NULL OR ph.created_at <= ?)`,
      [startDate, startDate, endDate, endDate]
    );

    res.json(stats[0]);
  } catch (error) {
    next(error);
  }
};

// Helper function for generating redemption codes
function generateRedemptionCode() {
  return Math.random().toString(36).substring(2, 15).toUpperCase();
}

export const loyaltyController = {
  getLoyaltyPoints,
  getPointsHistory,
  getAvailableRewards,
  redeemReward,
  createReward,
  updateReward,
  deleteReward,
  getLoyaltyTiers,
  createLoyaltyTier,
  updateLoyaltyTier,
  getLoyaltyStatistics,
  generateRedemptionCode,
};
