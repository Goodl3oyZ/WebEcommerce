export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategoryChange,
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Categories</h3>
      <div className="space-y-2">
        <button
          onClick={() => onCategoryChange("")}
          className={`block w-full text-left px-4 py-2 rounded-md ${
            selectedCategory === ""
              ? "bg-blue-100 text-blue-700"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          All Categories
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`block w-full text-left px-4 py-2 rounded-md ${
              selectedCategory === category.id
                ? "bg-blue-100 text-blue-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
