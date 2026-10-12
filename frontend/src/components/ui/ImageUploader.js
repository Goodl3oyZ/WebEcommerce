"use client";

import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FaImage,
  FaTrash,
  FaStar,
  FaStarOfLife,
  FaGripVertical,
} from "react-icons/fa";

const SortableImageItem = ({
  image,
  index,
  onRemove,
  onSetPrimary,
  isPrimary,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.id || index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group bg-surface border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <FaGripVertical size={12} />
      </div>

      {/* Primary Badge */}
      {isPrimary && (
        <div className="absolute top-2 right-2 z-10 bg-fg text-canvas px-2 py-1 rounded-full text-xs font-medium">
          <FaStarOfLife size={10} className="inline mr-1" />
          Primary
        </div>
      )}

      {/* Image */}
      <img
        src={image.url || URL.createObjectURL(image.file)}
        alt={`Product ${index + 1}`}
        className="w-full h-32 object-cover"
      />

      {/* Actions Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isPrimary && (
            <button
              onClick={() => onSetPrimary(index)}
              className="bg-fg text-canvas p-2 rounded-full hover:bg-fg transition-colors"
              title="Set as primary"
            >
              <FaStar size={14} />
            </button>
          )}
          <button
            onClick={() => onRemove(index)}
            className="bg-danger text-white p-2 rounded-full hover:bg-danger transition-colors"
            title="Remove image"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ImageUploader({
  images = [],
  onImagesChange,
  maxImages = 10,
  className = "",
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = images.findIndex(
        (img, idx) => (img.id || idx) === active.id
      );
      const newIndex = images.findIndex(
        (img, idx) => (img.id || idx) === over.id
      );

      const newImages = arrayMove(images, oldIndex, newIndex);
      onImagesChange(newImages);
    }
  };

  const handleFileSelect = (files) => {
    const newFiles = Array.from(files).slice(0, maxImages - images.length);
    const newImages = newFiles.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file,
      url: URL.createObjectURL(file),
      isPrimary: images.length === 0 && index === 0, // First image is primary if no existing images
    }));

    onImagesChange([...images, ...newImages]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);

    // If removing primary image, make first remaining image primary
    if (images[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    onImagesChange(newImages);
  };

  const handleSetPrimary = (index) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(newImages);
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? "border-fg bg-surface-muted"
            : "border-border hover:border-border"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <FaImage className="mx-auto text-fg-subtle text-3xl mb-3" />
        <p className="text-fg-muted mb-2">
          ลากวางรูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์
        </p>
        <p className="text-sm text-fg-muted">
          รองรับ JPG, PNG, GIF ขนาดสูงสุด 5MB
        </p>
        <p className="text-sm text-fg-muted">สูงสุด {maxImages} รูปภาพ</p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-fg mb-3">
            รูปภาพ ({images.length}/{maxImages})
          </h4>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((img, idx) => img.id || idx)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <SortableImageItem
                    key={image.id || index}
                    image={image}
                    index={index}
                    onRemove={handleRemoveImage}
                    onSetPrimary={handleSetPrimary}
                    isPrimary={image.isPrimary}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <p className="text-xs text-fg-muted mt-2">
            💡 ลากรูปเพื่อจัดเรียงใหม่ • คลิกดาวเพื่อตั้งเป็นรูปหลัก
          </p>
        </div>
      )}
    </div>
  );
}
