import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Timer, Wallet, ListOrdered } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gridiron Confidence — NFL Confidence Pick 'Em League" },
      {
        name: "description",
        content:
          "Free weekly NFL confidence pick 'em: rank every matchup, Wednesday 6PM lock and a season-long trophy chase.",
      },
      { property: "og:title", content: "Gridiron Confidence — NFL Confidence Pick 'Em" },
      {
        property: "og:description",
        content: "Rank every game, beat the Wednesday lock, climb the season standings.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://gridironconfidence.lovable.app/share-card.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://gridironconfidence.lovable.app/share-card.jpg" },

    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ListOrdered, title: "Confidence ranking", body: "Assign 16 down to 1 with no duplicates." },
  { icon: Timer, title: "Wednesday 6PM lock", body: "Live countdown, automatic pick lockout." },
  { icon: Wallet, title: "Always free", body: "No buy-in, no entry fee — just bragging rights." },
  { icon: Trophy, title: "Season trophy", body: "Metallic 2026 badge for the top manager." },
];

function Landing() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-14">
      <p className="text-xs uppercase tracking-[0.35em] text-primary">2026 Season</p>
      <h1 className="stadium-heading mt-3 text-5xl leading-[0.95] sm:text-7xl">
        <span className="chrome-text">GRIDIRON</span>
        <br />
        <span className="text-primary">CONFIDENCE</span>
      </h1>
      <p className="mt-5 max-w-xl text-base text-muted-foreground">
        The free NFL confidence pick 'em league for your crew. Auto-loaded weekly matchups, ranked
        confidence points, a hard Wednesday deadline and a season-long trophy chase.
      </p>


      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/auth"
          className="glow-ring inline-flex h-12 items-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground"
        >
          Enter the league
        </Link>
        <Link
          to="/leaderboard"
          className="inline-flex h-12 items-center rounded-xl border border-border px-6 font-semibold"
        >
          View standings
        </Link>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="field-panel rounded-2xl p-5">
            <f.icon className="text-primary" size={22} />
            <h2 className="stadium-heading mt-3 text-lg">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
