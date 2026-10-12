import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  decimal,
  uuid,
  jsonb,
  index,
  check,
  primaryKey,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  avatar: text("avatar"),
  phone: varchar("phone", { length: 20 }),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lastPasswordChange: timestamp("last_password_change"),
  lastLoginAt: timestamp("last_login_at"),
  lastLogoutAt: timestamp("last_logout_at"),
  lastActivityAt: timestamp("last_activity_at"),
  points: integer("points").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  provider: varchar("provider", { length: 50 }),
  providerId: varchar("provider_id", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  reviews: many(productReviews),
  addresses: many(addresses),
  orders: many(orders),
  cart: many(carts),
  roles: many(userRoles),
  preferences: many(userPreferences),
  wishlist: many(wishlistItems),
  loyaltyPrograms: many(loyaltyPrograms),
  pointsHistory: many(pointsHistory),
  socialLinks: many(userSocialLinks),
  preferredBrands: many(userPreferredBrands),
  preferredCategories: many(userPreferredCategories),
  statusHistory: many(orderStatusHistory, {
    relationName: "status_changed_by",
  }),
}));

// User Sessions
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  refreshToken: varchar("refresh_token", { length: 500 }).notNull(),
  accessToken: varchar("access_token", { length: 500 }).notNull(),
  deviceInfo: jsonb("device_info"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceId: varchar("device_id", { length: 100 }),
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

// Categories
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
  preferredByUsers: many(userPreferredCategories),
}));

// Brands
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logo: varchar("logo", { length: 500 }),
  website: varchar("website", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
  preferredByUsers: many(userPreferredBrands),
}));

// Products
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    imageUrl: jsonb("image_url"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    brandId: uuid("brand_id").references(() => brands.id, {
      onDelete: "set null",
      onUpdate: "cascade",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    isActive: boolean("is_active").default(true),
  },
  (table) => ({
    nameIdx: index("products_name_idx").on(table.name),
    priceIdx: index("products_price_idx").on(table.price),
    categoryIdx: index("products_category_idx").on(table.categoryId),
    brandIdx: index("products_brand_idx").on(table.brandId),
    createdAtIdx: index("products_created_at_idx").on(table.createdAt),
  })
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  variants: many(productVariants),
  reviews: many(productReviews),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  wishlistItems: many(wishlistItems),
  collections: many(collectionProducts),
  attributes: many(productAttributes),
  inventory: many(storeInventory),
  supplierProducts: many(supplierProducts),
}));

export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  color: varchar("color", { length: 50 }).notNull(),
  size: varchar("size", { length: 10 }).notNull(),
  sku: varchar("sku", { length: 100 }).unique().notNull(),
  stock: integer("stock").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    cartItems: many(cartItems),
    orderItems: many(orderItems),
    wishlistItems: many(wishlistItems),
    inventory: many(storeInventory),
  })
);

// Product Reviews
export const productReviews = pgTable(
  "product_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    ratingCheck: check(
      "product_reviews_rating_check",
      sql`${table.rating} >= 1 AND ${table.rating} <= 5`
    ),
  })
);

export const productReviewsRelations = relations(productReviews, ({ one }) => ({
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
}));

// Carts
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

// Cart Items
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

// Payment Methods
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethodsRelations = relations(
  paymentMethods,
  ({ many }) => ({
    orders: many(orders),
    transactions: many(paymentTransactions),
    storeSettings: many(storePaymentSettings),
  })
);

// Shipping Methods
export const shippingMethods = pgTable("shipping_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  shippingZoneId: uuid("shipping_zone_id").references(() => shippingZones.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingMethodsRelations = relations(
  shippingMethods,
  ({ one, many }) => ({
    shippingZone: one(shippingZones, {
      fields: [shippingMethods.shippingZoneId],
      references: [shippingZones.id],
    }),
    orders: many(orders),
  })
);

export const provinces = pgTable("provinces", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 10 }).unique(),
  nameTh: varchar("name_th", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }),
});

export const districts = pgTable(
  "districts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 10 }),
    provinceId: uuid("province_id").references(() => provinces.id),
    nameTh: varchar("name_th", { length: 100 }).notNull(),
    nameEn: varchar("name_en", { length: 100 }),
  },
  (table) => ({
    uniqueProvinceCode: uniqueIndex("districts_province_id_code_unique").on(table.provinceId, table.code),
  })
);

export const subdistricts = pgTable(
  "subdistricts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 10 }),
    districtId: uuid("district_id").references(() => districts.id),
    provinceId: uuid("province_id").references(() => provinces.id),
    nameTh: varchar("name_th", { length: 100 }).notNull(),
    nameEn: varchar("name_en", { length: 100 }),
    zipcode: varchar("zipcode", { length: 10 }),
  },
  (table) => ({
    uniqueDistrictCode: uniqueIndex("subdistricts_district_id_code_unique").on(table.districtId, table.code),
  })
);

// Addresses
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  shippingZoneId: uuid("shipping_zone_id").references(() => shippingZones.id),
  fullName: varchar("full_name", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  addressLine1: varchar("address_line1", { length: 255 }).notNull(),
  addressLine2: varchar("address_line2", { length: 255 }),
  country: varchar("country", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }),
  district: varchar("district", { length: 100 }),
  subdistrict: varchar("subdistrict", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  isDefault: boolean("is_default").default(false),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const addressesRelations = relations(addresses, ({ one, many }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
  shippingZone: one(shippingZones, {
    fields: [addresses.shippingZoneId],
    references: [shippingZones.id],
  }),
  shippingOrders: many(orders, { relationName: "shipping_address" }),
  billingOrders: many(orders, { relationName: "billing_address" }),
}));

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  paymentStatus: varchar("payment_status", { length: 50 })
    .notNull()
    .default("pending"),
  shippingStatus: varchar("shipping_status", { length: 50 })
    .notNull()
    .default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddressId: uuid("shipping_address_id").references(() => addresses.id),
  billingAddressId: uuid("billing_address_id").references(() => addresses.id),
  shippingMethodId: uuid("shipping_method_id").references(
    () => shippingMethods.id
  ),
  paymentMethodId: uuid("payment_method_id").references(
    () => paymentMethods.id
  ),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at"),
  refundReason: text("refund_reason"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundedAt: timestamp("refunded_at"),
  statusNotes: text("status_notes"),
  shippingNotes: text("shipping_notes"),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  carrier: varchar("carrier", { length: 100 }),
  estimatedDelivery: timestamp("estimated_delivery"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  shippingAddress: one(addresses, {
    fields: [orders.shippingAddressId],
    references: [addresses.id],
    relationName: "shipping_address",
  }),
  billingAddress: one(addresses, {
    fields: [orders.billingAddressId],
    references: [addresses.id],
    relationName: "billing_address",
  }),
  shippingMethod: one(shippingMethods, {
    fields: [orders.shippingMethodId],
    references: [shippingMethods.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [orders.paymentMethodId],
    references: [paymentMethods.id],
  }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  coupons: many(orderCoupons),
  transactions: many(paymentTransactions),
  shipments: many(shipments),
  shipment: one(shipments, {
    fields: [orders.id],
    references: [shipments.orderId],
  }),
  shippingHistory: many(shippingHistory),
  pickups: many(storePickups),
}));

// Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  productId: uuid("product_id").references(() => products.id),
  variantId: uuid("variant_id").references(() => productVariants.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

// Payment Transactions
export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  orderId: uuid("order_id").references(() => orders.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  paymentMethodId: uuid("payment_method_id").references(
    () => paymentMethods.id,
    {
      onDelete: "set null",
      onUpdate: "cascade",
    }
  ),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("THB"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  transactionId: varchar("transaction_id", { length: 100 }),
  paymentDetails: jsonb("payment_details"),
  timestamp: timestamp("timestamp").defaultNow(),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundReason: text("refund_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentTransactionsRelations = relations(
  paymentTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [paymentTransactions.userId],
      references: [users.id],
    }),
    order: one(orders, {
      fields: [paymentTransactions.orderId],
      references: [orders.id],
    }),
    paymentMethod: one(paymentMethods, {
      fields: [paymentTransactions.paymentMethodId],
      references: [paymentMethods.id],
    }),
  })
);

// Order Status History
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  status: varchar("status", { length: 50 }).notNull(),
  comment: text("comment"),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderStatusHistoryRelations = relations(
  orderStatusHistory,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderStatusHistory.orderId],
      references: [orders.id],
    }),
    changedBy: one(users, {
      fields: [orderStatusHistory.createdBy],
      references: [users.id],
      relationName: "status_changed_by",
    }),
  })
);

// Stores
export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 500 }),
  logo: varchar("logo", { length: 500 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storesRelations = relations(stores, ({ many }) => ({
  settings: many(storeSettings),
  reviews: many(storeReviews),
  inventory: many(storeInventory),
  pickups: many(storePickups),
  paymentSettings: many(storePaymentSettings),
}));

// Store Settings
export const storeSettings = pgTable("store_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storeSettingsRelations = relations(storeSettings, ({ one }) => ({
  store: one(stores, {
    fields: [storeSettings.storeId],
    references: [stores.id],
  }),
}));

// Store Reviews
export const storeReviews = pgTable("store_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  userId: uuid("user_id").references(() => users.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storeReviewsRelations = relations(storeReviews, ({ one }) => ({
  store: one(stores, {
    fields: [storeReviews.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [storeReviews.userId],
    references: [users.id],
  }),
}));

// Store Inventory
export const storeInventory = pgTable("store_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storeInventoryRelations = relations(storeInventory, ({ one }) => ({
  store: one(stores, {
    fields: [storeInventory.storeId],
    references: [stores.id],
  }),
  product: one(products, {
    fields: [storeInventory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [storeInventory.variantId],
    references: [productVariants.id],
  }),
}));

// Store Pickups
export const storePickups = pgTable("store_pickups", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  pickupDate: timestamp("pickup_date"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const storePickupsRelations = relations(storePickups, ({ one }) => ({
  order: one(orders, {
    fields: [storePickups.orderId],
    references: [orders.id],
  }),
  store: one(stores, {
    fields: [storePickups.storeId],
    references: [stores.id],
  }),
}));

// User Roles
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  role: varchar("role", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

// User Preferences
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  language: varchar("language", { length: 10 }).default("th"),
  theme: varchar("theme", { length: 20 }).default("light"),
  notifications: jsonb("notifications").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferences.userId],
      references: [users.id],
    }),
  })
);

// Wishlist Items
export const wishlistItems = pgTable("wishlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [wishlistItems.variantId],
    references: [productVariants.id],
  }),
}));

// Loyalty Programs
export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  points: integer("points").default(0),
  tier: varchar("tier", { length: 50 }).default("bronze"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const loyaltyProgramsRelations = relations(
  loyaltyPrograms,
  ({ one, many }) => ({
    user: one(users, {
      fields: [loyaltyPrograms.userId],
      references: [users.id],
    }),
    pointsHistory: many(pointsHistory),
  })
);

// Points History
export const pointsHistory = pgTable("points_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  loyaltyProgramId: uuid("loyalty_program_id").references(
    () => loyaltyPrograms.id,
    {
      onDelete: "cascade",
      onUpdate: "cascade",
    }
  ),
  points: integer("points").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  description: text("description"),
  // Set for points earned/reversed by an order, so each order credits once.
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pointsHistoryRelations = relations(pointsHistory, ({ one }) => ({
  user: one(users, {
    fields: [pointsHistory.userId],
    references: [users.id],
  }),
  loyaltyProgram: one(loyaltyPrograms, {
    fields: [pointsHistory.loyaltyProgramId],
    references: [loyaltyPrograms.id],
  }),
}));

// User Social Links
export const userSocialLinks = pgTable("user_social_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  platform: varchar("platform", { length: 50 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSocialLinksRelations = relations(
  userSocialLinks,
  ({ one }) => ({
    user: one(users, {
      fields: [userSocialLinks.userId],
      references: [users.id],
    }),
  })
);

// User Preferred Brands
export const userPreferredBrands = pgTable("user_preferred_brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  brandId: uuid("brand_id")
    .notNull()
    .references(() => brands.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferredBrandsRelations = relations(
  userPreferredBrands,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferredBrands.userId],
      references: [users.id],
    }),
    brand: one(brands, {
      fields: [userPreferredBrands.brandId],
      references: [brands.id],
    }),
  })
);

// User Preferred Categories
export const userPreferredCategories = pgTable("user_preferred_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPreferredCategoriesRelations = relations(
  userPreferredCategories,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferredCategories.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [userPreferredCategories.categoryId],
      references: [categories.id],
    }),
  })
);

// Collections
export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(collectionProducts),
}));

// Collection Products
export const collectionProducts = pgTable("collection_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  collectionId: uuid("collection_id")
    .notNull()
    .references(() => collections.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const collectionProductsRelations = relations(
  collectionProducts,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionProducts.collectionId],
      references: [collections.id],
    }),
    product: one(products, {
      fields: [collectionProducts.productId],
      references: [products.id],
    }),
  })
);

// Store Payment Settings
export const storePaymentSettings = pgTable("store_payment_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeId: uuid("store_id")
    .notNull()
    .references(() => stores.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const storePaymentSettingsRelations = relations(
  storePaymentSettings,
  ({ one }) => ({
    store: one(stores, {
      fields: [storePaymentSettings.storeId],
      references: [stores.id],
    }),
    paymentMethod: one(paymentMethods, {
      fields: [storePaymentSettings.paymentMethod],
      references: [paymentMethods.code],
    }),
  })
);

// Coupons
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minPurchase: decimal("min_purchase", { precision: 10, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  // null = unlimited. Counted over orders that were not cancelled.
  usageLimit: integer("usage_limit"),
  perUserLimit: integer("per_user_limit"),
  // Personal coupons (e.g. loyalty rewards) belong to one user; null = public.
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const couponsRelations = relations(coupons, ({ many }) => ({
  orderCoupons: many(orderCoupons),
}));

// Order Coupons
export const orderCoupons = pgTable("order_coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  couponId: uuid("coupon_id")
    .notNull()
    .references(() => coupons.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderCouponsRelations = relations(orderCoupons, ({ one }) => ({
  order: one(orders, {
    fields: [orderCoupons.orderId],
    references: [orders.id],
  }),
  coupon: one(coupons, {
    fields: [orderCoupons.couponId],
    references: [coupons.id],
  }),
}));

// Product Attributes
export const productAttributes = pgTable("product_attributes", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  name: varchar("name", { length: 100 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productAttributesRelations = relations(
  productAttributes,
  ({ one }) => ({
    product: one(products, {
      fields: [productAttributes.productId],
      references: [products.id],
    }),
  })
);

// Shipping Zones
export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  baseCost: decimal("base_cost", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingRates = pgTable("shipping_rates", {
  id: uuid("id").primaryKey().defaultRandom(),
  shippingZoneId: uuid("shipping_zone_id").references(() => shippingZones.id),
  shippingMethodId: uuid("shipping_method_id").references(
    () => shippingMethods.id
  ),
  minWeight: decimal("min_weight", { precision: 10, scale: 2 }),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({
  shippingMethods: many(shippingMethods, {
    fields: [shippingZones.id],
    references: [shippingMethods.shippingZoneId],
  }),
  shippingRates: many(shippingRates, {
    fields: [shippingZones.id],
    references: [shippingRates.shippingZoneId],
  }),
}));

// Shipments
export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  carrier: varchar("carrier", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  estimatedDelivery: timestamp("estimated_delivery"),
  actualDelivery: timestamp("actual_delivery"),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
}));

// Shipping History
export const shippingHistory = pgTable("shipping_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  carrier: varchar("carrier", { length: 100 }),
  shipmentId: uuid("shipment_id").references(() => shipments.id),
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shippingHistoryRelations = relations(
  shippingHistory,
  ({ one }) => ({
    order: one(orders, {
      fields: [shippingHistory.orderId],
      references: [orders.id],
    }),
  })
);

// Product Tags (Additional table for better product organization)
export const productTags = pgTable("product_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const productTagsRelations = relations(productTags, ({ many }) => ({
  products: many(productTagsToProducts),
}));

// Product Tags to Products (Many-to-Many relationship)
export const productTagsToProducts = pgTable(
  "product_tags_to_products",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => productTags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.tagId] }),
  })
);

export const productTagsToProductsRelations = relations(
  productTagsToProducts,
  ({ one }) => ({
    product: one(products, {
      fields: [productTagsToProducts.productId],
      references: [products.id],
    }),
    tag: one(productTags, {
      fields: [productTagsToProducts.tagId],
      references: [productTags.id],
    }),
  })
);

// Discounts (More flexible than just coupons)
export const discounts = pgTable("discounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 50 }).notNull(), // 'percentage', 'fixed_amount', etc.
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal("max_discount_amount", {
    precision: 10,
    scale: 2,
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const discountsRelations = relations(discounts, ({ many }) => ({
  productDiscounts: many(productDiscounts),
  categoryDiscounts: many(categoryDiscounts),
}));

// Product Discounts
export const productDiscounts = pgTable("product_discounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  discountId: uuid("discount_id")
    .notNull()
    .references(() => discounts.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productDiscountsRelations = relations(
  productDiscounts,
  ({ one }) => ({
    discount: one(discounts, {
      fields: [productDiscounts.discountId],
      references: [discounts.id],
    }),
    product: one(products, {
      fields: [productDiscounts.productId],
      references: [products.id],
    }),
  })
);

// Category Discounts
export const categoryDiscounts = pgTable("category_discounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  discountId: uuid("discount_id")
    .notNull()
    .references(() => discounts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categoryDiscountsRelations = relations(
  categoryDiscounts,
  ({ one }) => ({
    discount: one(discounts, {
      fields: [categoryDiscounts.discountId],
      references: [discounts.id],
    }),
    category: one(categories, {
      fields: [categoryDiscounts.categoryId],
      references: [categories.id],
    }),
  })
);

// Notifications
// Site-wide settings (key -> JSON value), editable by admins.
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Refunds
export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  processedBy: uuid("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  processedByUser: one(users, {
    fields: [refunds.processedBy],
    references: [users.id],
  }),
}));

// Suppliers
export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    contactPerson: varchar("contact_person", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }).notNull(),
    address: jsonb("address").notNull(),
    taxId: varchar("tax_id", { length: 100 }),
    paymentTerms: varchar("payment_terms", { length: 255 }),
    notes: text("notes"),
    status: varchar("status", { length: 50 }).notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIdx: index("suppliers_status_idx").on(table.status),
    emailIdx: index("suppliers_email_idx").on(table.email),
  })
);

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  products: many(supplierProducts),
}));

// Supplier Products
export const supplierProducts = pgTable(
  "supplier_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    sku: varchar("sku", { length: 100 }).notNull(),
    cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
    leadTime: integer("lead_time").notNull(),
    minimumOrder: integer("minimum_order").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    supplierProductUq: unique("supplier_products_supplier_product_uq").on(
      table.supplierId,
      table.productId
    ),
    supplierIdIdx: index("supplier_products_supplier_id_idx").on(
      table.supplierId
    ),
    productIdIdx: index("supplier_products_product_id_idx").on(
      table.productId
    ),
  })
);

export const supplierProductsRelations = relations(
  supplierProducts,
  ({ one }) => ({
    supplier: one(suppliers, {
      fields: [supplierProducts.supplierId],
      references: [suppliers.id],
    }),
    product: one(products, {
      fields: [supplierProducts.productId],
      references: [products.id],
    }),
  })
);

// Export all relations
export const allRelations = {
  users: usersRelations,
  userSessions: userSessionsRelations,
  categories: categoriesRelations,
  brands: brandsRelations,
  products: productsRelations,
  productVariants: productVariantsRelations,
  productReviews: productReviewsRelations,
  carts: cartsRelations,
  cartItems: cartItemsRelations,
  paymentMethods: paymentMethodsRelations,
  shippingMethods: shippingMethodsRelations,
  addresses: addressesRelations,
  orders: ordersRelations,
  orderItems: orderItemsRelations,
  paymentTransactions: paymentTransactionsRelations,
  orderStatusHistory: orderStatusHistoryRelations,
  stores: storesRelations,
  storeSettings: storeSettingsRelations,
  storeReviews: storeReviewsRelations,
  storeInventory: storeInventoryRelations,
  storePickups: storePickupsRelations,
  userRoles: userRolesRelations,
  userPreferences: userPreferencesRelations,
  wishlistItems: wishlistItemsRelations,
  loyaltyPrograms: loyaltyProgramsRelations,
  pointsHistory: pointsHistoryRelations,
  userSocialLinks: userSocialLinksRelations,
  userPreferredBrands: userPreferredBrandsRelations,
  userPreferredCategories: userPreferredCategoriesRelations,
  collections: collectionsRelations,
  collectionProducts: collectionProductsRelations,
  storePaymentSettings: storePaymentSettingsRelations,
  coupons: couponsRelations,
  orderCoupons: orderCouponsRelations,
  productAttributes: productAttributesRelations,
  shippingZones: shippingZonesRelations,
  shipments: shipmentsRelations,
  shippingHistory: shippingHistoryRelations,
  productTags: productTagsRelations,
  productTagsToProducts: productTagsToProductsRelations,
  discounts: discountsRelations,
  productDiscounts: productDiscountsRelations,
  categoryDiscounts: categoryDiscountsRelations,
  notifications: notificationsRelations,
  refunds: refundsRelations,
  suppliers: suppliersRelations,
  supplierProducts: supplierProductsRelations,
};
