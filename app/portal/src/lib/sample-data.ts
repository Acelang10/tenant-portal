// Static sample data for the dashboard. Nothing here comes from the API.

export type Stat = { label: string; value: string; change: string; up: boolean };
export type Project = {
  name: string;
  owner: string;
  status: "On track" | "At risk" | "Done";
  progress: number;
};
export type Activity = { who: string; what: string; when: string };

export type DashboardData = {
  plan: string;
  stats: Stat[];
  projects: Project[];
  activity: Activity[];
  pendingInvites: number;
  seats: { used: number; total: number };
};

const data: Record<string, DashboardData> = {
  acme: {
    plan: "Enterprise",
    stats: [
      { label: "Active users", value: "1,284", change: "+8.2%", up: true },
      { label: "Monthly revenue", value: "$48,320", change: "+4.1%", up: true },
      { label: "Open tickets", value: "37", change: "-12%", up: false },
      { label: "Uptime", value: "99.98%", change: "+0.01%", up: true },
    ],
    projects: [
      { name: "Rocket skates v2", owner: "Alice Anderson", status: "On track", progress: 72 },
      { name: "Anvil supply chain", owner: "Bob Brown", status: "At risk", progress: 41 },
      { name: "Catalog redesign", owner: "Alice Anderson", status: "Done", progress: 100 },
    ],
    activity: [
      { who: "Alice Anderson", what: "approved the Q4 budget", when: "12m ago" },
      { who: "Bob Brown", what: "commented on Anvil supply chain", when: "1h ago" },
      { who: "System", what: "completed the nightly backup", when: "6h ago" },
    ],
    pendingInvites: 3,
    seats: { used: 42, total: 50 },
  },
  globex: {
    plan: "Business",
    stats: [
      { label: "Active users", value: "642", change: "+3.4%", up: true },
      { label: "Monthly revenue", value: "$21,900", change: "-1.8%", up: false },
      { label: "Open tickets", value: "14", change: "-5%", up: false },
      { label: "Uptime", value: "99.91%", change: "-0.03%", up: false },
    ],
    projects: [
      { name: "Hammock district rollout", owner: "Alice Anderson", status: "On track", progress: 58 },
      { name: "Data center migration", owner: "Carol Clark", status: "On track", progress: 33 },
    ],
    activity: [
      { who: "Carol Clark", what: "uploaded the migration runbook", when: "25m ago" },
      { who: "Alice Anderson", what: "invited 2 new members", when: "3h ago" },
      { who: "System", what: "rotated API keys", when: "1d ago" },
    ],
    pendingInvites: 2,
    seats: { used: 18, total: 25 },
  },
  initech: {
    plan: "Starter",
    stats: [
      { label: "Active users", value: "211", change: "+0.9%", up: true },
      { label: "Monthly revenue", value: "$6,450", change: "+2.2%", up: true },
      { label: "Open tickets", value: "52", change: "+18%", up: true },
      { label: "Uptime", value: "99.72%", change: "-0.10%", up: false },
    ],
    projects: [
      { name: "TPS report automation", owner: "Bob Brown", status: "At risk", progress: 24 },
      { name: "Stapler inventory", owner: "Carol Clark", status: "Done", progress: 100 },
    ],
    activity: [
      { who: "Bob Brown", what: "reassigned 6 tickets", when: "5m ago" },
      { who: "Carol Clark", what: "closed Stapler inventory", when: "2h ago" },
      { who: "System", what: "flagged 3 overdue invoices", when: "9h ago" },
    ],
    pendingInvites: 0,
    seats: { used: 9, total: 10 },
  },
};

const fallback: DashboardData = {
  plan: "Business",
  stats: [
    { label: "Active users", value: "418", change: "+5.0%", up: true },
    { label: "Monthly revenue", value: "$12,780", change: "+1.3%", up: true },
    { label: "Open tickets", value: "21", change: "-7%", up: false },
    { label: "Uptime", value: "99.95%", change: "+0.02%", up: true },
  ],
  projects: [
    { name: "Customer onboarding", owner: "Operations", status: "On track", progress: 64 },
    { name: "Security audit", owner: "IT", status: "At risk", progress: 38 },
    { name: "Website refresh", owner: "Marketing", status: "Done", progress: 100 },
  ],
  activity: [
    { who: "Operations", what: "published the weekly report", when: "40m ago" },
    { who: "IT", what: "enabled SSO enforcement", when: "4h ago" },
    { who: "System", what: "completed the nightly backup", when: "8h ago" },
  ],
  pendingInvites: 1,
  seats: { used: 12, total: 20 },
};

export function getDashboardData(tenantSlug: string): DashboardData {
  return data[tenantSlug] ?? fallback;
}
