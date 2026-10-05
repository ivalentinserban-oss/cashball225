# Cash Ball 225 odds & stats

A mobile-first, installable web app about the Kentucky Lottery's **Cash Ball 225**: the exact odds of every prize tier,
expected value, and five years of winning numbers with frequency charts, randomness tests, a "check my numbers"
simulator and a searchable draw history.

Every draw is independent. Nothing here predicts future numbers, and the app deliberately has no "hot numbers" features.

## Game rules (verified against kylottery.com, October 2026)

Pick 4 white balls from 1–35 and 1 Cash Ball from 1–25 (separate machine). $1 per play, drawn daily at about 11:00 PM ET.

| Match | Prize | Winning combos | Exact odds | Official odds |
|---|---|---:|---:|---:|
| 4 + Cash Ball | $225,000* | 1 | 1 in 1,309,000 | 1 : 1,309,000 |
| 4 | $2,250 | 24 | 1 in 54,541.67 | 1 : 54,542 |
| 3 + Cash Ball | $225 | 124 | 1 in 10,556.45 | 1 : 10,556 |
| 3 | $50 | 2,976 | 1 in 439.85 | 1 : 440 |
| 2 + Cash Ball | $25 | 2,790 | 1 in 469.18 | 1 : 469 |
| 2 | $1 | 66,960 | 1 in 19.55 | 1 : 20 |
| 1 + Cash Ball | $5 | 17,980 | 1 in 72.80 | 1 : 73 |
| Cash Ball only | Free Play | 31,465 | 1 in 41.60 | 1 : 42 |
| **Any prize** | | 122,320 | 1 in 10.70 | ≈ 1 : 10.7 |

\* Top-prize liability is capped at $1,000,000 per drawing (shared pari-mutuel if more than four winners).
Winning combos = C(4,k) × C(31,4−k) × (1 if the Cash Ball matches, else 24), out of C(35,4) × 25 = 1,309,000.
EZmatch, the $1 instant add-on, is not part of the drawing and is not modeled.

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. To open it from a phone on the same Wi-Fi, the dev server already listens on your LAN:
it prints a `Network:` URL such as `http://192.168.1.23:5173`. Open that on the phone (allow Node through the
Windows firewall if prompted). For the production build instead: `npm run build && npm run preview` (port 4173).

Installing as an app and offline mode need HTTPS (or localhost), so use the deployed GitHub Pages URL for
"Add to Home Screen".

## Data

`npm run fetch-draws` writes `data/draws.json` (and caches per-draw winner counts in `data/payouts.json`).

- **Kentucky Lottery (official)**: the JSON endpoint behind kylottery.com's past-results page. The official site only
  exposes the most recent ~180 days.
- **lottery.net** year archives for older draws, cross-checked against the official data wherever both cover a date.
- **lottery.net** per-draw payout pages for Kentucky winner counts per tier (used to count jackpots actually hit).

Every row is validated (4 unique whites in 1–35, Cash Ball in 1–25, no duplicate or conflicting dates). Missing dates
are listed in the file and in the app rather than skipped silently. Requests follow robots.txt and are spaced at least
1.5 s apart per host. The script is incremental; flags:

```
--full            refetch everything instead of only what's missing
--years=5         window size
--no-payouts      skip winner-count pages
--max-payouts=N   cap payout pages fetched this run
--retry-payouts   retry draws whose payout page was unavailable
```

Exit codes: `2` = invalid rows or conflicting sources, `3` = no new draws for 3+ days (sources changed or blocked).

## Automation

- `.github/workflows/refresh-data.yml` runs nightly at 06:30 UTC, commits any new data, then deploys.
- `.github/workflows/deploy.yml` runs tests, builds and deploys to GitHub Pages on every push to `main`.

In the repo settings, set **Pages → Source** to **GitHub Actions**.

## Tests

```bash
npm test
```

Covers the combinatorics (every tier against the published odds, EV, overall odds), prize-tier matching (including an
exhaustive check of all 1,309,000 tickets against a draw), the chi-square test calibration, statistics helpers,
quick-pick validity and data validation.

## Responsible gaming

If gambling stops being fun, call 1-800-GAMBLER (1-800-426-2537). Must be 18+ to play. This is an independent project,
not affiliated with the Kentucky Lottery Corporation.
