import { useState } from "react";
import "./App.css";

type Module =
  | "Overview"
  | "Applications"
  | "SLA performance"
  | "Incidents & ops";

const navItems: { label: Module; icon: string }[] = [
  { label: "Overview", icon: "O" },
  { label: "Applications", icon: "A" },
  { label: "SLA performance", icon: "S" },
  { label: "Incidents & ops", icon: "I" },
];

const mockDataSources = {
  serviceNow: {
    name: "ServiceNow",
    url: "https://mock-servicenow.local/api/now",
    synced: "4m ago",
  },
  dynatrace: {
    name: "Dynatrace",
    url: "https://mock-dynatrace.local/api/v2",
    synced: "6m ago",
  },
};

const applications = [
  {
    name: "Customer Portal",
    owner: "Digital Experience",
    health: 96,
    sla: 99.4,
    incidents: 0,
    mttr: "42m",
    backlog: 3,
    risk: "Low",
    tone: "green",
  },
  {
    name: "Order Management",
    owner: "Core Commerce",
    health: 88,
    sla: 97.8,
    incidents: 2,
    mttr: "1h 18m",
    backlog: 9,
    risk: "Watch",
    tone: "amber",
  },
  {
    name: "Data Exchange Hub",
    owner: "Integration Services",
    health: 74,
    sla: 94.2,
    incidents: 5,
    mttr: "2h 06m",
    backlog: 21,
    risk: "High",
    tone: "red",
  },
  {
    name: "Finance Ledger",
    owner: "Enterprise Platforms",
    health: 91,
    sla: 98.9,
    incidents: 1,
    mttr: "58m",
    backlog: 6,
    risk: "Low",
    tone: "green",
  },
  {
    name: "People Hub",
    owner: "Workplace Technology",
    health: 94,
    sla: 99.1,
    incidents: 1,
    mttr: "51m",
    backlog: 4,
    risk: "Low",
    tone: "green",
  },
  {
    name: "Supply Chain Planner",
    owner: "Operations Platforms",
    health: 81,
    sla: 96.1,
    incidents: 3,
    mttr: "1h 34m",
    backlog: 12,
    risk: "Watch",
    tone: "amber",
  },
];

const slaRows = [
  ["Response SLA", "98.7%", "99.0%", "-0.3%", "Watch", "amber"],
  ["Resolution SLA", "96.4%", "95.0%", "+1.4%", "On track", "green"],
  ["Availability SLA", "99.82%", "99.90%", "-0.08%", "At risk", "red"],
  ["Change SLA", "94.8%", "95.0%", "-0.2%", "Watch", "amber"],
  ["Problem SLA", "91.2%", "90.0%", "+1.2%", "On track", "green"],
];

function Sparkline({
  values,
  color = "#2c887d",
}: {
  values: number[];
  color?: string;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * 100},${34 - ((value - min) / (max - min || 1)) * 28}`,
    )
    .join(" ");
  return (
    <svg
      className="sparkline"
      viewBox="0 0 100 38"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusPill({
  children,
  tone = "green",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`status-pill ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  detail,
  values,
  tone = "green",
}: {
  label: string;
  value: string;
  delta: string;
  detail: string;
  values: number[];
  tone?: string;
}) {
  return (
    <article className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        <span className={`delta ${tone}`}>{delta}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-bottom">
        <span>{detail}</span>
        <Sparkline
          values={values}
          color={
            tone === "red"
              ? "#c95b52"
              : tone === "amber"
                ? "#b8843c"
                : "#2c887d"
          }
        />
      </div>
    </article>
  );
}

function TrendChart() {
  const bars = [73, 78, 75, 82, 79, 86, 88, 84, 91, 89, 94, 96];
  return (
    <div className="trend-chart">
      <div className="chart-axis">
        <span>100%</span>
        <span>95%</span>
        <span>90%</span>
        <span>85%</span>
      </div>
      <div className="chart-bars">
        {bars.map((bar, index) => (
          <div className="bar-group" key={index}>
            <div className="bar-track">
              <div className="bar" style={{ height: `${bar - 70}%` }} />
            </div>
            <span>
              {
                ["O", "N", "D", "J", "F", "M", "A", "M", "J", "J", "A", "S"][
                  index
                ]
              }
            </span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot teal" />
          SLA compliance
        </span>
        <span>
          <i className="legend-dot coral" />
          Target 95%
        </span>
      </div>
    </div>
  );
}

function Insight({
  priority,
  title,
  text,
  tone,
}: {
  priority: string;
  title: string;
  text: string;
  tone: string;
}) {
  return (
    <div className={`insight ${tone}`}>
      <div className="insight-priority">{priority}</div>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <button className="arrow-button" aria-label={`Open ${title}`}>
        {"->"}
      </button>
    </div>
  );
}

function Overview() {
  return (
    <>
      <section className="hero-row">
        <div>
          <p className="eyebrow">PROGRAM CONTROL CENTER / SEPTEMBER 2026</p>
          <h1>Enterprise service health</h1>
          <p className="hero-copy">
            A decision-ready view of reliability, customer experience, and the
            work that needs leadership attention.
          </p>
        </div>
        <div className="health-orbit">
          <div className="orbit-ring">
            <span>92</span>
            <small>HEALTH SCORE</small>
          </div>
          <div className="orbit-label">
            <span className="status-dot" />
            Healthy, with 2 watch items
          </div>
        </div>
      </section>
      <section className="kpi-grid">
        <KpiCard
          label="Application availability"
          value="98.82%"
          delta="+0.14%"
          detail="vs. last month"
          values={[98, 98, 99, 98, 99, 99, 100, 99, 99, 100]}
        />
        <KpiCard
          label="SLA compliance"
          value="96.4%"
          delta="+1.8%"
          detail="vs. last month"
          values={[93, 94, 94, 95, 94, 96, 95, 97, 96, 96]}
        />
        <KpiCard
          label="P1 / P2 incidents"
          value="03 / 17"
          delta="-22%"
          detail="rolling 30 days"
          values={[30, 27, 31, 26, 28, 21, 23, 19, 20, 17]}
          tone="green"
        />
        <KpiCard
          label="Mean time to restore"
          value="1h 42m"
          delta="-18m"
          detail="vs. last month"
          values={[152, 145, 148, 138, 142, 135, 128, 119, 112, 102]}
        />
      </section>
      <section className="main-grid">
        <article className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SERVICE LEVEL TRAJECTORY</p>
              <h2>Program SLA performance</h2>
            </div>
            <div className="segmented">
              <button className="active">12 months</button>
              <button>6 months</button>
              <button>3 months</button>
            </div>
          </div>
          <TrendChart />
        </article>
        <article className="panel insights-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SIGNAL / RESPONSE</p>
              <h2>Executive insights</h2>
            </div>
            <span className="live-label">
              <span className="status-dot" />
              Live
            </span>
          </div>
          <div className="insights-list">
            <Insight
              priority="01"
              title="Data Exchange Hub needs attention"
              text="SLA compliance is 94.2%, with 21 aged tickets and a rising repeat cluster."
              tone="red"
            />
            <Insight
              priority="02"
              title="Availability recovered this week"
              text="A 0.6pt drop on Sep 12 was resolved in 42 minutes. No customer impact remains."
              tone="teal"
            />
            <Insight
              priority="03"
              title="Change quality is improving"
              text="Failed changes are down 16% month-on-month after CAB guardrail updates."
              tone="amber"
            />
          </div>
          <button className="text-button">
            View all signals <span>{"->"}</span>
          </button>
        </article>
      </section>
      <section className="lower-grid">
        <article className="panel app-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">APPLICATION PORTFOLIO</p>
              <h2>Health by application</h2>
            </div>
            <button className="text-button">
              Open scorecards <span>{"->"}</span>
            </button>
          </div>
          <div className="app-table">
            <div className="table-head">
              <span>Application</span>
              <span>Health</span>
              <span>SLA</span>
              <span>P1/P2</span>
              <span>Risk</span>
            </div>
            {applications.map((app) => (
              <div className="table-row" key={app.name}>
                <div className="app-name">
                  <span className={`app-mark ${app.tone}`}>
                    {app.name.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{app.name}</strong>
                    <small>{app.owner}</small>
                  </span>
                </div>
                <span className="health-value">
                  <b>{app.health}</b>%
                </span>
                <span>{app.sla}%</span>
                <span>{app.incidents}</span>
                <StatusPill tone={app.tone}>{app.risk}</StatusPill>
              </div>
            ))}
          </div>
        </article>
        <article className="panel risk-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">RISK REGISTER</p>
              <h2>Current exposure</h2>
            </div>
            <span className="risk-count">2 open</span>
          </div>
          <div className="risk-map">
            <div className="risk-grid">
              {[
                "low",
                "low",
                "watch",
                "low",
                "watch",
                "high",
                "low",
                "watch",
                "high",
              ].map((level, i) => (
                <div key={i} className={`risk-cell ${level}`}>
                  <span>{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="risk-labels">
              <span>Impact</span>
              <div>
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>
          </div>
          <div className="risk-items">
            <div>
              <span className="risk-marker high" />
              <span>
                <strong>Integration latency</strong>
                <small>Data Exchange Hub / 5 days open</small>
              </span>
              <b>High</b>
            </div>
            <div>
              <span className="risk-marker watch" />
              <span>
                <strong>Capacity threshold</strong>
                <small>Order Management / 18 days to breach</small>
              </span>
              <b>Watch</b>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function Applications() {
  return (
    <section className="module-view">
      <div className="module-title">
        <div>
          <p className="eyebrow">APPLICATION HEALTH / SCORECARDS</p>
          <h1>Application portfolio</h1>
          <p>
            Compare operational health, service levels, and exposure across the
            enterprise estate.
          </p>
        </div>
        <button className="primary-button">Export scorecards</button>
      </div>
      <div className="app-card-grid">
        {applications.map((app) => (
          <article className="scorecard panel" key={app.name}>
            <div className="scorecard-head">
              <div className={`app-mark large ${app.tone}`}>
                {app.name.slice(0, 1)}
              </div>
              <StatusPill tone={app.tone}>{app.risk} risk</StatusPill>
            </div>
            <h2>{app.name}</h2>
            <p className="muted">{app.owner}</p>
            <div className="score-row">
              <div>
                <span>Health</span>
                <strong>{app.health}%</strong>
              </div>
              <div>
                <span>SLA</span>
                <strong>{app.sla}%</strong>
              </div>
            </div>
            <div className="score-bar">
              <i style={{ width: `${app.health}%` }} />
            </div>
            <div className="scorecard-footer">
              <span>{app.incidents} P1/P2 incidents</span>
              <span>{app.mttr} MTTR</span>
              <span>{app.backlog} aged</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SlaPerformance() {
  return (
    <section className="module-view">
      <div className="module-title">
        <div>
          <p className="eyebrow">SERVICE LEVEL MANAGEMENT / FORECAST</p>
          <h1>SLA performance</h1>
          <p>
            Track contractual commitments and focus intervention where the next
            quarter is most exposed.
          </p>
        </div>
        <StatusPill>Data refreshed 4 min ago</StatusPill>
      </div>
      <div className="sla-summary">
        <div className="sla-score">
          <span>Composite SLA</span>
          <strong>96.4%</strong>
          <small>+1.8% vs last month</small>
        </div>
        <div className="forecast">
          <span className="eyebrow">NEXT QUARTER FORECAST</span>
          <strong>97.1%</strong>
          <p>Expected to clear target if open risks close by Oct 14.</p>
        </div>
      </div>
      <article className="panel sla-table">
        <div className="table-head">
          <span>Service level</span>
          <span>Actual</span>
          <span>Target</span>
          <span>Variance</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {slaRows.map((row) => (
          <div className="table-row" key={row[0]}>
            <strong>{row[0]}</strong>
            <span>{row[1]}</span>
            <span>{row[2]}</span>
            <span className={row[5] === "red" ? "negative" : "positive"}>
              {row[3]}
            </span>
            <StatusPill tone={row[5]}>{row[4]}</StatusPill>
            <button className="row-action">Review {"->"}</button>
          </div>
        ))}
      </article>
    </section>
  );
}

function IncidentsOps() {
  return (
    <section className="module-view">
      <div className="module-title">
        <div>
          <p className="eyebrow">OPERATIONS / SIGNAL ANALYSIS</p>
          <h1>Incidents & operations</h1>
          <p>
            Understand what is driving demand, where patterns repeat, and what
            to automate next.
          </p>
        </div>
        <button className="filter-button">
          Last 30 days <span>⌄</span>
        </button>
      </div>
      <div className="ops-grid">
        <article className="panel ops-chart">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SEVERITY TREND</p>
              <h2>P1 / P2 incidents</h2>
            </div>
            <span className="metric-large">
              20 <small>this month</small>
            </span>
          </div>
          <div className="line-chart">
            <div className="line-grid">
              <span>30</span>
              <span>20</span>
              <span>10</span>
              <span>0</span>
            </div>
            <svg viewBox="0 0 500 150" preserveAspectRatio="none">
              <polyline
                points="0,35 42,52 84,48 126,78 168,70 210,95 252,88 294,108 336,100 378,118 420,111 500,128"
                fill="none"
                stroke="#c95b52"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </article>
        <article className="panel cause-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DRIVERS</p>
              <h2>Root cause categories</h2>
            </div>
          </div>
          <div className="cause-list">
            <div>
              <span>Application defect</span>
              <b>38%</b>
              <i>
                <em style={{ width: "38%" }} />
              </i>
            </div>
            <div>
              <span>Infrastructure</span>
              <b>27%</b>
              <i>
                <em style={{ width: "27%" }} />
              </i>
            </div>
            <div>
              <span>Change related</span>
              <b>21%</b>
              <i>
                <em style={{ width: "21%" }} />
              </i>
            </div>
            <div>
              <span>Access / data</span>
              <b>14%</b>
              <i>
                <em style={{ width: "14%" }} />
              </i>
            </div>
          </div>
          <div className="automation-callout">
            <strong>6 automation opportunities</strong>
            <span>could remove 14% of recurring demand</span>
          </div>
        </article>
      </div>
    </section>
  );
}

function App() {
  const [activeModule, setActiveModule] = useState<Module>("Overview");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">+</div>
          <span>
            northstar<small>service intelligence</small>
          </span>
        </div>
        <div className="workspace-switch">
          <span className="workspace-dot" />
          Enterprise IT <span className="chevron">⌄</span>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              className={
                activeModule === item.label ? "nav-item active" : "nav-item"
              }
              onClick={() => setActiveModule(item.label)}
              key={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="source-status">
            <div className="source-head">
              <span>Data sources</span>
              <span className="status-dot" />
            </div>
            <div>
              <b>{mockDataSources.serviceNow.name}</b>
              <small title={mockDataSources.serviceNow.url}>
                Mock / {mockDataSources.serviceNow.synced}
              </small>
            </div>
            <div>
              <b>{mockDataSources.dynatrace.name}</b>
              <small title={mockDataSources.dynatrace.url}>
                Mock / {mockDataSources.dynatrace.synced}
              </small>
            </div>
          </div>
          <button className="nav-item">
            <span className="nav-icon">?</span>Help & documentation
          </button>
          <div className="profile">
            <div className="avatar">RK</div>
            <div>
              <strong>Riya Kulkarni</strong>
              <small>Program director</small>
            </div>
            <span>⋮</span>
          </div>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Programs</span>
            <b>/</b>
            <strong>Enterprise service health</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Search">
              ⌕
            </button>
            <button
              className="icon-button notification"
              aria-label="Notifications"
            >
              ◌<i />
            </button>
            <button className="date-button">
              Sep 21, 2026 <span>⌄</span>
            </button>
          </div>
        </header>
        <div className="page-content">
          {activeModule === "Overview" && <Overview />}
          {activeModule === "Applications" && <Applications />}
          {activeModule === "SLA performance" && <SlaPerformance />}
          {activeModule === "Incidents & ops" && <IncidentsOps />}
        </div>
      </main>
    </div>
  );
}

export default App;
