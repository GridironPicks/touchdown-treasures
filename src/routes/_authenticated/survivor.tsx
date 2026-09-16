import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/survivor")({
  beforeLoad: () => {
    throw redirect({ to: "/picks", replace: true });
  },
});
