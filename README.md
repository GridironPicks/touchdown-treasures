# Gridiron Confidence Picks

Build a full-stack, responsive web application for an NFL Confidence Pick 'Em League called "Gridiron Confidence", featuring automated weekly schedules, interactive confidence ranking mechanics, Apple Pay entry fees, and a season-long leaderboard.

### Theme & Styling (Gridiron Glory Aesthetic)

- Aesthetic: Official NFL Sunday Game-Day theme using dark navy `#0B162A`, vibrant field green `#00E676`, metallic silver, and high-contrast sports typography.

- UI Layout: Tailwind CSS with clean, modern components, stadium lighting accents, and responsive design optimized for mobile phones and tablets.

### Key Features & User Workflow

1. User Onboarding & Team Branding:

   - Account creation/login flow.

   - Team Setup Screen: Custom team name input with a gallery of vector mascot logos, helmet badges, and team color presets.

2. Weekly NFL Matchup & Confidence Picker Engine:

   - Schedule Automation: Automatically fetch weekly NFL schedules (via NFL API integration, e.g., Tank01 or Sportradar) to auto-populate each week's game matchups.

   - Interactive Confidence Point Assignment:

     - Automatically detect total number of games for the week (e.g., 16 games = numbers 16 down to 1).

     - Drag-and-drop or rank-selection interface allowing users to assign points (16 = most confident winner, 1 = least confident winner) to their picked teams.

     - Prevent duplicate point values across games in the same week.

   - Monday Night Tiebreaker: Include a dedicated input field for the final game of the week (usually Monday Night Football) to predict the total combined score.

   - Strict Wednesday 6:00 PM Deadline Lock:

     - Built-in countdown timer showing time remaining until Wednesday at 6:00 PM.

     - Automated lock mechanism: Picks are automatically locked and uneditable after 6:00 PM every Wednesday.

3. Apple Pay Entry & Pot Management ($5 Buy-In):

   - Integrated Payment Gateway UI featuring Apple Pay (via Stripe/Apple Pay Web API) for the $5 weekly entry fee.

   - Payment Status Panel: Tracks paid vs. unpaid users prior to the Wednesday lock.

   - Weekly Winner Calculation: Automatically computes earned points as games conclude, applies Monday Night tiebreaker logic if needed, and highlights the weekly pot winner.

4. Season Leaderboard & 2026 Championship Trophy:

   - Season Standings Table: Shows cumulative season points, weekly wins, and overall ranking across all registered users.

   - Display a metallic, glowing "2026 NFL Championship Trophy Badge" next to the top-ranked user on the leaderboard.

### Technical & Architecture Requirements

- Stack: React, Tailwind CSS, TypeScript, Supabase (for database storage, authentication, and realtime score tracking).

- API Integration: Edge Functions to pull weekly NFL game schedules and real-time scores for automatic pick resolution.

- Responsive Design: Touch-friendly UI (`100vh`/`100vw` container) with zero horizontal scroll, perfectly tuned for quick mobile pick submissions.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/383ed09b-f9ad-498a-a5e6-dead0317428d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
