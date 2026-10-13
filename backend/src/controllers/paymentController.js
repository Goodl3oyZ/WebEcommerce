import { paymentService, chargeForClient } from "../services/paymentService.js";
import { parsePagination } from "../utils/pagination.js";
import { isAdminRole } from "../utils/roles.js";
import { ApiError } from "../utils/ApiError.js";

export const paymentController = {
  /** Pay or retry paying an order (amount is always the order total). */
  async createPayment(req, res) {
    const { orderId, method, cardToken, paymentDetails } = req.body;
    const token = cardToken || paymentDetails?.token || paymentDetails?.cardToken;
    if (method === "promptpay") {
      const open = await paymentService.findOpenPromptPay(req.user.id, orderId);
      if (open) {
        return res.status(200).json({
          success: true,
          data: {
            payment: open,
            charge: { id: open.transactionId, status: "pending", qrCodeUrl: open.paymentDetails.qrCodeUrl },
          },
        });
      }
    }
    const payment = await paymentService.createPayment(req.user.id, orderId, method);
    const result = await paymentService.chargePayment(payment, {
      method,
      cardToken: token,
      description: `Payment for order ${orderId}`,
    });

    if (result.charge?.status === "failed") {
      throw new ApiError(
        `Payment declined: ${result.charge.failure_message ?? "card declined"}`,
        402,
        null,
        "PAYMENT_DECLINED"
      );
    }
    res.status(201).json({
      success: true,
      data: {
        payment: result.payment,
        charge: chargeForClient(result.charge),
      },
    });
  },

  async getPaymentById(req, res) {
    const payment = isAdminRole(req.user.role)
      ? await paymentService.getTransactionById(req.params.id)
      : await paymentService.getPaymentById(req.user.id, req.params.id);
    res.json(payment);
  },

  async getOrderPayments(req, res) {
    res.json(
      await paymentService.getOrderPayments(req.user.id, req.params.orderId, {
        isAdmin: isAdminRole(req.user.role),
      })
    );
  },

  async getPaymentStatus(req, res) {
    res.json(await paymentService.getPaymentStatus(req.user.id, req.params.id));
  },

  /** Re-check with Omise, for when a webhook did not arrive. */
  async verifyPayment(req, res) {
    res.json(await paymentService.getPaymentStatus(req.user.id, req.params.id));
  },

  async getPaymentMethods(req, res) {
    res.json(await paymentService.getPaymentMethods());
  },

  async getPaymentHistory(req, res) {
    res.json(await paymentService.getPaymentHistory(req.user.id, parsePagination(req.query)));
  },

  // --- Admin ---------------------------------------------------------------
  async updatePaymentStatus(req, res) {
    const { status, transactionId } = req.body;
    res.json(await paymentService.updatePaymentStatus(req.user.id, req.params.id, status, transactionId));
  },

  async processRefund(req, res) {
    const { amount, reason } = req.body;
    const refund = await paymentService.refundPayment(req.user.id, req.params.id, amount, reason);
    res.status(200).json({ success: true, data: refund, message: "คืนเงินสำเร็จ" });
  },

  async getAllTransactions(req, res) {
    const { status, startDate, endDate } = req.query;
    res.json(
      await paymentService.getAllTransactions({ status, startDate, endDate }, parsePagination(req.query))
    );
  },

  async getPaymentStatistics(req, res) {
    const { startDate, endDate, storeId } = req.query;
    res.json(await paymentService.getPaymentStatistics({ startDate, endDate, storeId }));
  },

  async getStorePayments(req, res) {
    const { status, startDate, endDate } = req.query;
    res.json(await paymentService.getStorePayments(req.params.storeId, { status, startDate, endDate }));
  },

  /** Omise webhook: always 200 for well-formed events so Omise does not retry forever. */
  async handleOmiseWebhook(req, res) {
    const result = await paymentService.handleWebhook(req.body);
    res.status(200).json({ received: true, ...result });
  },
};
