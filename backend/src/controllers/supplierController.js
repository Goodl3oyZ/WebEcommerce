import { supplierService } from "../services/supplierService.js";
import { catchAsync } from "../utils/catchAsync.js";
import { AppError } from "../utils/appError.js";

// Get all suppliers
const getAllSuppliers = catchAsync(async (req, res) => {
  const suppliers = await supplierService.getAllSuppliers();
  res.json(suppliers);
});

// Get supplier by ID
const getSupplierById = catchAsync(async (req, res) => {
  const supplier = await supplierService.getSupplierById(req.params.id);
  res.json(supplier);
});

// Create new supplier
const createSupplier = catchAsync(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.body);
  res.status(201).json(supplier);
});

// Update supplier
const updateSupplier = catchAsync(async (req, res) => {
  const supplier = await supplierService.updateSupplier(
    req.params.id,
    req.body
  );
  res.json(supplier);
});

// Delete supplier
const deleteSupplier = catchAsync(async (req, res) => {
  await supplierService.deleteSupplier(req.params.id);
  res.json({ message: "Supplier deleted successfully" });
});

// Get supplier products
const getSupplierProducts = catchAsync(async (req, res) => {
  const products = await supplierService.getSupplierProducts(req.params.id);
  res.json(products);
});

// Add supplier product
const addSupplierProduct = catchAsync(async (req, res) => {
  const product = await supplierService.addSupplierProduct(
    req.params.id,
    req.body
  );
  res.status(201).json(product);
});

// Update supplier product
const updateSupplierProduct = catchAsync(async (req, res) => {
  const product = await supplierService.updateSupplierProduct(
    req.params.id,
    req.params.productId,
    req.body
  );
  res.json(product);
});

// Remove supplier product
const removeSupplierProduct = catchAsync(async (req, res) => {
  await supplierService.removeSupplierProduct(
    req.params.id,
    req.params.productId
  );
  res.json({ message: "Product removed from supplier" });
});

export const supplierController = {
  getAllSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierProducts,
  addSupplierProduct,
  updateSupplierProduct,
  removeSupplierProduct,
};
