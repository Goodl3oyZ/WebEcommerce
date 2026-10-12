export default function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shipping & Returns</h1>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Shipping Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-2">Standard Shipping</h3>
              <p className="text-fg-muted mb-2">3-5 business days</p>
              <p className="text-fg-muted">$5.99 flat rate</p>
            </div>
            <div className="bg-surface rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-2">Express Shipping</h3>
              <p className="text-fg-muted mb-2">1-2 business days</p>
              <p className="text-fg-muted">$12.99 flat rate</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Return Policy</h2>
          <div className="bg-surface rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-2">30-Day Return Window</h3>
            <p className="text-fg-muted mb-4">
              We accept returns within 30 days of purchase for most items in
              their original condition.
            </p>
            <h4 className="font-semibold mb-2">Return Process:</h4>
            <ol className="list-decimal list-inside space-y-1 text-fg-muted">
              <li>Contact our customer service team</li>
              <li>Receive return authorization and shipping label</li>
              <li>Package item securely with original packaging</li>
              <li>Ship item back using provided label</li>
              <li>Refund will be processed within 5-7 business days</li>
            </ol>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">
            International Shipping
          </h2>
          <div className="bg-surface rounded-lg shadow-md p-6">
            <p className="text-fg-muted mb-4">
              We ship to most countries worldwide. Shipping costs and delivery
              times vary by location.
            </p>
            <p className="text-fg-muted">
              International orders may be subject to customs duties and taxes,
              which are the responsibility of the customer.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Contact Support</h2>
          <div className="bg-surface rounded-lg shadow-md p-6">
            <p className="text-fg-muted">
              For questions about shipping or returns, please contact our
              customer service team at support@challenge.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
