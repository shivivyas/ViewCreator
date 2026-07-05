"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Loader2, CreditCard, ArrowUpRight, ArrowDownLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTransactions } from "@/services/api/payment-service";
import type { CreditTransaction } from "@/types";

export default function PaymentHistoryPage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    getToken()
      .then((t) => t && getTransactions(t))
      .then((data) => {
        if (!cancelled) setTransactions(data.transactions);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Sign in to view your payment history.</p>
          <Button onClick={() => router.push("/pricing")}>Sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <section className="border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex items-center gap-3 mb-8">
            <CreditCard className="size-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Payment History</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No transactions yet.</p>
              <Button className="mt-4" onClick={() => router.push("/pricing")}>
                Buy credits
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <Card key={tx.id} className="border-border/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-1.5 ${
                        tx.amount > 0
                          ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                          : "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400"
                      }`}>
                        {tx.amount > 0
                          ? <ArrowDownLeft className="size-3.5" />
                          : <ArrowUpRight className="size-3.5" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {tx.description || tx.type}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tx.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {tx.dodo_payment_id && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            Payment ID: {tx.dodo_payment_id}
                          </p>
                        )}
                        {tx.dodo_subscription_id && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            Subscription ID: {tx.dodo_subscription_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${
                        tx.amount > 0 ? "text-green-600" : "text-foreground"
                      }`}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Balance: {tx.balance_after}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
