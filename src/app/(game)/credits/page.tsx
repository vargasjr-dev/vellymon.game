import { headers } from "next/headers";
import { auth } from "~/lib/auth.server";
import { getCurrencyInfo } from "../../../../lib/currency";
import { db } from "../../../../data/db";
import { currencyTransaction } from "../../../../data/schema";
import { eq, desc } from "drizzle-orm";

function formatType(type: string): string {
  switch (type) {
    case "monthly_grant":
      return "Monthly Grant";
    case "purchase":
      return "Purchase";
    case "spend":
      return "Spent";
    case "refund":
      return "Refund";
    default:
      return type;
  }
}

function typeColor(type: string): string {
  switch (type) {
    case "monthly_grant":
    case "purchase":
    case "refund":
      return "text-green-600";
    case "spend":
      return "text-red-600";
    default:
      return "text-gray-600";
  }
}

export default async function CreditsPage() {
  const headersList = await headers();
  const session = (await auth.api.getSession({ headers: headersList }))!;

  const [currencyInfo, transactions] = await Promise.all([
    getCurrencyInfo(session.user.id),
    db
      .select()
      .from(currencyTransaction)
      .where(eq(currencyTransaction.userId, session.user.id))
      .orderBy(desc(currencyTransaction.createdAt))
      .limit(50),
  ]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💰 Credits</h1>
        <p className="text-gray-600 mt-1">
          Your credit balance and transaction history.
        </p>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <p className="text-sm text-gray-500">Balance</p>
          <p className="text-2xl font-bold text-blue-600">
            {currencyInfo.balance.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <p className="text-sm text-gray-500">Lifetime Earned</p>
          <p className="text-2xl font-bold text-green-600">
            {currencyInfo.lifetimeEarned.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 text-center">
          <p className="text-sm text-gray-500">Lifetime Spent</p>
          <p className="text-2xl font-bold text-red-600">
            {currencyInfo.lifetimeSpent.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Transaction History
          </h2>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No transactions yet. Credits are granted with your Premium
            subscription each month.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatType(tx.type)}
                  </p>
                  {tx.description && (
                    <p className="text-xs text-gray-500">{tx.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {tx.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p
                  className={`text-sm font-bold ${typeColor(tx.type)}`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
