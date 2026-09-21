"""ServiceNow and Dynatrace connector for the SLA dashboard.

Run with MOCK_MODE=true for local development. Live mode reads credentials from
environment variables and never sends them to the React client.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class IntegrationError(RuntimeError):
    """Raised when a source cannot provide a usable dashboard feed."""


@dataclass(frozen=True)
class IntegrationConfig:
    servicenow_url: str = os.getenv("SN_URL", "")
    servicenow_user: str = os.getenv("SN_USER", "")
    servicenow_pass: str = os.getenv("SN_PASS", "")
    dynatrace_url: str = os.getenv("DT_URL", "")
    dynatrace_token: str = os.getenv("DT_TOKEN", "")
    project_id: str = os.getenv("PROJECT_ID", "enterprise-it")
    mock_mode: bool = os.getenv("MOCK_MODE", "true").lower() in {"1", "true", "yes"}
    timeout_seconds: float = float(os.getenv("INTEGRATION_TIMEOUT_SECONDS", "15"))

    def validate(self) -> None:
        if self.mock_mode:
            return
        required = {
            "SN_URL": self.servicenow_url,
            "SN_USER": self.servicenow_user,
            "SN_PASS": self.servicenow_pass,
            "DT_URL": self.dynatrace_url,
            "DT_TOKEN": self.dynatrace_token,
        }
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise IntegrationError(f"Missing live integration settings: {', '.join(missing)}")


class BaseClient:
    def __init__(self, cfg: IntegrationConfig) -> None:
        retry = Retry(
            total=3,
            connect=3,
            read=3,
            backoff_factor=0.4,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset({"GET"}),
            raise_on_status=False,
        )
        self.session = requests.Session()
        self.session.mount("https://", HTTPAdapter(max_retries=retry))
        self.session.mount("http://", HTTPAdapter(max_retries=retry))
        self.timeout = cfg.timeout_seconds

    def get_json(self, url: str, **kwargs: Any) -> dict[str, Any]:
        try:
            response = self.session.get(url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            payload = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise IntegrationError(f"GET {url} failed: {exc}") from exc
        if not isinstance(payload, dict):
            raise IntegrationError(f"GET {url} returned a non-object JSON payload")
        return payload


class ServiceNowClient(BaseClient):
    def __init__(self, cfg: IntegrationConfig) -> None:
        super().__init__(cfg)
        self.base_url = cfg.servicenow_url.rstrip("/")
        self.auth = (cfg.servicenow_user, cfg.servicenow_pass)

    def _table(self, table: str, query: str = "") -> list[dict[str, Any]]:
        params = {"sysparm_limit": "1000", "sysparm_display_value": "true"}
        if query:
            params["sysparm_query"] = query
        payload = self.get_json(
            f"{self.base_url}/api/now/table/{table}",
            auth=self.auth,
            params=params,
        )
        result = payload.get("result", [])
        return result if isinstance(result, list) else []

    def get_sla_data(self) -> list[dict[str, Any]]:
        return self._table("task_sla")

    def get_incidents(self) -> list[dict[str, Any]]:
        return self._table("incident")

    def get_changes(self) -> list[dict[str, Any]]:
        return self._table("change_request")

    def get_problems(self) -> list[dict[str, Any]]:
        return self._table("problem")


class DynatraceClient(BaseClient):
    def __init__(self, cfg: IntegrationConfig) -> None:
        super().__init__(cfg)
        self.base_url = cfg.dynatrace_url.rstrip("/")
        self.headers = {"Authorization": f"Api-Token {cfg.dynatrace_token}"}

    def get_availability(self, entity_id: str) -> dict[str, Any]:
        params = {
            "metricSelector": "builtin:host.availability:avg",
            "entitySelector": f"type(HOST),entityId({entity_id})",
            "resolution": "Inf",
        }
        return self.get_json(
            f"{self.base_url}/api/v2/metrics/query",
            headers=self.headers,
            params=params,
        )

    def get_health(self, entity_id: str) -> dict[str, Any]:
        return self.get_json(
            f"{self.base_url}/api/v2/problems",
            headers=self.headers,
            params={"entitySelector": f"entityId({entity_id})", "pageSize": "100"},
        )


class UnifiedDashboardFeed:
    def __init__(self, cfg: IntegrationConfig | None = None) -> None:
        self.cfg = cfg or IntegrationConfig()
        self.cfg.validate()
        self.sn = ServiceNowClient(self.cfg)
        self.dt = DynatraceClient(self.cfg)

    def generate_feed(self, app_id: str = "APP-123") -> dict[str, Any]:
        if self.cfg.mock_mode:
            return self._mock_feed(app_id)

        sla = self.sn.get_sla_data()
        incidents = self.sn.get_incidents()
        changes = self.sn.get_changes()
        problems = self.sn.get_problems()
        availability = self.dt.get_availability(app_id)
        health = self.dt.get_health(app_id)
        return self._normalize_feed(app_id, sla, incidents, changes, problems, availability, health)

    def _normalize_feed(
        self,
        app_id: str,
        sla: list[dict[str, Any]],
        incidents: list[dict[str, Any]],
        changes: list[dict[str, Any]],
        problems: list[dict[str, Any]],
        availability: dict[str, Any],
        health: dict[str, Any],
    ) -> dict[str, Any]:
        completed_slas = [item for item in sla if str(item.get("stage", "")).lower() in {"completed", "closed"}]
        breached_slas = [item for item in completed_slas if str(item.get("has_breached", "false")).lower() == "true"]
        priorities = [str(item.get("priority", "")) for item in incidents]
        resolved = [item for item in incidents if item.get("resolved_at") and item.get("opened_at")]
        mttr_minutes = sum(self._duration_minutes(item["opened_at"], item["resolved_at"]) for item in resolved) / len(resolved) if resolved else None
        return {
            "project": self.cfg.project_id,
            "application": app_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "slaCompliance": round((1 - len(breached_slas) / len(completed_slas)) * 100, 2) if completed_slas else None,
                "p1P2Incidents": sum(priority in {"1", "2", "P1", "P2"} for priority in priorities),
                "mttrMinutes": round(mttr_minutes, 2) if mttr_minutes is not None else None,
                "changeFailureRate": round(sum(str(item.get("state", "")).lower() in {"failed", "canceled"} for item in changes) / len(changes) * 100, 2) if changes else None,
                "openProblems": len([item for item in problems if str(item.get("status", "open")).lower() != "closed"]),
            },
            "sla": sla,
            "incidents": incidents,
            "changes": changes,
            "problems": problems,
            "availability": availability,
            "health": health,
        }

    @staticmethod
    def _duration_minutes(start: str, end: str) -> float:
        start_dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(end.replace("Z", "+00:00"))
        return (end_dt - start_dt).total_seconds() / 60

    def _mock_feed(self, app_id: str) -> dict[str, Any]:
        return {
            "project": self.cfg.project_id,
            "application": app_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "slaCompliance": 96.4,
                "p1P2Incidents": 20,
                "mttrMinutes": 102,
                "changeFailureRate": 5.2,
                "openProblems": 4,
            },
            "sla": [{"type": "Resolution", "compliance": 96.4, "target": 95.0}],
            "incidents": [{"priority": "P2", "count": 17}, {"priority": "P1", "count": 3}],
            "changes": [{"state": "successful", "count": 92}, {"state": "failed", "count": 5}],
            "problems": [{"severity": "high", "count": 2}, {"severity": "medium", "count": 2}],
            "availability": {"availabilityPercent": 99.82, "source": "mock-dynatrace"},
            "health": {"healthPercent": 92, "source": "mock-dynatrace"},
        }


if __name__ == "__main__":
    import json

    print(json.dumps(UnifiedDashboardFeed().generate_feed(), indent=2))
