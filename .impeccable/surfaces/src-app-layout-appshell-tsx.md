---
version: 1
slug: "src-app-layout-appshell-tsx"
primary_target: "src/app/layout/AppShell.tsx"
related_targets: ["src/features/dashboard/DashboardPage.tsx","src/features/arrivals/components/WeekGrid.tsx"]
---

# Portal K'Plan (organizaciones)

Mode: Operate. Surface: the whole authenticated portal (shell + every module) for negocios, alcaldías and admin K'Plan; the home is the first viewport.

- Audience and job: an owner or municipal tourism officer at an office computer, daytime indoor light. Daily job: know who is coming and when, then prepare. Weekly: keep the place profile right, offer coupons, publish events, buy badges, pay K'Plan.
- Content on hand: the app's stops, circuits, events and coupons; generated (seeded, synthetic) visit events, redemptions and statements.
- Constraints: K'Plan app world is pinned (colors, Poppins, 10 px corners); one token source; the same JSON contract as the app.
- Unresolved: real prices, real organizations, whether new profile sections ship in the app.

## Direction contract

THESIS: The portal is ordered in time. The home is the week of arrivals the tourists' itineraries already announce, not a KPI dashboard; it refuses the hero-metric template of four stat cards, a line chart and a table.

OWN-WORLD: The app's world: cream ground, ink text and rules, white cards with sand borders, 10 px corners, uppercase tracked buttons, Poppins with tabular numerals. Blue means planned, green means confirmed with QR, gold belongs only to badges, terracotta only to primary actions and "now".

STORY: In seconds the owner knows how many people arrive today and this week, at what hours, from which circuit, and prepares staff. Then keeps the profile correct, offers coupons, publishes events, buys badges, and sees what they owe K'Plan, line by line.

FIRST VIEWPORT: Sidebar left. Main: week title with a Día · Semana · Mes switch and place picker, one summary sentence (no stat cards), then the week grid at about two thirds width: seven day columns, hour rows grouped as Mañana, Mediodía, Tarde, cells tinted by expected people with planned/real counts, events and campaigns as spans atop each day, a terracotta now-line in today's column. Right panel: the selected day's groups with time, people, circuit, status. "Validar cupón" is the top-bar primary action. Signature interaction: selecting a cell filters the panel to who is present then, arrow keys walk the grid.

FORM: Agenda de la semana, position 3 of 7 on the ordered list; seed key fcca70f9.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
