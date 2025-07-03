import { db } from "../config/db.js";
import {
  products,
  productVariants,
  productAttributes,
  productReviews,
  categories,
  brands,
} from "../models/schema.js";
import {
  eq,
  like,
  and,
  or,
  desc,
  asc,
  sql,
  gte,
  lte,
  not,
  inArray,
} from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { getFileUrl, BUCKETS } from "../config/minio.js";

export const productService = {
  async getProducts({
    page = 1,
    limit = 10,
    sort,
    category,
    minPrice,
    maxPrice,
    search,
  }) {
    const offset = (page - 1) * limit;
    const whereConditions = [];

    if (category) {
      whereConditions.push(eq(products.categoryId, category));
    }

    if (minPrice) {
      whereConditions.push(gte(products.price, minPrice));
    }

    if (maxPrice) {
      whereConditions.push(lte(products.price, maxPrice));
    }

    if (search) {
      whereConditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.description, `%${search}%`)
        )
      );
    }

    // Map sort values to column names and directions
    const sortMap = {
      newest: { column: "createdAt", direction: "desc" },
      oldest: { column: "createdAt", direction: "asc" },
      price_asc: { column: "price", direction: "asc" },
      price_desc: { column: "price", direction: "desc" },
      name_asc: { column: "name", direction: "asc" },
      name_desc: { column: "name", direction: "desc" },
    };

    const sortConfig = sortMap[sort] || {
      column: "createdAt",
      direction: "desc",
    };
    const orderBy =
      sortConfig.direction === "desc"
        ? [desc(products[sortConfig.column])]
        : [asc(products[sortConfig.column])];

    const [productsList, total] = await Promise.all([
      db.query.products.findMany({
        where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
        with: {
          category: true,
          variants: true,
          reviews: {
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy,
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(
          whereConditions.length > 0 ? and(...whereConditions) : undefined
        ),
    ]);

    // Generate fresh presigned URLs for product images
    const productsWithPresignedUrls = await Promise.all(
      productsList.map(async (product) => {
        if (product.imageUrl) {
          if (Array.isArray(product.imageUrl)) {
            product.imageUrl = await Promise.all(
              product.imageUrl.map(async (img) =>
                img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
              )
            );
          } else if (typeof product.imageUrl === "string") {
            product.imageUrl = await getFileUrl(
              BUCKETS.PRODUCTS,
              product.imageUrl
            );
          } else if (
            typeof product.imageUrl === "object" &&
            product.imageUrl !== null
          ) {
            // If imageUrl is an object (e.g., { main: ..., gallery: [...] })
            const newObj = {};
            for (const [key, val] of Object.entries(product.imageUrl)) {
              if (Array.isArray(val)) {
                newObj[key] = await Promise.all(
                  val.map(async (img) =>
                    img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
                  )
                );
              } else if (typeof val === "string") {
                newObj[key] = await getFileUrl(BUCKETS.PRODUCTS, val);
              } else {
                newObj[key] = val;
              }
            }
            product.imageUrl = newObj;
          }
        }
        return product;
      })
    );

    return {
      products: productsWithPresignedUrls,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async getProductById(id) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        category: true,
        variants: true,
        reviews: {
          with: {
            user: {
              columns: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // Generate fresh presigned URLs for product images
    if (product.imageUrl) {
      if (Array.isArray(product.imageUrl)) {
        product.imageUrl = await Promise.all(
          product.imageUrl.map(async (img) =>
            img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
          )
        );
      } else if (typeof product.imageUrl === "string") {
        product.imageUrl = await getFileUrl(BUCKETS.PRODUCTS, product.imageUrl);
      } else if (
        typeof product.imageUrl === "object" &&
        product.imageUrl !== null
      ) {
        const newObj = {};
        for (const [key, val] of Object.entries(product.imageUrl)) {
          if (Array.isArray(val)) {
            newObj[key] = await Promise.all(
              val.map(async (img) =>
                img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
              )
            );
          } else if (typeof val === "string") {
            newObj[key] = await getFileUrl(BUCKETS.PRODUCTS, val);
          } else {
            newObj[key] = val;
          }
        }
        product.imageUrl = newObj;
      }
    }

    return product;
  },

  async getProductsByCategory(categoryId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [productsList, total] = await Promise.all([
      db.query.products.findMany({
        where: eq(products.categoryId, categoryId),
        with: {
          category: true,
          variants: true,
        },
        orderBy: [desc(products.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(eq(products.categoryId, categoryId)),
    ]);

    // Generate fresh presigned URLs for product images
    const productsWithPresignedUrls = await Promise.all(
      productsList.map(async (product) => {
        if (product.imageUrl) {
          if (Array.isArray(product.imageUrl)) {
            product.imageUrl = await Promise.all(
              product.imageUrl.map(async (img) =>
                img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
              )
            );
          } else if (typeof product.imageUrl === "string") {
            product.imageUrl = await getFileUrl(
              BUCKETS.PRODUCTS,
              product.imageUrl
            );
          } else if (
            typeof product.imageUrl === "object" &&
            product.imageUrl !== null
          ) {
            const newObj = {};
            for (const [key, val] of Object.entries(product.imageUrl)) {
              if (Array.isArray(val)) {
                newObj[key] = await Promise.all(
                  val.map(async (img) =>
                    img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
                  )
                );
              } else if (typeof val === "string") {
                newObj[key] = await getFileUrl(BUCKETS.PRODUCTS, val);
              } else {
                newObj[key] = val;
              }
            }
            product.imageUrl = newObj;
          }
        }
        return product;
      })
    );

    return {
      products: productsWithPresignedUrls,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async searchProducts(query, { page = 1, limit = 10 }) {
    if (!query) {
      throw new ApiError("Search query is required", 400);
    }

    const offset = (page - 1) * limit;
    const searchCondition = or(
      like(products.name, `%${query}%`),
      like(products.description, `%${query}%`)
    );

    const [productsList, total] = await Promise.all([
      db.query.products.findMany({
        where: searchCondition,
        with: {
          category: true,
          variants: true,
        },
        orderBy: [desc(products.createdAt)],
        limit,
        offset,
      }),
      db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(searchCondition),
    ]);

    // Generate fresh presigned URLs for product images
    const productsWithPresignedUrls = await Promise.all(
      productsList.map(async (product) => {
        if (product.imageUrl) {
          if (Array.isArray(product.imageUrl)) {
            product.imageUrl = await Promise.all(
              product.imageUrl.map(async (img) =>
                img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
              )
            );
          } else if (typeof product.imageUrl === "string") {
            product.imageUrl = await getFileUrl(
              BUCKETS.PRODUCTS,
              product.imageUrl
            );
          } else if (
            typeof product.imageUrl === "object" &&
            product.imageUrl !== null
          ) {
            const newObj = {};
            for (const [key, val] of Object.entries(product.imageUrl)) {
              if (Array.isArray(val)) {
                newObj[key] = await Promise.all(
                  val.map(async (img) =>
                    img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
                  )
                );
              } else if (typeof val === "string") {
                newObj[key] = await getFileUrl(BUCKETS.PRODUCTS, val);
              } else {
                newObj[key] = val;
              }
            }
            product.imageUrl = newObj;
          }
        }
        return product;
      })
    );

    return {
      products: productsWithPresignedUrls,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  // Helper function to generate presigned URLs for imageUrl
  async withPresignedImageUrl(product) {
    if (!product || !product.imageUrl) return product;
    if (Array.isArray(product.imageUrl)) {
      product.imageUrl = await Promise.all(
        product.imageUrl.map(async (img) =>
          img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
        )
      );
    } else if (typeof product.imageUrl === "string") {
      product.imageUrl = await getFileUrl(BUCKETS.PRODUCTS, product.imageUrl);
    } else if (
      typeof product.imageUrl === "object" &&
      product.imageUrl !== null
    ) {
      const newObj = {};
      for (const [key, val] of Object.entries(product.imageUrl)) {
        if (Array.isArray(val)) {
          newObj[key] = await Promise.all(
            val.map(async (img) =>
              img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
            )
          );
        } else if (typeof val === "string") {
          newObj[key] = await getFileUrl(BUCKETS.PRODUCTS, val);
        } else {
          newObj[key] = val;
        }
      }
      product.imageUrl = newObj;
    }
    return product;
  },

  async createProduct(productData) {
    const [newProduct] = await db
      .insert(products)
      .values(productData)
      .returning();

    // Generate presigned URL for imageUrl before returning
    return await this.withPresignedImageUrl(newProduct);
  },

  async updateProduct(id, updates) {
    // First check if the product exists
    const existingProduct = await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        variants: true,
        attributes: true,
      },
    });

    if (!existingProduct) {
      throw new ApiError("Product not found", 404);
    }

    // Start a transaction
    return await db.transaction(async (tx) => {
      // Update basic product info
      const validUpdates = {
        name: updates.name,
        description: updates.description,
        price: updates.price,
        stock: updates.stock,
        imageUrl: updates.imageUrl, // <-- ตรงนี้!
        categoryId: updates.categoryId,
        brandId: updates.brandId,
      };

      // Remove undefined values
      Object.keys(validUpdates).forEach((key) => {
        if (validUpdates[key] === undefined) {
          delete validUpdates[key];
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        throw new Error("No values to update");
      }

      const [updatedProduct] = await tx
        .update(products)
        .set(validUpdates)
        .where(eq(products.id, id))
        .returning();

      // Update variants if provided
      if (updates.variants) {
        // Delete variants that are not in the update
        const variantIds = updates.variants
          .filter((v) => v.id)
          .map((v) => v.id);

        if (variantIds.length > 0) {
          await tx
            .delete(productVariants)
            .where(
              and(
                eq(productVariants.productId, id),
                not(inArray(productVariants.id, variantIds))
              )
            );
        }

        // Update or create variants
        for (const variant of updates.variants) {
          if (variant.id) {
            // Update existing variant
            await tx
              .update(productVariants)
              .set({
                color: variant.color,
                size: variant.size,
                sku: variant.sku,
                stock: variant.stock,
              })
              .where(
                and(
                  eq(productVariants.id, variant.id),
                  eq(productVariants.productId, id)
                )
              );
          } else {
            // Create new variant
            await tx.insert(productVariants).values({
              productId: id,
              color: variant.color,
              size: variant.size,
              sku: variant.sku,
              stock: variant.stock,
            });
          }
        }
      }

      // Update attributes if provided
      if (updates.attributes) {
        if (existingProduct.attributes) {
          // Update existing attributes
          await tx
            .update(productAttributes)
            .set({
              material: updates.attributes.material,
              careInstructions: updates.attributes.careInstructions,
              countryOfOrigin: updates.attributes.countryOfOrigin,
              weight: updates.attributes.weight,
              dimensions: updates.attributes.dimensions,
            })
            .where(eq(productAttributes.productId, id));
        } else {
          // Create new attributes
          await tx.insert(productAttributes).values({
            productId: id,
            material: updates.attributes.material,
            careInstructions: updates.attributes.careInstructions,
            countryOfOrigin: updates.attributes.countryOfOrigin,
            weight: updates.attributes.weight,
            dimensions: updates.attributes.dimensions,
          });
        }
      }

      // Return updated product with relations and presigned imageUrl
      const updated = await tx.query.products.findFirst({
        where: eq(products.id, id),
        with: {
          category: true,
          brand: true,
          variants: true,
          attributes: true,
        },
      });
      return await this.withPresignedImageUrl(updated);
    });
  },

  async deleteProduct(id) {
    const [deletedProduct] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (!deletedProduct) {
      throw new ApiError("Product not found", 404);
    }

    return deletedProduct;
  },

  async createVariant(productId, variantData) {
    const [newVariant] = await db
      .insert(productVariants)
      .values({
        ...variantData,
        productId,
      })
      .returning();

    return newVariant;
  },

  async updateVariant(productId, variantId, updates) {
    // First check if the variant exists
    const existingVariant = await db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.id, variantId),
        eq(productVariants.productId, productId)
      ),
    });

    if (!existingVariant) {
      throw new ApiError("Variant not found", 404);
    }

    // Prepare valid updates
    const validUpdates = {
      color: updates.color,
      size: updates.size,
      sku: updates.sku,
      stock: updates.stock,
    };

    // Remove undefined values
    Object.keys(validUpdates).forEach((key) => {
      if (validUpdates[key] === undefined) {
        delete validUpdates[key];
      }
    });

    const [updatedVariant] = await db
      .update(productVariants)
      .set(validUpdates)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId)
        )
      )
      .returning();

    return updatedVariant;
  },

  async deleteVariant(productId, variantId) {
    const [deletedVariant] = await db
      .delete(productVariants)
      .where(
        and(
          eq(productVariants.id, variantId),
          eq(productVariants.productId, productId)
        )
      )
      .returning();

    if (!deletedVariant) {
      throw new ApiError("Variant not found", 404);
    }

    return deletedVariant;
  },

  async createReview(productId, userId, reviewData) {
    const [newReview] = await db
      .insert(productReviews)
      .values({
        ...reviewData,
        productId,
        userId,
      })
      .returning();

    return newReview;
  },

  async updateReview(productId, reviewId, userId, updates) {
    // First check if the review exists
    const existingReview = await db.query.productReviews.findFirst({
      where: and(
        eq(productReviews.id, reviewId),
        eq(productReviews.productId, productId)
      ),
    });

    if (!existingReview) {
      throw new ApiError("Review not found", 404);
    }

    // Check if the user owns the review
    if (existingReview.userId !== userId) {
      throw new ApiError("You are not authorized to update this review", 403);
    }

    // Validate rating if provided
    if (updates.rating && (updates.rating < 1 || updates.rating > 5)) {
      throw new ApiError("Rating must be between 1 and 5", 400);
    }

    // Ensure updates only contains valid fields
    const validUpdates = {
      rating: updates.rating,
      comment: updates.comment,
    };

    const [updatedReview] = await db
      .update(productReviews)
      .set(validUpdates)
      .where(
        and(
          eq(productReviews.id, reviewId),
          eq(productReviews.productId, productId),
          eq(productReviews.userId, userId)
        )
      )
      .returning();

    return updatedReview;
  },

  async deleteReview(productId, reviewId, userId) {
    const [deletedReview] = await db
      .delete(productReviews)
      .where(
        and(
          eq(productReviews.id, reviewId),
          eq(productReviews.productId, productId),
          eq(productReviews.userId, userId)
        )
      )
      .returning();

    if (!deletedReview) {
      throw new ApiError("Review not found", 404);
    }

    return deletedReview;
  },

  async getProductVariants(productId) {
    return await db.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
    });
  },

  async getProductReviews(productId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [reviewsList, total] = await Promise.all([
      db.query.productReviews.findMany({
        where: eq(productReviews.productId, productId),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
            },
          },
        },
        limit,
        offset,
        orderBy: [desc(productReviews.createdAt)],
      }),
      db
        .select({ count: sql`count(*)` })
        .from(productReviews)
        .where(eq(productReviews.productId, productId)),
    ]);

    return {
      reviews: reviewsList,
      pagination: {
        total: Number(total[0].count),
        page,
        limit,
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },

  async filterProducts({
    categories,
    brands,
    minPrice,
    maxPrice,
    colors,
    sizes,
    page = 1,
    limit = 10,
  }) {
    const offset = (page - 1) * limit;
    const whereConditions = [];

    if (categories) {
      whereConditions.push(products.categoryId.in(categories.split(",")));
    }
    if (brands) {
      whereConditions.push(products.brandId.in(brands.split(",")));
    }
    if (minPrice) {
      whereConditions.push(products.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      whereConditions.push(products.price <= parseFloat(maxPrice));
    }

    const where =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [filteredProducts, total] = await Promise.all([
      db.query.products.findMany({
        where,
        with: {
          category: true,
          brand: true,
          variants: true,
        },
        limit: parseInt(limit),
        offset: parseInt(offset),
      }),
      db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(where),
    ]);

    // Additional filtering for variants if needed
    let finalProducts = filteredProducts;
    if (colors || sizes) {
      finalProducts = filteredProducts.filter((product) => {
        return product.variants.some((variant) => {
          if (colors && !colors.split(",").includes(variant.color))
            return false;
          if (sizes && !sizes.split(",").includes(variant.size)) return false;
          return true;
        });
      });
    }

    // Generate fresh presigned URLs for product images
    const productsWithPresignedUrls = await Promise.all(
      finalProducts.map(async (product) => {
        if (product.imageUrl) {
          if (Array.isArray(product.imageUrl)) {
            product.imageUrl = await Promise.all(
              product.imageUrl.map(async (img) =>
                img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
              )
            );
          } else if (typeof product.imageUrl === "string") {
            product.imageUrl = await getFileUrl(
              BUCKETS.PRODUCTS,
              product.imageUrl
            );
          } else if (
            typeof product.imageUrl === "object" &&
            product.imageUrl !== null
          ) {
            const newObj = {};
            for (const [key, val] of Object.entries(product.imageUrl)) {
              if (Array.isArray(val)) {
                newObj[key] = await Promise.all(
                  val.map(async (img) =>
                    img ? await getFileUrl(BUCKETS.PRODUCTS, img) : null
                  )
                );
              } else if (typeof val === "string") {
                newObj[key] = await getFileUrl(BUCKETS.PRODUCTS, val);
              } else {
                newObj[key] = val;
              }
            }
            product.imageUrl = newObj;
          }
        }
        return product;
      })
    );

    return {
      products: productsWithPresignedUrls,
      pagination: {
        total: Number(total[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  },
};
