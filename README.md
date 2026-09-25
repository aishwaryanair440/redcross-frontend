# RedCross Nexus — Frontend

> A humanitarian crisis-intelligence dashboard for field teams and coordinators.  
> Built with **React 19 · Vite 8 · TypeScript · Tailwind CSS v4**.

---

## Overview

RedCross Nexus is a real-time situational-awareness tool that aggregates field observations, detects duplicate/conflicting reports via an AI-powered fusion engine, and organises verified needs into prioritised clusters for rapid humanitarian response.

### Key Views

| View | Purpose |
|------|---------|
| **Overview** | High-level summary cards — open clusters, pending fusion flags, active locations |
| **Need Clusters** | Filterable list of verified need groups with priority, status, and observation counts |
| **Cluster Detail** | Deep-dive into a single cluster: evidence timeline, conflict detection, confidence score |
| **Fusion Review** | Side-by-side comparison of possible duplicate or conflicting reports; accept / dismiss / merge |
| **Report Status** | Live status tracker for a submitted field report |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 + React DOM 19 |
| Language | TypeScript 5.7 |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin — no config file needed) |
| Formatter | oxfmt |
| Package Manager | pnpm (versions pinned in `.mise.toml`) |

---

## Project Structure

```
redcross-frontend/
├── index.html            # Vite HTML shell — mounts #root
├── vite.config.ts        # Vite + React + Tailwind CSS v4 plugins; @ alias → src/
├── tsconfig.json         # TypeScript config
├── package.json          # Scripts and dependencies
├── .mise.toml            # Node.js & pnpm version pins
├── .env                  # Local environment variables (not committed)
└── src/
    ├── main.tsx          # React entry-point — imports index.css, mounts <App />
    ├── App.tsx           # Root component: routing logic, all page views
    ├── api.ts            # Typed API client (fetch wrapper + all endpoint methods)
    ├── hooks.ts          # Custom React hooks (useClusters, useFusionCandidates, …)
    ├── index.css         # Global CSS + Tailwind v4 @import
    └── assets/           # Static assets (images, icons)
```

---

## Getting Started

### Prerequisites

- **Node.js >= 22** and **pnpm** (use [mise](https://mise.jdx.dev/) to match exact versions in `.mise.toml`)
- The [redcross-backend](https://github.com/aishwaryanair440/redcross-backend) API running locally on port `8000`

### 1 — Clone & install

```bash
git clone https://github.com/aishwaryanair440/redcross-frontend.git
cd redcross-frontend
pnpm install
```

### 2 — Configure environment

Copy the example below to `.env` and adjust if needed:

```env
PORT=5173
VITE_API_BASE_URL=http://localhost:8000/api
```

> `.env` is **git-ignored** — never commit secrets.

### 3 — Run the dev server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.  
Hot-module replacement is enabled — edits reflect immediately.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | Production build → `dist/` |
| `pnpm preview` | Serve the `dist/` bundle locally |
| `pnpm format` | Format source files with oxfmt |

---

## API Client (`src/api.ts`)

All backend calls go through a single typed `api` object:

```ts
api.submitReport(data)                     // POST /api/reports
api.getReportStatus(id)                    // GET  /api/reports/:id
api.getClusters(params?)                   // GET  /api/clusters  (paginated)
api.getClusterDetail(id)                   // GET  /api/clusters/:id
api.getFusionCandidates()                  // GET  /api/fusion
api.resolveFusionCandidate(id, action)     // POST /api/fusion/:id/resolve
```

- **No auth headers** — the backend is currently unauthenticated.
- Errors are normalised: `404 Not Found`, `422 Validation Error`, `5xx Server Error`.

---

## Custom Hooks (`src/hooks.ts`)

| Hook | Returns |
|------|---------|
| `useClusters(params?)` | `{ clusters, loading, error, refetch }` |
| `useClusterDetail(id)` | `{ cluster, loading, error, refetch }` |
| `useFusionCandidates()` | `{ candidates, loading, error, refetch }` |

---

## Styling

- **Tailwind CSS v4** — utility classes used directly in JSX.
- No separate `tailwind.config.*` or PostCSS config required.
- Global resets and font wiring live in `src/index.css`.
- Theme customisation (custom tokens, fonts) goes in `src/index.css` using Tailwind v4 `@theme`.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5173` | Local dev server port |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Backend API base URL |

---

## Related Repositories

- **Backend:** [redcross-backend](https://github.com/aishwaryanair440/redcross-backend) — FastAPI + Supabase (PostgreSQL) API server

---

## License

Internal project — RedCross Humanitarian Technology Initiative. All rights reserved.
