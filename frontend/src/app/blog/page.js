export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>
      <p className="text-gray-600 mb-4">
        Stay updated with the latest trends, tips, and insights from our team.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
          <p className="text-gray-600">
            Our blog is under construction. Check back soon for exciting
            content!
          </p>
        </div>
      </div>
    </div>
  );
}
