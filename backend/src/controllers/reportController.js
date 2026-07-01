import { reportService } from "../services/reportService.js";
import { catchAsync } from "../utils/catchAsync.js";

// Generate sales report
const generateSalesReport = catchAsync(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const report = await reportService.generateSalesReport({
    startDate,
    endDate,
    groupBy,
  });
  res.json(report);
});

// Generate inventory report
const generateInventoryReport = catchAsync(async (req, res) => {
  const { location, category, lowStock } = req.query;
  const report = await reportService.generateInventoryReport({
    location,
    category,
    lowStock: lowStock === "true",
  });
  res.json(report);
});

// Generate customer report
const generateCustomerReport = catchAsync(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const report = await reportService.generateCustomerReport({
    startDate,
    endDate,
    groupBy,
  });
  res.json(report);
});

// Generate supplier report
const generateSupplierReport = catchAsync(async (req, res) => {
  const { startDate, endDate, groupBy } = req.query;
  const report = await reportService.generateSupplierReport({
    startDate,
    endDate,
    groupBy,
  });
  res.json(report);
});

export const reportController = {
  generateSalesReport,
  generateInventoryReport,
  generateCustomerReport,
  generateSupplierReport,
};
