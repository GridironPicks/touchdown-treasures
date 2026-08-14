import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";

import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createEntryCheckout } from "@/utils/payments.functions";

export function EntryCheckout({
  priceId,
  season,
  week,
  returnUrl,
}: {
  priceId: string;
  season: number;
  week: number;
  returnUrl: string;
}) {
  const startCheckout = useServerFn(createEntryCheckout);

  const fetchClientSecret = async (): Promise<string> => {
    const result = await startCheckout({
      data: { priceId, season, week, returnUrl, environment: getStripeEnvironment() },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  return (
    <div id="checkout" className="rounded-2xl bg-background p-2">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
