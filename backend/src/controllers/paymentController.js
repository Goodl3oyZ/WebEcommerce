import { paymentService } from "../services/paymentService.js";
import { omiseService } from "../services/omiseService.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "express-async-handler";

export const paymentController = {
  createPayment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { orderId, method, amount, currency, cardToken, paymentDetails } =
      req.body;
    const token = cardToken || (paymentDetails && paymentDetails.token);
    const payment = await paymentService.createPayment(
      userId,
      orderId,
      method,
      paymentDetails,
      amount,
      currency
    );

    const amountInt = Math.round(Number(amount) * 100);

    let charge;
    if (method === "credit_card") {
      if (!token) throw new ApiError("Missing card token", 400);
      charge = await omiseService.createCharge({
        amount: amountInt,
        currency,
        card: token,
        description: `Payment for order ${orderId}`,
        metadata: {
          orderId,
          paymentId: payment.id,
        },
      });
    } else if (method === "promptpay") {
      const source = await omiseService.createSource({
        type: "promptpay",
        amount: amountInt,
        currency,
      });
      console.log("Omise source object:", source);
      if (!source || !source.id) {
        throw new ApiError("Omise source creation failed", 500);
      }
      charge = await omiseService.createCharge({
        amount: amountInt,
        currency,
        description: `Payment for order ${orderId}`,
        metadata: {
          orderId,
          paymentId: payment.id,
        },
        source: source.id,
      });
    }

    await paymentService.updatePayment(payment.id, {
      transactionId: charge?.id,
      status: charge?.status,
    });

    res.status(201).json({
      success: true,
      data: {
        payment,
        charge,
      },
    });
  }),

  getPayment: asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await paymentService.getPayment(paymentId, userId);
    if (!payment) {
      throw new ApiError("Payment not found", 404);
    }

    const charge = await omiseService.getCharge(payment.chargeId);

    res.status(200).json({
      success: true,
      data: {
        payment,
        charge,
      },
    });
  }),

  processRefund: asyncHandler(async (req, res) => {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;
    const userId = req.user.id;

    const payment = await paymentService.getPayment(paymentId, userId);
    if (!payment) {
      throw new ApiError("Payment not found", 404);
    }

    const refund = await omiseService.createRefund(payment.chargeId, amount);

    await paymentService.createRefund({
      paymentId,
      amount,
      reason,
      refundId: refund.id,
    });

    res.status(200).json({
      success: true,
      data: {
        refund,
      },
    });
  }),

  createToken: asyncHandler(async (req, res) => {
    const { card } = req.body;

    const token = await omiseService.createToken(card);

    res.status(201).json({
      success: true,
      data: {
        token,
      },
    });
  }),

  getPaymentById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const payment = await paymentService.getPaymentById(userId, id);
    res.json(payment);
  }),

  getOrderPayments: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { orderId } = req.params;
    const payments = await paymentService.getOrderPayments(userId, orderId);
    res.json(payments);
  }),

  updatePaymentStatus: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { status, transactionId } = req.body;
    const payment = await paymentService.updatePaymentStatus(
      userId,
      id,
      status,
      transactionId
    );
    res.json(payment);
  }),

  refundPayment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, reason } = req.body;
    const refund = await paymentService.refundPayment(
      userId,
      id,
      amount,
      reason
    );
    res.json(refund);
  }),

  getPaymentMethods: asyncHandler(async (req, res) => {
    const methods = await paymentService.getPaymentMethods();
    res.json(methods);
  }),

  validatePaymentMethod: asyncHandler(async (req, res) => {
    const { paymentMethod, paymentDetails } = req.body;
    const validation = await paymentService.validatePaymentMethod(
      paymentMethod,
      paymentDetails
    );
    res.json(validation);
  }),

  getPaymentHistory: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const history = await paymentService.getPaymentHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json(history);
  }),

  getPaymentStatus: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const status = await paymentService.getPaymentStatus(userId, id);
    res.json(status);
  }),

  verifyPayment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { verificationCode } = req.body;
    const result = await paymentService.verifyPayment(
      userId,
      id,
      verificationCode
    );
    res.json(result);
  }),

  addPaymentMethod: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type, provider, details } = req.body;
    const method = await paymentService.addPaymentMethod(
      userId,
      type,
      provider,
      details
    );
    res.status(201).json(method);
  }),

  updatePaymentMethod: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { methodId } = req.params;
    const { details } = req.body;
    const method = await paymentService.updatePaymentMethod(
      userId,
      methodId,
      details
    );
    res.json(method);
  }),

  removePaymentMethod: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { methodId } = req.params;
    await paymentService.removePaymentMethod(userId, methodId);
    res.status(204).send();
  }),

  getAllTransactions: asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const transactions = await paymentService.getAllTransactions({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate,
      endDate,
    });
    res.json(transactions);
  }),

  getPaymentStatistics: asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const statistics = await paymentService.getPaymentStatistics(
      startDate,
      endDate
    );
    res.json(statistics);
  }),

  getStorePayments: asyncHandler(async (req, res) => {
    const { storeId } = req.params;
    const { status, startDate, endDate } = req.query;
    const payments = await paymentService.getStorePayments(storeId, {
      status,
      startDate,
      endDate,
    });
    res.json(payments);
  }),

  getPaymentStats: asyncHandler(async (req, res) => {
    const { storeId, startDate, endDate } = req.query;
    const stats = await paymentService.getPaymentStats({
      storeId,
      startDate,
      endDate,
    });
    res.json(stats);
  }),

  handleOmiseWebhook: async (req, res) => {
    try {
      const event = req.body;
      if (event.object === "event" && event.key && event.data) {
        const charge = event.data;
        const chargeId = charge.id;
        const orderId = charge.metadata?.orderId;
        const paymentId = charge.metadata?.paymentId;

        if (charge.status === "successful") {
          await paymentService.updatePaymentByChargeId(chargeId, {
            status: "completed",
            transactionId: chargeId,
          });
          if (orderId) {
            await (
              await import("../services/orderService.js")
            ).orderService.updateOrderStatus(orderId, { status: "paid" });
          }
        } else if (charge.status === "failed" || charge.status === "expired") {
          await paymentService.updatePaymentByChargeId(chargeId, {
            status: "failed",
            transactionId: chargeId,
          });
          if (orderId) {
            await (
              await import("../services/orderService.js")
            ).orderService.updateOrderStatus(orderId, { status: "cancelled" });
          }
        }
        res.status(200).json({ received: true });
      } else {
        res.status(400).json({ error: "Invalid event" });
      }
    } catch (err) {
      console.error("Omise webhook error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
