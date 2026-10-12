import { reportService } from "../services/reportService.js";

export const reportController = {
  async generateSalesReport(req, res) {
    res.json(await reportService.generateSalesReport(req.query));
  },

  async generateOrdersReport(req, res) {
    res.json(await reportService.generateOrdersReport(req.query));
  },

  async generateInventoryReport(req, res) {
    res.json(await reportService.generateInventoryReport(req.query));
  },

  async generateCustomerReport(req, res) {
    res.json(await reportService.generateCustomerReport(req.query));
  },

  async generateSupplierReport(req, res) {
    res.json(await reportService.generateSupplierReport(req.query));
  },
};
