export default function PriceFilter({ minPrice, maxPrice, onPriceChange }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Price Range</h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="minPrice"
            className="block text-sm font-medium text-gray-700"
          >
            Min Price
          </label>
          <input
            type="number"
            id="minPrice"
            value={minPrice}
            onChange={(e) => onPriceChange(e.target.value, maxPrice)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="0"
            min="0"
          />
        </div>
        <div>
          <label
            htmlFor="maxPrice"
            className="block text-sm font-medium text-gray-700"
          >
            Max Price
          </label>
          <input
            type="number"
            id="maxPrice"
            value={maxPrice}
            onChange={(e) => onPriceChange(minPrice, e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="1000"
            min="0"
          />
        </div>
      </div>
    </div>
  );
}
