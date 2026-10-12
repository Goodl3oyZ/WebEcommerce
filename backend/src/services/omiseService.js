//  called from payment controller
import { ENV } from "../config/loadENV.js";
import { ApiError } from "../utils/ApiError.js";
import Omise from "omise";

// Initialize Omise client (only when configured).
const omiseClient = ENV.OMISE_SECRET_KEY
  ? Omise({
      secretKey: ENV.OMISE_SECRET_KEY,
      publicKey: ENV.OMISE_PUBLIC_KEY,
      omiseVersion: "2019-05-29",
    })
  : null;

/** The configured client, or a clear 503 instead of Omise's "authentication failure". */
const omise = new Proxy(
  {},
  {
    get(_target, resource) {
      if (!omiseClient) {
        throw new ApiError(
          503,
          "Online payment is not configured: set OMISE_SECRET_KEY and OMISE_PUBLIC_KEY",
          null,
          "PAYMENT_NOT_CONFIGURED"
        );
      }
      return omiseClient[resource];
    },
  }
);

export const omiseService = {
  // Create charge
  async createCharge({
    amount,
    currency,
    description,
    metadata,
    source,
    card,
  }) {
    try {
      const charge = await omise.charges.create({
        amount,
        currency,
        description,
        metadata,
        ...(source ? { source } : {}),
        ...(card ? { card } : {}),
      });

      return charge;
    } catch (error) {
      console.error("Omise charge error:", error);
      throw new ApiError(
        error.message || "Failed to process payment",
        error.status || 500
      );
    }
  },

  // Create refund
  async createRefund(chargeId, amount) {
    try {
      const refund = await omise.charges.createRefund(chargeId, {
        amount,
      });

      return refund;
    } catch (error) {
      console.error("Omise refund error:", error);
      throw new ApiError(
        error.message || "Failed to process refund",
        error.status || 500
      );
    }
  },

  // Get charge details
  async getCharge(chargeId) {
    try {
      const charge = await omise.charges.retrieve(chargeId);
      return charge;
    } catch (error) {
      console.error("Omise get charge error:", error);
      throw new ApiError(
        error.message || "Failed to get charge details",
        error.status || 500
      );
    }
  },

  // Create source (for credit card)
  async createSource({ type, amount, currency, token }) {
    try {
      const omiseType = type === "credit_card" ? "card" : type;
      const source = await omise.sources.create({
        type: omiseType,
        amount,
        currency,
        token,
      });

      return source;
    } catch (error) {
      console.error("Omise create source error:", error);
      throw new ApiError(
        error.message || "Failed to create payment source",
        error.status || 500
      );
    }
  },

  // Create token (for credit card)
  async createToken(card) {
    try {
      const token = await omise.tokens.create({
        card: {
          name: card.name,
          number: card.number,
          expiration_month: card.expiration_month,
          expiration_year: card.expiration_year,
          security_code: card.security_code,
        },
      });

      return token;
    } catch (error) {
      console.error("Omise create token error:", error);
      throw new ApiError(
        error.message || "Failed to create payment token",
        error.status || 500
      );
    }
  },

  // TODO: รองรับการ handle webhook/callback จาก Omise ในอนาคต
  // TODO: รองรับการบันทึก log การจ่ายเงิน/คืนเงิน เพิ่มเติม
};
