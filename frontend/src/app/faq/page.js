export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Frequently Asked Questions</h1>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">
            How do I place an order?
          </h3>
          <p className="text-gray-600">
            You can place an order by browsing our products, adding items to
            your cart, and proceeding to checkout.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">
            What payment methods do you accept?
          </h3>
          <p className="text-gray-600">
            We accept major credit cards, debit cards, and digital payment
            methods including PayPal.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">
            How long does shipping take?
          </h3>
          <p className="text-gray-600">
            Standard shipping typically takes 3-5 business days. Express
            shipping is available for faster delivery.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">
            What is your return policy?
          </h3>
          <p className="text-gray-600">
            We offer a 30-day return policy for most items. Please contact our
            customer service for return instructions.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">
            Do you ship internationally?
          </h3>
          <p className="text-gray-600">
            Yes, we ship to most countries worldwide. Shipping costs and
            delivery times vary by location.
          </p>
        </div>
      </div>
    </div>
  );
}
