/** Small broadcast-network pill (NBC, CBS, FOX, ESPN, NETFLIX…). */
export function NetworkBadge({ network }: { network: string | null | undefined }) {
  if (!network) return null;
  return (
    <span className="network-pill rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-normal">
      {network}
    </span>
  );
}
