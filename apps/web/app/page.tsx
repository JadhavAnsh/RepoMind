import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type ServiceStatus = "ok" | "unreachable" | "not_configured"

interface HealthData {
  status: "ok" | "degraded"
  version: string
  timestamp: string
  services: {
    api: ServiceStatus
    db: ServiceStatus
    retrieval: ServiceStatus
  }
}

const SERVICE_STATUSES: readonly string[] = ["ok", "unreachable", "not_configured"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isServiceStatus(value: unknown): value is ServiceStatus {
  return typeof value === "string" && SERVICE_STATUSES.includes(value)
}

function parseHealth(body: unknown): HealthData | null {
  if (!isRecord(body) || body.success !== true || !isRecord(body.data)) {
    return null
  }
  const { status, version, timestamp, services } = body.data
  if (
    (status !== "ok" && status !== "degraded") ||
    typeof version !== "string" ||
    typeof timestamp !== "string" ||
    !isRecord(services) ||
    !isServiceStatus(services.api) ||
    !isServiceStatus(services.db) ||
    !isServiceStatus(services.retrieval)
  ) {
    return null
  }
  return {
    status,
    version,
    timestamp,
    services: {
      api: services.api,
      db: services.db,
      retrieval: services.retrieval,
    },
  }
}

async function fetchHealth(apiUrl: string): Promise<HealthData | null> {
  try {
    const response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/v1/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    return parseHealth(await response.json())
  } catch {
    return null
  }
}

const STATUS_META: Record<
  ServiceStatus,
  { label: string; badge: string; dot: string }
> = {
  ok: {
    label: "Operational",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  unreachable: {
    label: "Unreachable",
    badge: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
  not_configured: {
    label: "Not configured",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        meta.badge
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
      <span className="sr-only"> ({status})</span>
    </span>
  )
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toUTCString()
}

const SERVICE_ROWS = [
  { key: "api", name: "API", description: "NestJS public API" },
  { key: "db", name: "Database", description: "PostgreSQL + pgvector" },
  { key: "retrieval", name: "Retrieval", description: "Python ingestion and retrieval worker" },
] as const

export default async function Page() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  const health = await fetchHealth(apiUrl)

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-lg font-medium">RepoMind system status</h1>
        <p className="text-xs/relaxed text-muted-foreground">
          Live health of the services behind the Organizational Memory Engine.
        </p>
      </header>

      {health ? (
        <>
          <section aria-labelledby="overall-heading">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2 id="overall-heading">
                    {health.status === "ok"
                      ? "All systems operational"
                      : "Degraded: some services need attention"}
                  </h2>
                </CardTitle>
                <CardDescription>
                  API version {health.version} · checked{" "}
                  <time dateTime={health.timestamp}>
                    {formatTimestamp(health.timestamp)}
                  </time>
                </CardDescription>
              </CardHeader>
            </Card>
          </section>

          <section aria-label="Services">
            <ul className="flex flex-col gap-3">
              {SERVICE_ROWS.map((row) => (
                <li key={row.key}>
                  <Card size="sm">
                    <CardContent className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <h3 className="font-heading text-sm font-medium">{row.name}</h3>
                        <p className="text-xs text-muted-foreground">{row.description}</p>
                      </div>
                      <StatusBadge status={health.services[row.key]} />
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <section aria-labelledby="unreachable-heading" role="alert">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 id="unreachable-heading">API unreachable</h2>
              </CardTitle>
              <CardDescription>
                The RepoMind API did not return a valid health response from{" "}
                <code className="font-mono">{apiUrl}</code>. Check that it is
                running, then try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/" className={buttonVariants({ variant: "outline" })}>
                Retry
              </a>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  )
}
