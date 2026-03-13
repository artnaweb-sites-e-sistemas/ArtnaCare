"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Link2, Loader2, Info, RotateCw, Send, Search, X, Server, User, KeyRound, Globe, Plug } from "lucide-react"
import { getSites, type Site } from "@/lib/firebase/sites"
import { getSiteTypeLabel } from "@/lib/site-types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UptimeSegmentTooltip } from "@/components/ui/uptime-segment-tooltip"
import { toast } from "sonner"

type UptimeMonitorLog = {
  type: number; // 1=down, 2=up, 98=started, 99=paused
  datetime: number;
  duration?: number;
};

type UptimeMonitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
  all_time_uptime_ratio?: string;
  logs?: UptimeMonitorLog[];
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
  siteType?: string | null;
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

function formatUrlForDisplay(url: string): string {
  if (!url?.trim()) return ""
  try {
    const u = url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`
    const href = new URL(u).href
    return href.endsWith("/") ? href : `${href}/`
  } catch {
    return url
  }
}

/** Monta a URL de login do servidor; se houver usuário e senha, usa HTTP Basic Auth (alguns painéis fazem login automático). */
function buildServerLoginUrl(site: Site): string {
  const raw = site.serverLoginUrl?.trim()
  if (!raw) return ""
  const user = site.serverLoginUser?.trim()
  const pass = site.serverLoginPassword?.trim()
  if (!user && !pass) return raw
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`)
    const auth = [user, pass].map(encodeURIComponent).join(":")
    return `${u.protocol}//${auth}@${u.host}${u.pathname}${u.search}`
  } catch {
    return raw
  }
}

// Caminho dos ícones em @public/icon (SVG/PNG reais das logos).
function getSiteTypeIconPath(siteType?: string | null): string | null {
  if (!siteType) return null
  const t = siteType.toLowerCase()
  if (t.includes("wordpress")) return "/icon/wordpress.png"
  if (t.includes("html")) return "/icon/html 5.svg"
  if (t.includes("woocommerce")) return "/icon/woocommerce.png"
  if (t.includes("shopify")) return "/icon/shopify.svg"
  return "/icon/website.svg"
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

// Para tooltips de períodos offline, usamos dia/mês sem ano para ficar mais limpo.
const dateNoYearFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
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

const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
})

function formatUptimeTooltip(
  source: "ur" | "artna",
  data: { type?: number; status?: string; datetime?: number; checkedAt?: MonitoringLog["checkedAt"]; duration?: number }
): string {
  if (source === "ur" && data.type != null && data.datetime != null) {
    const date = new Date(data.datetime * 1000)
    const dateTimeStr = dateTimeFormat.format(date)
    if (data.type === 1) {
      const mins = data.duration != null ? Math.round(data.duration / 60) : 0
      return mins > 0 ? `Saiu do ar em ${dateTimeStr} (durou ${mins} min)` : `Saiu do ar em ${dateTimeStr}`
    }
    if (data.type === 2) return `Voltou ao ar em ${dateTimeStr}`
    if (data.type === 99) return `Pausado em ${dateTimeStr}`
    if (data.type === 98) return `Iniciado em ${dateTimeStr}`
    return dateTimeStr
  }
  if (source === "artna" && data.checkedAt != null) {
    const date = parseCheckedAt(data.checkedAt)
    if (!date) return ""
    const dateTimeStr = dateTimeFormat.format(date)
    if (data.status === "Healthy") return `Online em ${dateTimeStr}`
    if (data.status === "Critical" || data.status === "Error") return `Offline em ${dateTimeStr}`
    if (data.status === "Warning") return `Aviso em ${dateTimeStr}`
    return dateTimeStr
  }
  return ""
}

const timeOnlyFormat = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const timeWithShortDate = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

/** Formata intervalo offline de forma mais intuitiva.
 *  - Mesmo dia (local): "14:26 → 18:00"
 *  - Dias diferentes:   "Início 02/03 14:26 · Fim 03/03 10:07"
 */
function formatOfflineRange(first: number, last: number): string {
  const dFirst = new Date(first)
  const dLast = new Date(last)
  const sameDay = dFirst.toDateString() === dLast.toDateString()
  if (sameDay) return `${timeOnlyFormat.format(dFirst)} → ${timeOnlyFormat.format(dLast)}`
  return `Início ${timeWithShortDate.format(dFirst)} · Fim ${timeWithShortDate.format(dLast)}`
}

function formatDowntimeWindows(windows: { start: number; end: number }[]): string {
  if (windows.length === 0) return ""
  return windows
    .map((w) => {
      const dStart = new Date(w.start * 1000)
      const dEnd = new Date(w.end * 1000)
      const sameDay = dStart.toDateString() === dEnd.toDateString()
      if (sameDay) {
        return `${timeOnlyFormat.format(dStart)} → ${timeOnlyFormat.format(dEnd)}`
      }
      return `Início ${timeWithShortDate.format(dStart)} · Fim ${timeWithShortDate.format(dEnd)}`
    })
    .join(", ")
}

/** Calcula, para cada um dos últimos 30 dias, se o site esteve online ou offline (UptimeRobot logs). */
function computeDailyStatusFromUrLogs(logs: UptimeMonitorLog[]): {
  dayIndex: number
  up: boolean
  downtimeSec: number
  downtimeWindows: { start: number; end: number }[]
}[] {
  const now = new Date()
  const daySec = 24 * 60 * 60
  const todayStartSec = Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000
  )
  const result: {
    dayIndex: number
    up: boolean
    downtimeSec: number
    downtimeWindows: { start: number; end: number }[]
  }[] = []
  const downEvents = logs.filter((l) => l.type === 1)
  for (let i = 0; i < 30; i++) {
    // i=29 => hoje; i=0 => 29 dias atrás
    const dayStart = todayStartSec - (29 - i) * daySec
    const dayEnd = dayStart + daySec
    const windows: { start: number; end: number }[] = []
    let downtimeSec = 0
    for (const ev of downEvents) {
      const downStart = ev.datetime
      const downEnd = ev.datetime + (ev.duration ?? 0)
      const overlapStart = Math.max(downStart, dayStart)
      const overlapEnd = Math.min(downEnd, dayEnd)
      if (overlapStart < overlapEnd) {
        downtimeSec += overlapEnd - overlapStart
        windows.push({ start: overlapStart, end: overlapEnd })
      }
    }
    result.push({ dayIndex: i, up: downtimeSec === 0, downtimeSec, downtimeWindows: windows })
  }
  return result
}

/** Calcula, para cada um dos últimos 30 dias, se o site esteve online ou offline (monitoring_logs do ArtnaCare). */
function computeDailyStatusFromArtnaLogs(logs: MonitoringLog[]): {
  dayIndex: number
  up: boolean
  hasData: boolean
  offlineRange?: { first: number; last: number }
}[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStartMs = today.getTime()
  const dayMs = 24 * 60 * 60 * 1000
  const result: {
    dayIndex: number
    up: boolean
    hasData: boolean
    offlineRange?: { first: number; last: number }
  }[] = []
  for (let i = 0; i < 30; i++) {
    // i=29 => hoje; i=0 => 29 dias atrás
    const dayStart = todayStartMs - (29 - i) * dayMs
    const dayEnd = dayStart + dayMs
    const dayLogs = logs.filter((l) => {
      const t = parseCheckedAt(l.checkedAt)?.getTime()
      return t != null && t >= dayStart && t < dayEnd
    })
    const hasData = dayLogs.length > 0
    const up = hasData ? dayLogs.some((l) => l.status === "Healthy") : true
    const failedLogs = dayLogs.filter((l) => l.status === "Critical" || l.status === "Error")
    const offlineRange =
      failedLogs.length > 0
        ? (() => {
            const times = failedLogs.map((l) => parseCheckedAt(l.checkedAt)?.getTime()).filter((t): t is number => t != null)
            if (times.length === 0) return undefined
            return { first: Math.min(...times), last: Math.max(...times) }
          })()
        : undefined
    result.push({ dayIndex: i, up, hasData, offlineRange })
  }
  return result
}

export default function DashboardPage() {
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
    siteType?: string | null
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
  const [singleSiteCheckingId, setSingleSiteCheckingId] = useState<string | null>(null)
  const [sendingReportClientId, setSendingReportClientId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "warning" | "critical">("all")
  const [reportConfirm, setReportConfirm] = useState<{
    open: boolean
    clientId: string | null
    siteId: string | null
    siteName: string | null
  }>({ open: false, clientId: null, siteId: null, siteName: null })

  const loadMonitoringLogs = (signal?: AbortSignal) => {
    setLogsLoading(true)
    setLogsError(null)
    fetch("/api/cron/monitoring", { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setLogsError(data.error)
          setMonitoringLogs([])
        } else {
          setMonitoringLogs(data.logs || [])
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return
        setLogsError("Não foi possível carregar os resultados.")
        setMonitoringLogs([])
      })
      .finally(() => setLogsLoading(false))
  }

  useEffect(() => {
    const controller = new AbortController()
    loadMonitoringLogs(controller.signal)
    return () => controller.abort()
  }, [])

  useEffect(() => {
    getSites().then(setArtnaSites).catch(() => setArtnaSites([]))
  }, [])

  const fetchUptimeMonitors = (signal?: AbortSignal) => {
    fetch("/api/integrations/uptimerobot", { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setUptimeError(data.error)
        else setUptimeMonitors(data.monitors || [])
      })
      .catch((err) => {
        if (err?.name === "AbortError") return
        setUptimeError("Não foi possível carregar")
      })
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchUptimeMonitors(controller.signal)
    return () => controller.abort()
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

  const handleCheckSingleSite = async (siteId: string) => {
    setSingleSiteCheckingId(siteId)
    try {
      const res = await fetch("/api/cron/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Check failed")
      setLastRunResults(data.results || [])
      loadMonitoringLogs()
      setTimeout(loadMonitoringLogs, 2000)
    } catch (error) {
      console.error("Single site check error:", error)
      setResultModal({
        open: true,
        title: "Falha ao verificar site",
        message: "Não foi possível executar a verificação. Tente novamente.",
        variant: "error",
      })
    } finally {
      setSingleSiteCheckingId(null)
    }
  }

  const latestBySite = monitoringLogs.reduce<MonitoringLog[]>((acc, log) => {
    const logUrlNorm = normalizeUrl(log.siteUrl)
    if (!acc.some((l) => normalizeUrl(l.siteUrl) === logUrlNorm)) acc.push(log)
    return acc
  }, [])

  let displayLogs: MonitoringLog[] =
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
          siteType: r.siteType ?? undefined,
          checkedAt: { seconds: Math.floor(Date.now() / 1000) },
        }))

  if (lastRunResults.length === 1 && !running && !singleSiteCheckingId) {
    const r = lastRunResults[0]
    const newLog: MonitoringLog = {
      id: "single",
      siteName: r.name,
      siteUrl: r.url,
      status: r.status,
      issues: r.issues,
      responseTimeMs: r.responseTimeMs ?? undefined,
      sslValid: r.sslValid ?? undefined,
      wpVersion: r.wpVersion ?? undefined,
      siteType: r.siteType ?? undefined,
      checkedAt: { seconds: Math.floor(Date.now() / 1000) },
    }
    const urlNorm = normalizeUrl(r.url)
    displayLogs = displayLogs.filter((l) => normalizeUrl(l.siteUrl) !== urlNorm)
    displayLogs = [newLog, ...displayLogs]
  }

  const totalCount = artnaSites.length
  const healthyCount = displayLogs.filter((l) => l.status === "Healthy").length
  const warningCount = displayLogs.filter((l) => l.status === "Warning").length
  const criticalCount = displayLogs.filter((l) => l.status === "Critical").length

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
    if (status === 2) {
      return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/60 dark:border-emerald-700/80"
    }
    if (status === 1) {
      return "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/60 dark:border-amber-700/80"
    }
    if (status === 8 || status === 9) {
      return "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-900/60 dark:border-rose-700/80"
    }
    return "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-800/60 dark:border-slate-700/80"
  }

  const monitorsByUrl = new Map(uptimeMonitors.map((m) => [normalizeUrl(m.url), m]))

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const isWithinLast30Days = (d: Date | null) => d != null && d.getTime() >= thirtyDaysAgo

  // Base de datas para as barras de uptime: 29 dias atrás até hoje (dia atual).
  const todayBase = new Date()
  todayBase.setHours(0, 0, 0, 0)
  const todayStartMs = todayBase.getTime()
  const dayMs = 24 * 60 * 60 * 1000

  // Histórico de logs por site (últimos 30 dias, para barra de uptime quando não há UptimeRobot)
  const logsBySiteUrl = monitoringLogs.reduce<Map<string, MonitoringLog[]>>((acc, log) => {
    const urlNorm = normalizeUrl(log.siteUrl)
    const checked = parseCheckedAt(log.checkedAt)
    if (!isWithinLast30Days(checked)) return acc
    if (!acc.has(urlNorm)) acc.set(urlNorm, [])
    acc.get(urlNorm)!.push(log)
    return acc
  }, new Map())
  Array.from(logsBySiteUrl.values()).forEach((arr) => arr.sort((a, b) => (parseCheckedAt(b.checkedAt)?.getTime() ?? 0) - (parseCheckedAt(a.checkedAt)?.getTime() ?? 0)))

  const filteredArtnaSites = artnaSites.filter((site) => {
    const siteUrlNorm = normalizeUrl(site.url)
    const log = displayLogs.find((l) => normalizeUrl(l.siteUrl) === siteUrlNorm)
    const monitor = monitorsByUrl.get(siteUrlNorm)

    const matchesStatusFilter =
      statusFilter === "all" ||
      (statusFilter === "healthy" && log?.status === "Healthy") ||
      (statusFilter === "warning" && log?.status === "Warning") ||
      (statusFilter === "critical" && log?.status === "Critical")

    if (!matchesStatusFilter) return false

    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    const name = (site.name || "").toLowerCase()
    const url = (site.url || "").toLowerCase()
    const logStatus =
      log?.status === "Healthy"
        ? "saudável"
        : log?.status === "Warning"
          ? "aviso"
          : log?.status === "Critical"
            ? "crítico"
            : !log
              ? "pendente"
              : (log?.status || "").toLowerCase()
    const uptimeStatus =
      monitor?.status === 2
        ? "online"
        : monitor?.status === 9
          ? "offline"
          : monitor?.status === 1
            ? "preparando"
            : "não sincronizado"

    return name.includes(q) || url.includes(q) || logStatus.includes(q) || uptimeStatus.includes(q)
  })
  const unsyncedSites = artnaSites.filter(
    (s) => !monitorsByUrl.has(normalizeUrl(s.url)) && !(s.id != null && sitesInPreparing.has(s.id))
  )

  const handleSyncSite = async (site: Site) => {
    if (!site.id) return
    const siteId = site.id
    setSyncing(siteId)
    setSitesInPreparing((prev) => new Set(prev).add(siteId))
    try {
      const res = await fetch("/api/integrations/uptimerobot/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: site.name, url: site.url }),
      })
      const data = await res.json()
      if (data.monitorId) {
        const { updateSite } = await import("@/lib/firebase/sites")
        await updateSite(siteId, { uptimerobotMonitorId: data.monitorId })
        setArtnaSites((prev) =>
          prev.map((s) => (s.id === siteId ? { ...s, uptimerobotMonitorId: data.monitorId } : s))
        )
        const urRes = await fetch("/api/integrations/uptimerobot")
        const urData = await urRes.json()
        if (!urData.error) setUptimeMonitors(urData.monitors || [])
        setSitesInPreparing((prev) => {
          const next = new Set(prev)
          next.delete(siteId)
          return next
        })
      } else if (data.error) {
        setSitesInPreparing((prev) => {
          const next = new Set(prev)
          next.delete(siteId)
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
        next.delete(siteId)
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

  const handleSendReport = async (clientId: string, siteId?: string | null) => {
    if (!clientId) return
    setSendingReportClientId(clientId)
    try {
      const res = await fetch("/api/cron/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, siteId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.details || data.error || "Erro ao enviar relatório")
      if (data.generated === 0) {
        toast.warning("Nenhum relatório gerado. Verifique se o cliente tem e-mail e sites cadastrados.")
      } else if (data.emailSent === false) {
        toast.warning("Relatório gerado, mas o e-mail não foi enviado. Veja o motivo na tela Relatórios.")
      } else {
        toast.success("Relatório enviado por e-mail.")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar relatório")
    } finally {
      setSendingReportClientId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className={`py-3 cursor-pointer transition border ${
            statusFilter === "all"
              ? "border-emerald-500/70 bg-emerald-500/5"
              : "border-transparent hover:border-emerald-500/60"
          }`}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Globe className="h-8 w-8 text-emerald-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : totalCount}</p>
              <p className="text-xs text-muted-foreground">Total de sites</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`py-3 cursor-pointer transition border ${
            statusFilter === "healthy"
              ? "border-emerald-500/70 bg-emerald-500/5"
              : "border-transparent hover:border-emerald-500/60"
          }`}
          onClick={() => setStatusFilter("healthy")}
        >
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : healthyCount}</p>
              <p className="text-xs text-muted-foreground">Saudáveis</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`py-3 cursor-pointer transition border ${
            statusFilter === "warning"
              ? "border-amber-500/70 bg-amber-500/5"
              : "border-transparent hover:border-amber-500/60"
          }`}
          onClick={() => setStatusFilter("warning")}
        >
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : warningCount}</p>
              <p className="text-xs text-muted-foreground">Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`py-3 cursor-pointer transition border ${
            statusFilter === "critical"
              ? "border-rose-500/70 bg-rose-500/5"
              : "border-transparent hover:border-rose-500/60"
          }`}
          onClick={() => setStatusFilter("critical")}
        >
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{logsLoading ? "—" : criticalCount}</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Resultados e status dos sites</CardTitle>
              <CardDescription>
                {searchQuery.trim() ? (
                  <>
                    {filteredArtnaSites.length} de {artnaSites.length} site{artnaSites.length !== 1 ? "s" : ""} encontrado{filteredArtnaSites.length !== 1 ? "s" : ""}
                  </>
                ) : (
                  "Status da verificação (HTTP, SSL, WP, malware) e Online/Offline pelo UptimeRobot. Execute as verificações para atualizar."
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex w-full shrink-0 items-center sm:w-72">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Buscar site, status ou disponibilidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-9 focus-visible:ring-0 focus-visible:border-input focus-visible:outline-none"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar busca"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {unsyncedSites.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAll}
                  disabled={!!syncing}
                  className="shrink-0"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Sincronizar {unsyncedSites.length} site(s) no UptimeRobot
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {uptimeError && (
            <p className="text-sm text-amber-600 py-2 mb-2">{uptimeError}</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo de site</TableHead>
                <TableHead>Disponibilidade</TableHead>
                <TableHead>Última checagem</TableHead>
                <TableHead className="text-right w-12">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando…
                  </TableCell>
                </TableRow>
              ) : logsError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-amber-600">
                    {logsError} Configure FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY no .env.local.
                  </TableCell>
                </TableRow>
              ) : artnaSites.length > 0 ? (
                filteredArtnaSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum site encontrado para &quot;{searchQuery}&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                filteredArtnaSites.map((site) => {
                  const siteUrlNorm = normalizeUrl(site.url)
                  const log = displayLogs.find((l) => normalizeUrl(l.siteUrl) === siteUrlNorm)
                  const monitor = monitorsByUrl.get(siteUrlNorm)
                  const isPreparing =
                    (site.id != null && sitesInPreparing.has(site.id) && !monitor) ||
                    (monitor?.status === 1)
                  const uptimeDisplayStatus = isPreparing ? 1 : monitor?.status ?? null
                  const hasPluginsIssue =
                    log?.issues?.some((issue) => issue.toLowerCase().includes("plugin")) ?? false
                  return (
                    <TableRow key={site.id}>
                      <TableCell>
                        {site.id ? (
                          <div className="space-y-0.5">
                            <Link href={`/dashboard/sites/${site.id}`} className="font-medium hover:opacity-80 transition-opacity block">
                              {site.name}
                            </Link>
                            <a
                              href={formatUrlForDisplay(site.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary hover:underline block"
                            >
                              {formatUrlForDisplay(site.url)}
                            </a>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">{site.name}</p>
                            <a
                              href={formatUrlForDisplay(site.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary hover:underline"
                            >
                              {formatUrlForDisplay(site.url)}
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {log ? (
                            <>
                              <Popover>
                                <PopoverTrigger
                                  className="inline-flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted-foreground hover:text-foreground"
                                  aria-label="Ver detalhes do status"
                                >
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                                      log.status === "Healthy"
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300"
                                        : log.status === "Warning"
                                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-300"
                                          : log.status === "Critical"
                                            ? "bg-rose-100 text-rose-800 dark:bg-rose-900/70 dark:text-rose-300"
                                            : "bg-slate-100 text-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
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
                                    <Info className="h-3.5 w-3.5" />
                                    {log.status === "Warning" && hasPluginsIssue && (
                                      <Plug className="h-3.5 w-3.5 text-amber-700 dark:text-amber-200" />
                                    )}
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 sm:w-80" align="start">
                                  <p className="font-medium text-sm mb-2">Detalhes do status</p>
                                  {log.issues && log.issues.length > 0 ? (
                                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                                      {log.issues.map((issue, i) => (
                                        <li key={i}>{issue}</li>
                                      ))}
                                    </ul>
                                  ) : log.status === "Healthy" ? (
                                    <p className="text-sm text-muted-foreground">Nenhum problema detectado nesta verificação.</p>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Execute as verificações novamente para obter os detalhes.</p>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </>
                          ) : (
                            <>
                              <Popover>
                                <PopoverTrigger
                                  className="inline-flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted-foreground hover:text-foreground"
                                  aria-label="Ver detalhes do status"
                                >
                                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-800">
                                    Pendente
                                    <Info className="h-3.5 w-3.5" />
                                  </span>
                                </PopoverTrigger>
                                <PopoverContent className="w-72 sm:w-80" align="start">
                                  <p className="font-medium text-sm mb-2">Detalhes do status</p>
                                  <p className="text-sm text-muted-foreground">Execute as verificações para obter os detalhes deste site.</p>
                                </PopoverContent>
                              </Popover>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const displayType = log?.siteType ?? site.type ?? null
                            const iconPath = getSiteTypeIconPath(displayType)
                            if (!iconPath) return null
                            return (
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                                <img
                                  src={iconPath}
                                  alt={displayType ?? "Tipo de site"}
                                  className="h-4 w-4 object-contain"
                                />
                              </span>
                            )
                          })()}
                          {(() => {
                            const displayType = log?.siteType ?? site.type ?? "—"
                            const isWordPress = String(displayType).toLowerCase().includes("wordpress")
                            if (isWordPress && (site.wpAdminUrl || site.url)) {
                              return (
                                <a
                                  href={site.wpAdminUrl?.trim() || (() => {
                                    try {
                                      const u = new URL(site.url.startsWith("http") ? site.url : "https://" + site.url)
                                      return u.origin + "/wp-login.php"
                                    } catch {
                                      return "#"
                                    }
                                  })()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  {getSiteTypeLabel(displayType)}
                                </a>
                              )
                            }
                            return (
                              <span className="text-xs text-muted-foreground">
                                {getSiteTypeLabel(displayType)}
                              </span>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div className="flex-1 flex items-center gap-2">
                            {(() => {
                              const monitor = monitorsByUrl.get(siteUrlNorm)
                              const siteLogs = logsBySiteUrl.get(siteUrlNorm) ?? []
                              const segmentCount = 30
                              const urLogsCutoff = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
                              if (monitor?.logs?.length) {
                                const logs = monitor.logs.filter((l) => l.datetime >= urLogsCutoff)
                                if (logs.length > 0) {
                                  const dailyStatus = computeDailyStatusFromUrLogs(logs)
                                  const upDays = dailyStatus.filter((d) => d.up).length
                                  const pct = Math.round((upDays / 30) * 10000) / 100
                                  return (
                                    <>
                                      <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px] flex-1 min-w-[120px] h-6 rounded-lg overflow-hidden bg-muted/50 p-0.5 pr-2">
                                        {dailyStatus.map((d, i) => {
                                          const isToday = i === dailyStatus.length - 1
                                          const dayStart = todayStartMs - (29 - i) * dayMs
                                          const dayDate = isToday ? new Date() : new Date(dayStart)
                                          const dateStr = dateFormat.format(dayDate)
                                          return (
                                            <UptimeSegmentTooltip
                                              key={i}
                                              content={
                                                <div className="space-y-1">
                                                  <div>
                                                    <span className="font-medium">{dateStr}</span>
                                                    <span className="text-muted-foreground"> — </span>
                                                    {d.up ? (
                                                      <span className="text-emerald-600 dark:text-emerald-400">Online</span>
                                                    ) : (
                                                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                        Offline
                                                      </span>
                                                    )}
                                                  </div>
                                                  {!d.up && d.downtimeWindows.length > 0 && (
                                                    <div className="mt-1 text-xs text-foreground space-y-0.5">
                                                      {d.downtimeWindows.length === 1 ? (
                                                        (() => {
                                                          const w = d.downtimeWindows[0]
                                                          const start = new Date(w.start * 1000)
                                                          const end = new Date(w.end * 1000)
                                                          const sameDay = start.toDateString() === end.toDateString()
                                                          if (sameDay) {
                                                            return (
                                                              <>
                                                                <div>Início: {timeOnlyFormat.format(start)}</div>
                                                                <div>Fim: {timeOnlyFormat.format(end)}</div>
                                                              </>
                                                            )
                                                          }
                                                          const startDate = dateNoYearFormat.format(start)
                                                          const endDate = dateNoYearFormat.format(end)
                                                          const startTime = timeOnlyFormat.format(start)
                                                          const endTime = timeOnlyFormat.format(end)
                                                          return (
                                                            <>
                                                              <div>
                                                                Início:{" "}
                                                                <span className="text-rose-600">{startDate}</span>, {startTime}
                                                              </div>
                                                              <div>
                                                                Fim:{" "}
                                                                <span className="text-rose-600">{endDate}</span>, {endTime}
                                                              </div>
                                                            </>
                                                          )
                                                        })()
                                                      ) : (
                                                        <>
                                                          <div className="font-medium text-xs">Períodos offline:</div>
                                                          <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
                                                            {d.downtimeWindows
                                                              .slice()
                                                              .sort((a, b) => a.start - b.start)
                                                              .map((w, idx) => {
                                                              const start = new Date(w.start * 1000)
                                                              const end = new Date(w.end * 1000)
                                                              const sameDay = start.toDateString() === end.toDateString()
                                                              const startDate = dateNoYearFormat.format(start)
                                                              const endDate = dateNoYearFormat.format(end)
                                                              const startTime = timeOnlyFormat.format(start)
                                                              const endTime = timeOnlyFormat.format(end)
                                                              return (
                                                                <div key={idx} className="flex gap-1">
                                                                  <span className="text-muted-foreground">{idx + 1}.</span>
                                                                  {sameDay ? (
                                                                    <span>
                                                                      {startTime} → {endTime}
                                                                    </span>
                                                                  ) : (
                                                                    <span>
                                                                      <span className="text-rose-600">{startDate}</span>, {startTime} →{" "}
                                                                      <span className="text-rose-600">{endDate}</span>, {endTime}
                                                                    </span>
                                                                  )}
                                                                </div>
                                                              )
                                                            })}
                                                          </div>
                                                        </>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>
                                              }
                                            >
                                              <div
                                                className={`flex-1 min-h-[14px] rounded-sm transition-all duration-150 hover:ring-2 hover:ring-foreground/25 hover:ring-offset-1 hover:z-10 hover:brightness-110 cursor-pointer ${d.up ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}
                                                aria-hidden
                                              />
                                            </UptimeSegmentTooltip>
                                          )
                                        })}
                                      </div>
                                      <span className="text-xs tabular-nums text-muted-foreground w-12 shrink-0 text-right">
                                        {`${pct.toFixed(2)}%`}
                                      </span>
                                    </>
                                  )
                                }
                              }
                              if (monitor?.all_time_uptime_ratio != null) {
                                const ratio = parseFloat(String(monitor.all_time_uptime_ratio))
                                const upPct = Number.isFinite(ratio) ? Math.min(100, Math.max(0, ratio)) : 0
                                const greenCount = Math.round((upPct / 100) * segmentCount)
                                return (
                                  <>
                                    <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px] flex-1 min-w-[120px] h-6 rounded-lg overflow-hidden bg-muted/50 p-0.5 pr-2">
                                      {Array.from({ length: segmentCount }, (_, i) => (
                                        <UptimeSegmentTooltip key={i} content={`Uptime: ${upPct.toFixed(2)}%`}>
                                          <div
                                            className={`flex-1 min-h-[14px] rounded-sm transition-all duration-150 hover:ring-2 hover:ring-foreground/25 hover:ring-offset-1 hover:brightness-110 cursor-pointer ${i < greenCount ? "bg-emerald-500" : "bg-rose-500"}`}
                                            aria-hidden
                                          />
                                        </UptimeSegmentTooltip>
                                      ))}
                                    </div>
                                    <span className="text-xs tabular-nums text-muted-foreground w-12 shrink-0 text-right">
                                      {Number.isFinite(ratio) ? `${ratio.toFixed(2)}%` : "—"}
                                    </span>
                                  </>
                                )
                              }
                              if (siteLogs.length > 0) {
                                const dailyStatus = computeDailyStatusFromArtnaLogs(siteLogs)
                                const daysWithData = dailyStatus.filter((d) => d.hasData)
                                const upDays = daysWithData.filter((d) => d.up).length
                                const pct = daysWithData.length > 0 ? Math.round((upDays / daysWithData.length) * 10000) / 100 : 0
                                return (
                                  <>
                                    <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[2px] flex-1 min-w-[120px] h-6 rounded-lg overflow-hidden bg-muted/50 p-0.5 pr-2">
                                      {dailyStatus.map((d, i) => {
                                        const isToday = i === dailyStatus.length - 1
                                        const dayStart = todayStartMs - (29 - i) * dayMs
                                        const dayDate = isToday ? new Date() : new Date(dayStart)
                                        const dateStr = dateFormat.format(dayDate)
                                        return (
                                          <UptimeSegmentTooltip
                                            key={i}
                                            content={
                                              <div className="space-y-1">
                                                <div>
                                                  <span className="font-medium">{dateStr}</span>
                                                  <span className="text-muted-foreground"> — </span>
                                                  {!d.hasData ? (
                                                    <span className="text-muted-foreground">Sem verificações</span>
                                                  ) : d.up ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400">Online</span>
                                                  ) : (
                                                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                                                      Offline
                                                    </span>
                                                  )}
                                                </div>
                                                {!d.up && d.offlineRange && (
                                                  <div className="mt-1 text-xs text-foreground space-y-0.5">
                                                    {(() => {
                                                      const first = d.offlineRange!.first
                                                      const last = d.offlineRange!.last
                                                      const dFirst = new Date(first)
                                                      const dLast = new Date(last)
                                                      const sameDay =
                                                        dFirst.toDateString() === dLast.toDateString()
                                                      if (sameDay) {
                                                        return (
                                                          <>
                                                            <div>Início: {timeOnlyFormat.format(dFirst)}</div>
                                                            <div>Fim: {timeOnlyFormat.format(dLast)}</div>
                                                          </>
                                                        )
                                                      }
                                                      const startDate = dateNoYearFormat.format(dFirst)
                                                      const endDate = dateNoYearFormat.format(dLast)
                                                      const startTime = timeOnlyFormat.format(dFirst)
                                                      const endTime = timeOnlyFormat.format(dLast)
                                                      return (
                                                        <>
                                                          <div>
                                                            Início:{" "}
                                                            <span className="text-rose-600">{startDate}</span>, {startTime}
                                                          </div>
                                                          <div>
                                                            Fim:{" "}
                                                            <span className="text-rose-600">{endDate}</span>, {endTime}
                                                          </div>
                                                        </>
                                                      )
                                                    })()}
                                                  </div>
                                                )}
                                              </div>
                                            }
                                          >
                                            <div
                                              className={`flex-1 min-h-[14px] rounded-sm transition-all duration-150 hover:ring-2 hover:ring-foreground/25 hover:ring-offset-1 hover:z-10 hover:brightness-110 cursor-pointer ${
                                                !d.hasData
                                                  ? "bg-muted-foreground/30 hover:bg-muted-foreground/40"
                                                  : d.up
                                                    ? "bg-emerald-500 hover:bg-emerald-600"
                                                    : "bg-rose-500 hover:bg-rose-600"
                                              }`}
                                              aria-hidden
                                            />
                                          </UptimeSegmentTooltip>
                                        )
                                      })}
                                    </div>
                                    <span className="text-xs tabular-nums text-muted-foreground w-12 shrink-0 text-right">
                                      {`${pct.toFixed(2)}%`}
                                    </span>
                                  </>
                                )
                              }
                              return <span className="text-muted-foreground text-xs">—</span>
                            })()}
                          </div>
                          <div>
                            {uptimeDisplayStatus !== null ? (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border ${statusColor(uptimeDisplayStatus)}`}>
                                {isPreparing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                                {statusLabel(uptimeDisplayStatus)}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Não sincronizado</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleSyncSite(site)}
                                  disabled={!!syncing}
                                >
                                  <Link2 className="mr-1 h-3 w-3" />
                                  Sincronizar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log?.checkedAt ? (
                          (() => {
                            const parts = getCheckedAtParts(log.checkedAt)
                            return parts ? (
                              <>
                                {parts.dateStr},{" "}
                                <span className="text-xs">{parts.timeStr}h</span>
                              </>
                            ) : (
                              "—"
                            )
                          })()
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:scale-110 hover:bg-accent/90 transition-all duration-200"
                            disabled={!site.clientId || !!sendingReportClientId}
                            aria-label="Enviar relatório ao cliente"
                            title="Enviar relatório ao cliente"
                            onClick={() =>
                              site.clientId &&
                              setReportConfirm({
                                open: true,
                                clientId: site.clientId,
                                siteId: site.id ?? null,
                                siteName: site.name,
                              })
                            }
                          >
                            {sendingReportClientId === site.clientId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:scale-110 hover:bg-accent/90 transition-all duration-200"
                            onClick={() => site.id && handleCheckSingleSite(site.id)}
                            disabled={!!running || singleSiteCheckingId === site.id}
                            aria-label="Verificar este site"
                          >
                            {singleSiteCheckingId === site.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCw className="h-4 w-4" />
                            )}
                          </Button>
                          {site.serverLoginUrl?.trim() ? (
                            (site.serverLoginUser?.trim() || site.serverLoginPassword?.trim()) ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:scale-110 hover:bg-accent/90 transition-all duration-200"
                                    aria-label="Abrir login do servidor"
                                    title="Abrir login do servidor (menu: copiar usuário/senha)"
                                  >
                                    <Server className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="min-w-[12rem] rounded-xl border border-border/80 bg-popover p-1.5 font-sans text-popover-foreground shadow-lg ring-1 ring-black/5 dark:ring-white/10"
                                >
                                  <DropdownMenuItem
                                    className="cursor-pointer whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-sans focus:bg-accent focus:text-accent-foreground"
                                    onClick={() => window.open(buildServerLoginUrl(site), "_blank", "noopener,noreferrer")}
                                  >
                                    <Link2 className="mr-2.5 h-4 w-4 shrink-0 opacity-70" />
                                    Abrir link
                                  </DropdownMenuItem>
                                  {site.serverLoginUser?.trim() && (
                                    <DropdownMenuItem
                                      className="cursor-pointer whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-sans focus:bg-accent focus:text-accent-foreground"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(site.serverLoginUser ?? "")
                                        toast.success("Usuário copiado")
                                      }}
                                    >
                                      <User className="mr-2.5 h-4 w-4 shrink-0 opacity-70" />
                                      Copiar usuário
                                    </DropdownMenuItem>
                                  )}
                                  {site.serverLoginPassword?.trim() && (
                                    <DropdownMenuItem
                                      className="cursor-pointer whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-sans focus:bg-accent focus:text-accent-foreground"
                                      onClick={() => {
                                        void navigator.clipboard.writeText(site.serverLoginPassword ?? "")
                                        toast.success("Senha copiada")
                                      }}
                                    >
                                      <KeyRound className="mr-2.5 h-4 w-4 shrink-0 opacity-70" />
                                      Copiar senha
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:scale-110 hover:bg-accent/90 transition-all duration-200"
                                aria-label="Abrir login do servidor"
                                title="Abrir login do servidor"
                                asChild
                              >
                                <a href={site.serverLoginUrl.trim()} target="_blank" rel="noopener noreferrer">
                                  <Server className="h-4 w-4" />
                                </a>
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 cursor-not-allowed opacity-40"
                              disabled
                              aria-label="URL de login do servidor não configurada"
                              title="Configure a URL de login do servidor no cadastro do site"
                            >
                              <Server className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
                )
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum site cadastrado. Adicione sites em Sites e clique em &ldquo;Executar todas as verificações&rdquo;.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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

      <Dialog
        open={reportConfirm.open}
        onOpenChange={(open) =>
          setReportConfirm((prev) => ({
            ...prev,
            open,
            clientId: open ? prev.clientId : null,
            siteId: open ? prev.siteId : null,
          }))
        }
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar relatório deste site para o cliente?</DialogTitle>
            <DialogDescription>
              {reportConfirm.siteName
                ? `Você está prestes a enviar o relatório automático apenas do site "${reportConfirm.siteName}". Confirme para continuar.`
                : "Você está prestes a enviar o relatório automático deste site. Confirme para continuar."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReportConfirm({ open: false, clientId: null, siteId: null, siteName: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (reportConfirm.clientId) {
                  handleSendReport(reportConfirm.clientId, reportConfirm.siteId)
                }
                setReportConfirm({ open: false, clientId: null, siteId: null, siteName: null })
              }}
            >
              Confirmar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
