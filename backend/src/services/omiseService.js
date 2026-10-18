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
    returnUri,
  }) {
    try {
      const charge = await omise.charges.create({
        amount,
        currency,
        description,
        metadata,
        ...(source ? { source } : {}),
        ...(card ? { card } : {}),
        // Where the bank's 3-D Secure page sends the customer back to.
        ...(returnUri ? { return_uri: returnUri } : {}),
      });

      return charge;
    } catch (error) {
      if (error instanceof ApiError) throw error; // e.g. not configured
      console.error("Omise charge error:", error?.code || error?.message);
      // Omise answered (declined, invalid card, auth): definite failure.
      if (error?.object === "error") {
        throw new ApiError(402, error.message || "Payment was rejected", null, "PAYMENT_REJECTED");
      }
      // No answer (network/timeout): the charge may or may not exist.
      throw new ApiError(502, "The payment provider did not respond", null, "PAYMENT_UNCERTAIN");
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

  /**
   * Find the charge created for an order when its id was never received
   * (e.g. the create call timed out). Charges carry metadata.orderId.
   */
  async findChargeForOrder(orderId, since) {
    const list = await omise.charges.list({
      from: new Date(new Date(since).getTime() - 60_000).toISOString(),
      order: "reverse_chronological",
      limit: 100,
    });
    return (list?.data ?? []).find((c) => c.metadata?.orderId === orderId) ?? null;
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
};
