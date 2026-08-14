import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SEASON, ENTRY_FEE_CENTS } from "@/lib/league";
import { Mascot } from "@/components/Mascot";
import { Button } from "@/components/ui/button";
import { EntryCheckout } from "@/components/EntryCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

export const Route = createFileRoute("/_authenticated/pot")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } =>
    typeof search['session_id'] === "string" ? { session_id: search['session_id'] } : {},
  head: () => ({
    meta: [
      { title: "Weekly Pot — Gridiron Confidence" },
      {
        name: "description",
        content: "Pay the $5 weekly buy-in with Apple Pay and track who is paid up.",
      },
      { property: "og:title", content: "Weekly Pot — Gridiron Confidence" },
      {
        property: "og:description",
        content: "$5 weekly entry, live payment status and the running pot total.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PotPage,
});

const WEEK = 1;
const PRICE_ID = "weekly_entry_5";

function PotPage() {
  const queryClient = useQueryClient();
  const { session_id: sessionId } = Route.useSearch();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const entriesQuery = useQuery({
    queryKey: ["entries", WEEK],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .eq("season", SEASON)
        .eq("week", WEEK);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: sessionId ? 3000 : false,
  });
  const entries = entriesQuery.data ?? [];

  const paidIds = new Set(entries.filter((e) => e.paid).map((e) => e.user_id));
  const potCents = paidIds.size * ENTRY_FEE_CENTS;
  const iPaid = me ? paidIds.has(me.id) : false;

  useEffect(() => {
    if (sessionId) {
      setCheckoutOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["entries", WEEK] });
    }
  }, [sessionId, queryClient]);

  useEffect(() => {
    if (sessionId && iPaid) toast.success("Payment confirmed — you're in the pot");
  }, [sessionId, iPaid]);

  const returnUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/pot?session_id={CHECKOUT_SESSION_ID}`;

  return (
    <div className="space-y-6">
      <PaymentTestModeBanner />

      <header>
        <h1 className="stadium-heading text-3xl">Week {WEEK} Pot</h1>
        <p className="text-sm text-muted-foreground">$5 buy-in · winner takes the weekly pot</p>
      </header>

      <section className="field-panel flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Current pot</p>
          <p className="stadium-heading text-4xl text-primary">${(potCents / 100).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">
            {paidIds.size} of {profiles.length} managers paid
          </p>
        </div>
        {iPaid ? (
          <span className="inline-flex items-center gap-2 rounded-xl border border-primary/50 px-4 py-3 text-sm font-semibold text-primary">
            <Check size={16} /> Entry paid
          </span>
        ) : sessionId && !checkoutOpen ? (
          <span className="text-sm text-muted-foreground">Confirming your payment…</span>
        ) : (
          <Button size="lg" onClick={() => setCheckoutOpen(true)} className="gap-2">
            <CreditCard size={18} /> Pay $5 (Apple Pay available)
          </Button>
        )}
      </section>

      {checkoutOpen && !iPaid && (
        <section className="field-panel rounded-2xl p-3">
          <EntryCheckout priceId={PRICE_ID} season={SEASON} week={WEEK} returnUrl={returnUrl} />
        </section>
      )}

      <section className="field-panel overflow-hidden rounded-2xl">
        <h2 className="stadium-heading border-b border-border px-4 py-3 text-lg">
          Payment status
        </h2>
        <ul className="divide-y divide-border">
          {profiles.map((p) => {
            const paid = paidIds.has(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Mascot mascot={p.mascot} color={p.primary_color} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.team_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.display_name}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                    paid
                      ? "bg-primary/15 text-primary"
                      : "bg-destructive/15 text-destructive-foreground"
                  }`}
                >
                  {paid ? <Check size={12} /> : <X size={12} />}
                  {paid ? "Paid" : "Unpaid"}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
