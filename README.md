# Northstar Service Intelligence

A decision-ready Enterprise SLA and Program Health dashboard built with React, TypeScript, and Vite. The UI uses representative mock data and is organized so live ServiceNow and Dynatrace adapters can replace the data layer without changing the presentation modules.

## Architecture

```text
ServiceNow (incidents, task_sla, changes, problems) ─┐
                                                      ├─> ingest -> normalize -> calculate -> insight rules
Dynatrace (availability, problems, events, metrics) ──┘                         |
                                                                                v
                                        KPI API / cache -> Overview | Apps | SLA | Operations
```

Recommended production shape: scheduled incremental collectors write raw payloads to object storage, normalize into a warehouse model, and expose a read-optimized KPI API. Keep credentials in a secret manager and proxy both vendor APIs through a backend service.

## Canonical model and KPI logic

| Entity           | Required fields                                                                              | Source                |
| ---------------- | -------------------------------------------------------------------------------------------- | --------------------- |
| Application      | `id`, `name`, `owner`, `criticality`, `serviceNowCiId`, `dynatraceEntityId`                  | CMDB / catalog        |
| Incident         | `id`, `applicationId`, `priority`, `openedAt`, `resolvedAt`, `category`, `cause`, `isRepeat` | ServiceNow `incident` |
| SLA event        | `taskId`, `type`, `stage`, `targetAt`, `breachedAt`, `elapsedPercent`                        | ServiceNow `task_sla` |
| Change / Problem | `id`, `applicationId`, `state`, `risk`, `rootCause`, `isFailed`                              | ServiceNow            |
| Telemetry point  | `applicationId`, `metric`, `timestamp`, `value`, `unit`                                      | Dynatrace             |

- **Program health:** weighted availability, SLA compliance, incident severity, MTTR, aged backlog, and change success score. Weights live in `dashboard-config.json`.
- **SLA compliance:** completed SLA tasks within target divided by completed tasks, excluding canceled records.
- **MTTR:** median `resolvedAt - openedAt`, segmented by priority and application.
- **Repeat rate:** same application, category, and normalized cause within 30 days divided by total incidents.
- **Forecast:** rolling 12-week trend with seasonality adjustment and open-risk penalties, including confidence and owner action.

## API integration blueprint

1. Query ServiceNow `sys_updated_on` windows with pagination and persist the source `sys_id` plus extraction timestamp.
2. Query Dynatrace metrics by mapped application entity and pull open problems/events on the same UTC timeline.
3. Normalize CI/application identifiers, priority vocabularies, statuses, and timestamps.
4. Quarantine unmapped applications, reject records without stable IDs, and alert on stale source syncs.
5. Publish `/api/programs/{id}/overview`, `/applications`, `/sla`, and `/operations`; cache aggregates for five minutes and retain source drill-down links.

## Insight contract

Each insight should return `priority`, `title`, `evidence`, `owner`, `recommendedAction`, `dueDate`, and `sourceLinks`. Prioritize customer impact, confidence, and time to breach. The UI demonstrates the intended concise format: name the signal, quantify the evidence, and point to a next action.

## Run locally

```bash
npm install
npm run dev
npm run build
```

The UI includes Overview, Application Portfolio, SLA Performance, and Incidents & Operations views with responsive desktop and mobile layouts. `dashboard-config.json` contains the sample connector, scorecard, and insight-rule configuration.

## Live ServiceNow and Dynatrace connector

The backend-ready connector is in `backend/integration.py`. It is deliberately kept out of the React bundle so ServiceNow and Dynatrace credentials never reach the browser.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
Copy-Item .env.example .env
$env:MOCK_MODE = "true"
python backend\integration.py
python -m unittest discover -s backend -p "test_*.py"
```

For live mode, set `MOCK_MODE=false` and provide `SN_URL`, `SN_USER`, `SN_PASS`, `DT_URL`, and `DT_TOKEN`. Use a secret manager or deployment environment for those values; do not commit `.env`. The connector adds connection timeouts, retry/backoff for transient GET failures, response validation, ServiceNow table reads for SLAs/incidents/changes/problems, and Dynatrace metrics/problems reads.

The normalized feed includes `summary.slaCompliance`, `summary.p1P2Incidents`, `summary.mttrMinutes`, `summary.changeFailureRate`, and `summary.openProblems`, plus the source payload sections used for drill-down. `MOCK_MODE=true` is the safe local default and produces a deterministic dashboard feed without calling either vendor.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
