import Link from "next/link";

export default function SubscribeSuccessPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Premium!
        </h1>
        <p className="text-gray-600 mb-6">
          Your Vellymon Premium subscription is now active. Time to make some
          legendary designs.
        </p>

        <div className="space-y-3">
          <Link
            href="/player"
            className="block w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Player Hub →
          </Link>
        </div>
      </div>
    </div>
  );
}
