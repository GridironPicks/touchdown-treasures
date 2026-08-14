const clientToken = import.meta.env['VITE_PAYMENTS_CLIENT_TOKEN'] as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive-foreground">
        Production checkout is not configured yet. Complete Stripe go-live to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-center text-sm text-primary">
        Payments in the preview run in test mode — use card 4242 4242 4242 4242.
      </div>
    );
  }
  return null;
}
