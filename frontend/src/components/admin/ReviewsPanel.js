"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import {
  FaStar,
  FaEdit,
  FaTrash,
  FaPlusCircle,
  FaUserCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { productsAPI } from "@/lib/api/products";
import { useAuth } from "@/contexts/AuthContext";

export function ReviewsPanel() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();
  const { user } = useAuth();

  const loadReviews = async () => {
    try {
      const response = await productsAPI.getAllProducts();
      setProducts(response.products || []);
      // รวมรีวิวจากสินค้าทุกตัว
      const allReviews = [];
      (response.products || []).forEach((product) => {
        (product.reviews || []).forEach((review) => {
          allReviews.push({ ...review, product });
        });
      });
      setReviews(allReviews);
    } catch (error) {
      toast.error("Failed to load reviews");
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const onSubmit = async (data) => {
    try {
      if (!data.productId) {
        toast.error("Please select a product");
        return;
      }
      data.user_id = user?.id;
      data.rating = parseInt(data.rating, 10);
      let response;
      if (editingId) {
        response = await productsAPI.updateReview(
          data.productId,
          editingId,
          data
        );
      } else {
        response = await productsAPI.createReview(data.productId, data);
      }
      if (response.status === 200 || response.status === 201) {
        toast.success(editingId ? "Review updated!" : "Review created!");
        reset();
        setEditingId(null);
        loadReviews();
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      toast.error("Failed to save review");
    }
  };

  const handleEdit = (review) => {
    setEditingId(review.id);
    setValue("rating", review.rating);
    setValue("comment", review.comment);
    setValue("user_id", review.user_id);
    setValue("productId", review.product.id);
  };

  const handleDelete = async (review) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      const response = await productsAPI.deleteReview(
        review.product.id,
        review.id
      );
      if (response.status === 200 || response.status === 204) {
        toast.success("Review deleted!");
        loadReviews();
      } else {
        toast.error("Failed to delete review");
      }
    } catch (error) {
      toast.error("Failed to delete review");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface p-8 rounded-2xl shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <FaStar className="text-warning text-2xl" />
            <h2 className="text-xl font-bold text-fg">
              {editingId ? "Edit Review" : "Add New Review"}
            </h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-fg mb-1">
                Product
              </label>
              <select
                {...register("productId", { required: "Product is required" })}
                className="mt-1 block w-full rounded-lg border border-border bg-surface-muted focus:border-warning focus:ring-2 focus:ring-border text-base px-3 py-2"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-fg mb-1">
                Rating (1-5)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                {...register("rating", {
                  required: "Rating is required",
                  min: 1,
                  max: 5,
                })}
                className="mt-1 block w-full rounded-lg border border-border bg-surface-muted focus:border-warning focus:ring-2 focus:ring-border text-base px-3 py-2"
                placeholder="1-5"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fg mb-1">
                Comment
              </label>
              <textarea
                {...register("comment", { required: "Comment is required" })}
                rows={4}
                className="mt-1 block w-full rounded-lg border border-border bg-surface-muted focus:border-warning focus:ring-2 focus:ring-border text-base px-3 py-2"
                placeholder="Write your review..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-fg mb-1">
                User ID
              </label>
              <input
                type="hidden"
                {...register("user_id")}
                value={user?.id || ""}
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-warning hover:bg-warning text-white text-base px-5 py-2 rounded-lg shadow transition font-semibold"
              >
                {editingId ? <FaEdit /> : <FaPlusCircle />}
                {editingId ? "Update" : "Create"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    reset();
                  }}
                  className="flex items-center gap-2 bg-fg hover:bg-fg/85 text-canvas text-base px-5 py-2 rounded-lg shadow transition"
                >
                  <FaTimesCircle /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="bg-surface p-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <FaStar className="text-warning text-2xl" />
            <h2 className="text-xl font-bold text-fg">Reviews List</h2>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-b pb-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="flex text-warning text-lg">
                      {[...Array(review.rating)].map((_, i) => (
                        <FaStar key={i} />
                      ))}
                      {[...Array(5 - review.rating)].map((_, i) => (
                        <FaStar
                          key={i + review.rating}
                          className="text-fg-subtle"
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-fg-muted flex items-center gap-1">
                      <FaUserCircle className="text-fg-subtle" /> User #
                      {review.user_id}
                    </span>
                    <span className="ml-2 text-xs text-fg font-semibold">
                      Product: {review.product?.name}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(review)}
                      className="flex items-center gap-1 text-warning hover:underline text-sm font-medium"
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(review)}
                      className="flex items-center gap-1 text-danger hover:underline text-sm font-medium"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
                <p className="text-fg text-base">{review.comment}</p>
                <p className="text-sm text-fg-muted mt-1">
                  {review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString()
                    : "-"}
                </p>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-fg-subtle">
                <FaStar className="text-5xl mb-2" />
                <p className="text-base">No reviews found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
