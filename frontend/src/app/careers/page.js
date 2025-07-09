export default function CareersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Careers</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Join Our Team</h2>
          <p className="text-gray-600 mb-4">
            We&apos;re always looking for talented individuals who are
            passionate about innovation and customer service.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">Current Openings</h3>
          <p className="text-gray-600">
            We currently don&apos;t have any open positions, but we&apos;re
            always accepting applications for future opportunities.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">Why Work With Us?</h3>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Competitive salary and benefits</li>
            <li>Flexible work environment</li>
            <li>Opportunities for growth and development</li>
            <li>Collaborative and inclusive culture</li>
            <li>Work on cutting-edge technology</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-2">Contact HR</h3>
          <p className="text-gray-600">
            If you&apos;re interested in joining our team, please send your
            resume to: careers@challenge.com
          </p>
        </div>
      </div>
    </div>
  );
}
