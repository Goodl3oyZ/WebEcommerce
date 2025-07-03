"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { brandsAPI } from "@/lib/api";
import {
  FaBuilding,
  FaEdit,
  FaTrash,
  FaPlusCircle,
  FaImage,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

export function BrandsPanel() {
  const [brands, setBrands] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();

  const loadBrands = async () => {
    try {
      const response = await brandsAPI.getAllBrands();
      setBrands(response.brands || []);
    } catch {
      toast.error("Failed to load brands");
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const onSubmit = async (data) => {
    try {
      const url = editingId ? `/api/brands/${editingId}` : "/api/brands";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(editingId ? "Brand updated!" : "Brand created!");
        reset();
        setEditingId(null);
        loadBrands();
      } else {
        const error = await response.json();
        toast.error(error.message || "Something went wrong");
      }
    } catch {
      toast.error("Failed to save brand");
    }
  };

  const handleEdit = (brand) => {
    setEditingId(brand.id);
    setValue("name", brand.name);
    setValue("description", brand.description);
    setValue("logo_url", brand.logo_url);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this brand?")) return;

    try {
      const response = await fetch(`/api/brands/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast.success("Brand deleted!");
        loadBrands();
      } else {
        toast.error("Failed to delete brand");
      }
    } catch {
      toast.error("Failed to delete brand");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Panel */}
        <div className="bg-white border rounded-2xl shadow-lg p-8 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <FaBuilding className="text-purple-500 text-2xl" />
            <h2 className="text-xl font-bold text-gray-800">
              {editingId ? "Edit Brand" : "Add New Brand"}
            </h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name
              </label>
              <input
                {...register("name", { required: "Brand name is required" })}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-base px-3 py-2"
                placeholder="Brand name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register("description")}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-base px-3 py-2"
                placeholder="Brand description"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Logo URL
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="url"
                  {...register("logo_url")}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-base px-3 py-2"
                  placeholder="https://..."
                />
                <FaImage className="text-gray-400 text-xl" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-base px-5 py-2 rounded-lg shadow transition font-semibold"
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
        {/* Brands List Panel */}
        <div className="bg-white border rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-2 mb-4">
            <FaBuilding className="text-purple-500 text-2xl" />
            <h2 className="text-xl font-bold text-gray-800">Brands List</h2>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center justify-between border-b pb-3 gap-4"
              >
                <div className="flex items-center gap-3 flex-1">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
                  ) : (
                    <FaImage className="w-10 h-10 text-gray-300" />
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {brand.name}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          brand.isActive
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {brand.isActive ? (
                          <FaCheckCircle className="inline mr-1 text-green-500" />
                        ) : (
                          <FaTimesCircle className="inline mr-1 text-gray-400" />
                        )}{" "}
                        {brand.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {brand.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-right">
                  <button
                    onClick={() => handleEdit(brand)}
                    className="flex items-center gap-1 text-purple-600 hover:underline text-sm font-medium"
                  >
                    <FaEdit /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(brand.id)}
                    className="flex items-center gap-1 text-red-600 hover:underline text-sm font-medium"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            ))}
            {brands.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <FaBuilding className="text-5xl mb-2" />
                <p className="text-base">No brands found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
