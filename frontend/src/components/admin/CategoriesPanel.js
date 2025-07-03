"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { categoriesAPI } from "@/lib/api"; // Adjust the import path as needed
import {
  FaTags,
  FaEdit,
  FaTrash,
  FaPlusCircle,
  FaChevronDown,
  FaTimesCircle,
} from "react-icons/fa";

export function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  const loadCategories = async () => {
    try {
      const response = await categoriesAPI.getAllCategories();
      setCategories(response.categories || []);
    } catch (error) {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const onSubmit = async (data) => {
    try {
      const url = editingId
        ? `/api/categories/${editingId}`
        : "/api/categories";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingId ? "Category updated!" : "Category created!");
        reset();
        setEditingId(null);
        loadCategories();
      } else {
        const error = await response.json();
        toast.error(error.message || "Something went wrong");
      }
    } catch (error) {
      toast.error("Failed to save category");
    }
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setValue("name", category.name);
    setValue("description", category.description);
    setValue("parent_id", category.parent_id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Category deleted!");
        loadCategories();
      } else {
        toast.error("Failed to delete category");
      }
    } catch (error) {
      toast.error("Failed to delete category");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-lg flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <FaTags className="text-green-500 text-2xl" />
            <h2 className="text-xl font-bold text-gray-800">
              {editingId ? "Edit Category" : "Add New Category"}
            </h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name
              </label>
              <input
                {...register("name", { required: "Category name is required" })}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base px-3 py-2"
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register("description")}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base px-3 py-2"
                placeholder="Category description"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Parent Category
              </label>
              <div className="relative">
                <select
                  {...register("parent_id")}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-green-500 focus:ring-2 focus:ring-green-200 text-base px-3 py-2 appearance-none"
                >
                  <option value="">None</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <FaChevronDown className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-base px-5 py-2 rounded-lg shadow transition font-semibold"
              >
                {editingId ? <FaEdit /> : <FaPlusCircle />}{" "}
                {editingId ? "Update" : "Create"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    reset();
                  }}
                  className="flex items-center gap-2 bg-gray-400 hover:bg-gray-500 text-white text-base px-5 py-2 rounded-lg shadow transition"
                >
                  <FaTimesCircle /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <FaTags className="text-green-500 text-2xl" />
            <h2 className="text-xl font-bold text-gray-800">Categories List</h2>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between border-b pb-3 gap-4"
              >
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    {category.name}
                    {category.parent_id && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Parent:{" "}
                        {
                          categories.find((c) => c.id === category.parent_id)
                            ?.name
                        }
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {category.description}
                  </p>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex items-center gap-1 text-green-600 hover:underline text-sm font-medium"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="flex items-center gap-1 text-red-600 hover:underline text-sm font-medium"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FaTags className="text-5xl mb-2" />
                <p className="text-base">No categories found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
