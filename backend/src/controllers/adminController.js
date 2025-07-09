import { adminService } from "../services/adminService.js";

export const adminController = {
  // User Management
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const users = await adminService.getAllUsers({ page, limit, search });
      res.json(users);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching users", error: error.message });
    }
  },

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await adminService.getUserById(id);
      res.json(user);
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error fetching user", error: error.message });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await adminService.updateUser(id, updates);
      res.json(user);
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error updating user", error: error.message });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      await adminService.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error deleting user", error: error.message });
    }
  },

  async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = await adminService.updateUserRole(id, role);
      res.json(user);
    } catch (error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid role") {
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error updating user role", error: error.message });
    }
  },

  // Product Management
  async createProduct(req, res) {
    try {
      const productData = req.body;
      const product = await adminService.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error creating product", error: error.message });
    }
  },

  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      const product = await adminService.updateProduct(id, updates);
      res.json(product);
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error updating product", error: error.message });
    }
  },

  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await adminService.deleteProduct(id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      if (error.message === "Product not found") {
        return res.status(404).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error deleting product", error: error.message });
    }
  },

  // Order Management
  async getAllOrders(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const orders = await adminService.getAllOrders({ page, limit, status });
      res.json(orders);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching orders", error: error.message });
    }
  },

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;
      const order = await adminService.updateOrderStatus(id, status, comment);
      res.json(order);
    } catch (error) {
      if (error.message === "Order not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid status") {
        return res.status(400).json({ message: error.message });
      }
      res
        .status(500)
        .json({ message: "Error updating order status", error: error.message });
    }
  },

  // Analytics
  async getOrderStatistics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const statistics = await adminService.getOrderStatistics(
        startDate,
        endDate
      );
      res.json(statistics);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching order statistics",
        error: error.message,
      });
    }
  },

  // Dashboard
  async getDashboard(req, res) {
    try {
      const data = await adminService.getDashboardData();
      res.json(data);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching dashboard", error: error.message });
    }
  },
};
