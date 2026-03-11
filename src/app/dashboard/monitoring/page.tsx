"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Activity, Link2, Loader2, Info } from "lucide-react"
import { getSites, type Site } from "@/lib/firebase/sites"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type UptimeMonitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
  all_time_uptime_ratio?: string;
};

type MonitoringLog = {
  id: string;
  siteName: string;
  siteUrl: string;
  status: string;
  issues?: string[];
  responseTimeMs?: number;
  sslValid?: boolean;
  wpVersion?: string | null;
  checkedAt?: { seconds?: number; _seconds?: number; toDate?: () => Date } | string;
};

function normalizeUrl(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`
    return new URL(u).href.replace(/\/$/, "").toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
})
const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
})

function parseCheckedAt(checkedAt: MonitoringLog["checkedAt"]): Date | null {
  if (!checkedAt) return null
  try {
    if (typeof checkedAt === "object" && checkedAt !== null && "toDate" in checkedAt) {
      return (checkedAt as { toDate: () => Date }).toDate()
    }
    const sec = typeof checkedAt === "object" && checkedAt !== null
      ? (checkedAt as { seconds?: number; _seconds?: number }).seconds ?? (checkedAt as { seconds?: number; _seconds?: number })._seconds
      : undefined
    if (typeof sec === "number") return new Date(sec * 1000)
    const parsed = new Date(String(checkedAt))
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

function getCheckedAtParts(checkedAt: MonitoringLog["checkedAt"]): { dateStr: string; timeStr: string } | null {
  const date = parseCheckedAt(checkedAt)
  if (!date) return null
  return { dateStr: dateFormat.format(date), timeStr: timeFormat.format(date) }
}

function formatCheckedAt(checkedAt: MonitoringLog["checkedAt"]): string {
  const parts = getCheckedAtParts(checkedAt)
  return parts ? `${parts.dateStr}, ${parts.timeStr}h` : "—"
}

export default function MonitoringPage() {
  const [running, setRunning] = useState(false)
  const [uptimeMonitors, setUptimeMonitors] = useState<UptimeMonitor[]>([])
  const [uptimeError, setUptimeError] = useState<string | null>(null)
  const [monitoringLogs, setMonitoringLogs] = useState<MonitoringLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [lastRunResults, setLastRunResults] = useState<Array<{
    siteId?: string
    name: string
    url: string
    status: string
    issues?: string[]
    responseTimeMs?: number | null
    sslValid?: boolean | null
    wpVersion?: string | null
  }>>([])
  const [artnaSites, setArtnaSites] = useState<Site[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)
  const [sitesInPreparing, setSitesInPreparing] = useState<Set<string>>(new Set())
  const [resultModal, setResultModal] = useState<{
    open: boolean
    title: string
    message: string
    variant: "success" | "warning" | "error"
  }>({ open: false, title: "", message: "", variant: "success" })

  const loadMonitoringLogs = () => {
    setLogsLoading(true)
    setLogsError(null)
    fetch("/api/cron/monitoring")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setLogsError(data.error)
          setMonitoringLogs([])
        } else {
          setMonitoringLogs(data.logs || [])
        }
      })
      .catch(() => {
        setLogsError("Não foi possível carregar os resultados.")
        setMonitoringLogs([])
      })
      .finally(() => setLogsLoading(false))
  }

  useEffect(() => {
    loadMonitoringLogs()
  }, [])

  useEffect(() => {
    getSites().then(setArtnaSites).catch(() => setArtnaSites([]))
  }, [])

  const fetchUptimeMonitors = () => {
    fetch("/api/integrations/uptimerobot")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setUptimeError(data.error)
        else setUptimeMonitors(data.monitors || [])
      })
      .catch(() => setUptimeError("Não foi possível carregar"))
  }

  useEffect(() => {
    fetchUptimeMonitors()
  }, [])

  const hasPreparingMonitor = uptimeMonitors.some((m) => m.status === 1)
  useEffect(() => {
    if (!hasPreparingMonitor) return
    const interval = setInterval(fetchUptimeMonitors, 15000)
    return () => clearInterval(interval)
  }, [hasPreparingMonitor])

  const handleRunChecks = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/cron/monitoring", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Check failed")
      if (data.results?.length === 0 && data.message?.includes("No sites")) {
        setResultModal({
          open: true,
          title: "Nenhum site para monitorar",
          message: "Adicione sites em Sites para poder executar as verificações.",
          variant: "warning",
        })
      } else {
        setLastRunResults(data.results || [])
        setResultModal({
          open: true,
          title: "Verificações concluídas",
          message: `${data.results?.length ?? 0} site(s) foram verificados. Os resultados aparecem na tabela acima.`,
          variant: "success",
        })
      }
      loadMonitoringLogs()
      setTimeout(loadMonitoringLogs, 2000)
    } catch (error) {
      console.error("Monitoring error:", error)
      setResultModal({
        open: true,
        title: "Falha ao executar verificações",
        message: "Verifique se o Firebase Admin está configurado (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) na Vercel ou no .env.local.",
        variant: "error",
      })
    } finally {
      setRunning(false)
    }
  }

  const latestBySite = monitoringLogs.reduce<MonitoringLog[]>((acc, log) => {
    if (!acc.some((l) => l.siteUrl === log.siteUrl)) acc.push(log)
    return acc
  }, [])

  const displayLogs: MonitoringLog[] =
    latestBySite.length > 0
      ? latestBySite
      : lastRunResults.map((r, i) => ({
          id: `run-${i}`,
          siteName: r.name,
          siteUrl: r.url,
          status: r.status,
          issues: r.issues,
          responseTimeMs: r.responseTimeMs ?? undefined,
          sslValid: r.sslValid ?? undefined,
          wpVersion: r.wpVersion ?? undefined,
          checkedAt: { seconds: Math.floor(Date.now() / 1000) },
        }))

  const healthyCount = displayLogs.filter((l) => l.status === "Healthy").length
  const warningCount = displayLogs.filter((l) => l.status === "Warning").length
  const criticalCount = displayLogs.filter((l) => l.status === "Critical").length
  const lastCheckParts =
    displayLogs.length > 0 && displayLogs[0]?.checkedAt
      ? getCheckedAtParts(displayLogs[0].checkedAt)
      : null

  const statusLabel = (status: number) => {
    switch (status) {
      case 0: return "Pausado"
      case 1: return "Preparando"
      case 2: return "Online"
      case 8: return "Possível instabilidade"
      case 9: return "Offline"
      default: return "Desconhecido"
    }
  }

  const statusColor = (status: number) => {
    if (status === 2) return "text-emerald-600 bg-emerald-50 border-emerald-200"
    if (status === 1) return "text-amber-600 bg-amber-50 border-amber-200"
    if (status === 8 || status === 9) return "text-rose-600 bg-rose-50 border-rose-200"
    return "text-slate-600 bg-slate-50 border-slate-200"
  }

  const monitorsByUrl = new Map(uptimeMonitors.map((m) => [normalizeUrl(m.url), m]))
  const syncedSites = artnaSites.filter(
    (s) => monitorsByUrl.has(normalizeUrl(s.url)) || (s.id != null && sitesInPreparing.has(s.id))
  )
  const unsyncedSites = artnaSites.filter(
    (s) => !monitorsByUrl.has(normalizeUrl(s.url)) && !(s.id != null && sitesInPreparing.has(s.id))
  )

  const handleSyncSite = async (site: Site) => {
    if (!site.id) return
    setSyncing(site.id)
    setSitesInPreparing((prev) => new Set(prev).add(site.id))
    try {
      const res = await fetch("/api/integrations/uptimerobot/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: site.name, url: site.url }),
      })
      const data = await res.json()
      if (data.monitorId) {
        const { updateSite } = await import("@/lib/firebase/sites")
        await updateSite(site.id, { uptimerobotMonitorId: data.monitorId })
        setArtnaSites((prev) =>
          prev.map((s) => (s.id === site.id ? { ...s, uptimerobotMonitorId: data.monitorId } : s))
        )
        const urRes = await fetch("/api/integrations/uptimerobot")
        const urData = await urRes.json()
        if (!urData.error) setUptimeMonitors(urData.monitors || [])
        setSitesInPreparing((prev) => {
          const next = new Set(prev)
          next.delete(site.id!)
          return next
        })
      } else if (data.error) {
        setSitesInPreparing((prev) => {
          const next = new Set(prev)
          next.delete(site.id!)
          return next
        })
        setResultModal({
          open: true,
          title: "Erro ao sincronizar",
          message: data.error,
          variant: "error",
        })
      }
    } catch (e) {
      setSitesInPreparing((prev) => {
        const next = new Set(prev)
        next.delete(site.id!)
        return next
      })
      setResultModal({
        open: true,
        title: "Erro ao sincronizar",
        message: "Falha ao sincronizar com UptimeRobot.",
        variant: "error",
      })
    } finally {
      setSyncing(null)
    }
  }

  const handleSyncAll = async () => {
    for (const site of unsyncedSites) {
      await handleSyncSite(site)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Monitoramento</h2>
          <p className="text-muted-foreground">Execute verificações de saúde e visualize o status de monitoramento de todos os sites.</p>
        </div>
        <Button onClick={handleRunChecks} disabled={running}>
          {running ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Executando…
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Executar todas as verificações
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards - baseados nos sites cadastrados na ArtnaCare */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="py-3">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : healthyCount}</p>
              <p className="text-xs text-muted-foreground">Saudáveis</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : warningCount}</p>
              <p className="text-xs text-muted-foreground">Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : criticalCount}</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground shrink-0" />
            <div>
              <p className="text-2xl font-bold">
                {logsLoading ? "—" : lastCheckParts ? (
                  <>
                    {lastCheckParts.dateStr},{" "}
                    <span className="text-base font-normal">{lastCheckParts.timeStr}h</span>
                  </>
                ) : displayLogs.length > 0 ? "Agora" : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Última verificação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultados dos sites cadastrados na ArtnaCare */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados mais recentes</CardTitle>
          <CardDescription>
            Sites cadastrados na ArtnaCare (menu Sites). Execute as verificações para atualizar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tempo de resposta</TableHead>
                <TableHead>SSL</TableHead>
                <TableHead>Versão do WP</TableHead>
                <TableHead>Última checagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : logsError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-amber-600">
                    {logsError} Configure FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local.
                  </TableCell>
                </TableRow>
              ) : displayLogs.length > 0 ? (
                displayLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.siteName}</p>
                        <p className="text-xs text-muted-foreground">{log.siteUrl}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === "Healthy"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.status === "Warning"
                                ? "bg-amber-100 text-amber-800"
                                : log.status === "Critical"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {log.status === "Healthy"
                            ? "Saudável"
                            : log.status === "Warning"
                              ? "Aviso"
                              : log.status === "Critical"
                                ? "Crítico"
                                : log.status === "Unknown"
                                  ? "Desconhecido"
                                  : log.status === "Error"
                                    ? "Erro"
                                    : log.status}
                        </span>
                        {(log.status === "Warning" || log.status === "Critical") && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Ver detalhes do aviso"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 sm:w-80" align="start">
                              <p className="font-medium text-sm mb-2">Detalhes do aviso/crítico</p>
                              {log.issues && log.issues.length > 0 ? (
                                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                  {log.issues.map((issue, i) => (
                                    <li key={i}>{issue}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-sm text-muted-foreground">Execute as verificações novamente para obter os detalhes.</p>
                              )}
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{log.responseTimeMs != null ? `${log.responseTimeMs} ms` : "—"}</TableCell>
                    <TableCell>{log.sslValid === true ? "Válido" : log.sslValid === false ? "Inválido" : "—"}</TableCell>
                    <TableCell>{log.wpVersion ?? "—"}</TableCell>
                    <TableCell>
                      {(() => {
                        const parts = getCheckedAtParts(log.checkedAt)
                        return parts ? (
                          <>
                            {parts.dateStr},{" "}
                            <span className="text-xs">{parts.timeStr}h</span>
                          </>
                        ) : (
                          "—"
                        )
                      })()}
                    </TableCell>
                  </TableRow>
                ))
              ) : artnaSites.length > 0 ? (
                artnaSites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{site.name}</p>
                        <p className="text-xs text-muted-foreground">{site.url}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-800">
                        Pendente
                      </span>
                    </TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum site cadastrado. Adicione sites em Sites e clique em &ldquo;Executar todas as verificações&rdquo;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monitores UptimeRobot - apenas sites cadastrados na ArtnaCare */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Monitores UptimeRobot
              </CardTitle>
              <CardDescription>
                Apenas sites cadastrados na ArtnaCare. Novos sites são cadastrados automaticamente no UptimeRobot.
              </CardDescription>
            </div>
            {unsyncedSites.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={!!syncing}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Sincronizar {unsyncedSites.length} site(s)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {uptimeError ? (
            <p className="text-sm text-amber-600 py-4">{uptimeError}</p>
          ) : artnaSites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum site cadastrado. Adicione sites em Sites.</p>
          ) : (
            <div className="space-y-3">
              {syncedSites.map((site) => {
                const monitor = monitorsByUrl.get(normalizeUrl(site.url))
                const isPreparing =
                  (site.id != null && sitesInPreparing.has(site.id) && !monitor) ||
                  (monitor?.status === 1)
                const displayStatus = isPreparing ? 1 : monitor?.status ?? 1
                return (
                  <div
                    key={site.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-sm text-muted-foreground">{site.url}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {!isPreparing && monitor?.all_time_uptime_ratio != null && (
                        <span className="text-sm text-muted-foreground">
                          Uptime: {parseFloat(monitor.all_time_uptime_ratio).toFixed(2)}%
                        </span>
                      )}
                      {isPreparing && (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" aria-hidden />
                      )}
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${statusColor(displayStatus)}`}>
                        {statusLabel(displayStatus)}
                      </span>
                    </div>
                  </div>
                )
              })}
              {unsyncedSites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30 border-dashed"
                >
                  <div>
                    <p className="font-medium">{site.name}</p>
                    <p className="text-sm text-muted-foreground">{site.url}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Não sincronizado</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncSite(site)}
                      disabled={!!syncing}
                    >
                      <Link2 className="mr-2 h-4 w-4" />
                      Sincronizar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={resultModal.open}
        onOpenChange={(open) => setResultModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultModal.variant === "success" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
              {resultModal.variant === "warning" && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {resultModal.variant === "error" && <XCircle className="h-5 w-5 text-rose-600" />}
              {resultModal.title}
            </DialogTitle>
            <DialogDescription>{resultModal.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton={false}>
            <Button
              onClick={() => setResultModal((prev) => ({ ...prev, open: false }))}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
