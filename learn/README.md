# Acme Finance Academy

A standalone learning site for understanding the Finance Command Center — finance terminology, real-world implications, dashboard navigation, and AI agent architecture.

**Separate from the main app.** Runs on its own port.

## Quick start

Run both sites side by side:

```bash
# Terminal 1 — main dashboard
cd ~/Desktop/acme-finance-agents
npm run dev
# → http://localhost:3000

# Terminal 2 — academy
cd ~/Desktop/acme-finance-agents/learn
npm install
npm run dev
# → http://localhost:3002
```

## What's inside

| Section | URL | Purpose |
|---------|-----|---------|
| Course Home | `/` | Overview, lesson path, Acme context |
| Lessons 1–7 | `/lessons/*` | Guided course (~15–20 min each) |
| Glossary | `/glossary` | 30 searchable finance & platform terms |
| Screen Guide | `/screens` | Dashboard walkthrough with wireframes |
| Interview Prep | `/interview` | 30s pitch, demo script, Q&A by audience |

## Lesson path

1. The CFO's Monday
2. Cash, Burn & Runway
3. Forecasting Scenarios
4. Budget & Variance
5. AR & Collections
6. AP, Vendors & Fraud
7. From AI Insight to Action

Progress is saved in browser localStorage (checkbox per lesson).

## Build for deploy

```bash
cd learn
npm run build
# Static files output to learn/out/
```

### Deploy to Vercel (optional)

1. Create a new Vercel project
2. Set **Root Directory** to `learn`
3. Framework preset: Next.js
4. Deploy — you'll get a shareable URL for your portfolio

## Content structure

```
learn/
  content/
    terms.json       # Glossary source of truth
    screens.json     # Screen guide entries
    lessons/*.md     # Lesson content (markdown)
  public/screenshots/  # Annotated wireframe SVGs
```

To edit a lesson, modify the corresponding `.md` file in `content/lessons/`.

## Replace wireframes with real screenshots

The screen guide uses SVG wireframes. To use actual dashboard captures:

1. Open `localhost:3000` and screenshot each tab
2. Save PNGs to `learn/public/screenshots/` (e.g. `kpi-bar.png`)
3. Update `screenshot` paths in `content/screens.json`
