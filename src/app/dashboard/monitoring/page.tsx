"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Activity, Link2 } from "lucide-react"
import { getSites, type Site } from "@/lib/firebase/sites"

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
  responseTimeMs?: number;
  sslValid?: boolean;
  wpVersion?: string | null;
  checkedAt?: { seconds?: number; toDate?: () => Date } | string;
};

function normalizeUrl(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`
    return new URL(u).href.replace(/\/$/, "").toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

function formatCheckedAt(checkedAt: MonitoringLog["checkedAt"]): string {
  if (!checkedAt) return "—"
  try {
    const date = typeof checkedAt === "object" && checkedAt !== null && "toDate" in checkedAt
      ? (checkedAt as { toDate: () => Date }).toDate()
      : typeof checkedAt === "object" && checkedAt !== null && "seconds" in checkedAt
        ? new Date((checkedAt as { seconds: number }).seconds * 1000)
        : new Date(String(checkedAt))
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)
  } catch {
    return "—"
  }
}

export default function MonitoringPage() {
  const [running, setRunning] = useState(false)
  const [uptimeMonitors, setUptimeMonitors] = useState<UptimeMonitor[]>([])
  const [uptimeError, setUptimeError] = useState<string | null>(null)
  const [monitoringLogs, setMonitoringLogs] = useState<MonitoringLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [artnaSites, setArtnaSites] = useState<Site[]>([])
  const [syncing, setSyncing] = useState<string | null>(null)

  const loadMonitoringLogs = () => {
    setLogsLoading(true)
    fetch("/api/cron/monitoring")
      .then((res) => res.json())
      .then((data) => {
        setMonitoringLogs(data.logs || [])
      })
      .catch(() => setMonitoringLogs([]))
      .finally(() => setLogsLoading(false))
  }

  useEffect(() => {
    loadMonitoringLogs()
  }, [])

  useEffect(() => {
    getSites().then(setArtnaSites).catch(() => setArtnaSites([]))
  }, [])

  useEffect(() => {
    fetch("/api/integrations/uptimerobot")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setUptimeError(data.error)
        else setUptimeMonitors(data.monitors || [])
      })
      .catch(() => setUptimeError("Não foi possível carregar"))
  }, [])

  const handleRunChecks = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/cron/monitoring", { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Check failed")
      if (data.results?.length === 0 && data.message?.includes("No sites")) {
        alert("Nenhum site cadastrado na ArtnaCare. Adicione sites em Sites para monitorar.")
      } else {
        alert(`Verificações concluídas! ${data.results?.length ?? 0} site(s) verificados.`)
      }
      loadMonitoringLogs()
    } catch (error) {
      console.error("Monitoring error:", error)
      alert("Falha ao executar verificações. Verifique se o Firebase Admin está configurado (FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).")
    } finally {
      setRunning(false)
    }
  }

  const latestBySite = monitoringLogs.reduce<MonitoringLog[]>((acc, log) => {
    if (!acc.some((l) => l.siteUrl === log.siteUrl)) acc.push(log)
    return acc
  }, [])

  const healthyCount = latestBySite.filter((l) => l.status === "Healthy").length
  const warningCount = latestBySite.filter((l) => l.status === "Warning").length
  const criticalCount = latestBySite.filter((l) => l.status === "Critical").length
  const lastCheck = monitoringLogs[0] ? formatCheckedAt(monitoringLogs[0].checkedAt) : "—"

  const statusLabel = (status: number) => {
    switch (status) {
      case 0: return "Pausado"
      case 1: return "Não verificado"
      case 2: return "Online"
      case 8: return "Possível instabilidade"
      case 9: return "Offline"
      default: return "Desconhecido"
    }
  }

  const statusColor = (status: number) => {
    if (status === 2) return "text-emerald-600 bg-emerald-50 border-emerald-200"
    if (status === 8 || status === 9) return "text-rose-600 bg-rose-50 border-rose-200"
    return "text-slate-600 bg-slate-50 border-slate-200"
  }

  const monitorsByUrl = new Map(uptimeMonitors.map((m) => [normalizeUrl(m.url), m]))
  const syncedSites = artnaSites.filter((s) => monitorsByUrl.has(normalizeUrl(s.url)))
  const unsyncedSites = artnaSites.filter((s) => !monitorsByUrl.has(normalizeUrl(s.url)))

  const handleSyncSite = async (site: Site) => {
    setSyncing(site.id || null)
    try {
      const res = await fetch("/api/integrations/uptimerobot/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: site.name, url: site.url }),
      })
      const data = await res.json()
      if (data.monitorId && site.id) {
        const { updateSite } = await import("@/lib/firebase/sites")
        await updateSite(site.id, { uptimerobotMonitorId: data.monitorId })
        setArtnaSites((prev) =>
          prev.map((s) => (s.id === site.id ? { ...s, uptimerobotMonitorId: data.monitorId } : s))
        )
        const urRes = await fetch("/api/integrations/uptimerobot")
        const urData = await urRes.json()
        if (!urData.error) setUptimeMonitors(urData.monitors || [])
      } else if (data.error) {
        alert(data.error)
      }
    } catch (e) {
      alert("Falha ao sincronizar com UptimeRobot")
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
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : healthyCount}</p>
              <p className="text-xs text-muted-foreground">Saudáveis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : warningCount}</p>
              <p className="text-xs text-muted-foreground">Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : criticalCount}</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : lastCheck}</p>
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
              ) : latestBySite.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum resultado ainda. Clique em &ldquo;Executar todas as verificações&rdquo; para monitorar os sites cadastrados em Sites.
                  </TableCell>
                </TableRow>
              ) : (
                latestBySite.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.siteName}</p>
                        <p className="text-xs text-muted-foreground">{log.siteUrl}</p>
                      </div>
                    </TableCell>
                    <TableCell>
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
                              : log.status}
                      </span>
                    </TableCell>
                    <TableCell>{log.responseTimeMs != null ? `${log.responseTimeMs} ms` : "—"}</TableCell>
                    <TableCell>{log.sslValid === true ? "Válido" : log.sslValid === false ? "Inválido" : "—"}</TableCell>
                    <TableCell>{log.wpVersion ?? "—"}</TableCell>
                    <TableCell>{formatCheckedAt(log.checkedAt)}</TableCell>
                  </TableRow>
                ))
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
                if (!monitor) return null
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
                      {monitor.all_time_uptime_ratio != null && (
                        <span className="text-sm text-muted-foreground">
                          Uptime: {parseFloat(monitor.all_time_uptime_ratio).toFixed(2)}%
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${statusColor(monitor.status)}`}>
                        {statusLabel(monitor.status)}
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
    </div>
  )
}
