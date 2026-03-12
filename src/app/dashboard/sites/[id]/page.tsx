"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowLeft, Edit, ExternalLink, Trash2, Globe, Shield, Clock, Activity, Plus, AlertTriangle, Info } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { getSite, deleteSite, Site } from "@/lib/firebase/sites"
import { getMaintenanceLogs, addMaintenanceLog, MaintenanceEntry } from "@/lib/firebase/maintenance"
import { useAuth } from "@/hooks/useAuth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const MAINTENANCE_TYPES: { value: MaintenanceEntry["type"]; label: string }[] = [
  { value: "Update", label: "Atualização" },
  { value: "Backup", label: "Backup" },
  { value: "Security", label: "Segurança" },
  { value: "Performance", label: "Performance" },
  { value: "Other", label: "Outro" },
]

function formatDate(value: MaintenanceEntry["createdAt"]) {
  if (!value) return "—"
  const date = value instanceof Date ? value : (value as { toDate?: () => Date }).toDate?.() ?? new Date()
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

type MonitoringLogEntry = {
  id: string
  siteId?: string
  siteUrl?: string
  status: string
  issues?: string[]
  checkedAt?: { seconds?: number; _seconds?: number }
  responseTimeMs?: number
  sslValid?: boolean
  siteType?: string | null
}

function formatMonitoringCheckedAt(checkedAt: MonitoringLogEntry["checkedAt"]) {
  if (!checkedAt) return "—"
  const sec = (checkedAt as { seconds?: number }).seconds ?? (checkedAt as { _seconds?: number })._seconds
  if (typeof sec !== "number") return "—"
  const date = new Date(sec * 1000)
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

export default function SiteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.id as string
  const { user } = useAuth()

  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceEntry[]>([])
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({
    type: "Update" as MaintenanceEntry["type"],
    description: "",
    performedBy: user?.displayName || "",
  })
  const [monitoringHistory, setMonitoringHistory] = useState<MonitoringLogEntry[]>([])
  const [monitoringHistoryLoading, setMonitoringHistoryLoading] = useState(false)
  const [monitoringHistoryVisible, setMonitoringHistoryVisible] = useState(5)
  const [maintenanceLogsVisible, setMaintenanceLogsVisible] = useState(5)

  useEffect(() => {
    setMonitoringHistoryVisible(5)
    setMaintenanceLogsVisible(5)
    async function load() {
      try {
        const data = await getSite(siteId)
        setSite(data)
      } catch (error) {
        console.error("Failed to load site:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [siteId])

  useEffect(() => {
    if (!siteId) return
    setMaintenanceLoading(true)
    getMaintenanceLogs(siteId)
      .then(setMaintenanceLogs)
      .catch(console.error)
      .finally(() => setMaintenanceLoading(false))
  }, [siteId])

  useEffect(() => {
    if (!site?.id || !site?.url) return
    setMonitoringHistoryLoading(true)
    const siteId = site.id
    const siteUrl = site.url
    fetch("/api/cron/monitoring")
      .then((res) => res.json())
      .then((data: { logs?: MonitoringLogEntry[] }) => {
        const logs = data.logs ?? []
        const norm = (url: string) => {
          const u = (url || "").trim().toLowerCase().replace(/\/$/, "")
          return u.startsWith("http") ? u : `https://${u}`
        }
        const current = norm(siteUrl)
        const forSite = logs.filter(
          (log) => log.siteId === siteId || (log.siteUrl && norm(log.siteUrl) === current)
        )
        setMonitoringHistory(forSite)
      })
      .catch(console.error)
      .finally(() => setMonitoringHistoryLoading(false))
  }, [site?.id, site?.url])

  useEffect(() => {
    setMaintenanceForm((prev) => ({ ...prev, performedBy: user?.displayName || prev.performedBy }))
  }, [user?.displayName])

  const handleDelete = async () => {
    if (!confirm("Tem certeza de que deseja excluir este site?")) return
    setDeleting(true)
    try {
      await deleteSite(siteId)
      router.push("/dashboard/sites")
    } catch (error) {
      console.error("Failed to delete site:", error)
      setDeleting(false)
    }
  }

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!site || !maintenanceForm.description.trim()) return
    setSubmitting(true)
    try {
      await addMaintenanceLog({
        siteId,
        siteName: site.name,
        type: maintenanceForm.type,
        description: maintenanceForm.description.trim(),
        performedBy: maintenanceForm.performedBy.trim() || "—",
      })
      setDialogOpen(false)
      setMaintenanceForm({ type: "Update", description: "", performedBy: user?.displayName || "" })
      const logs = await getMaintenanceLogs(siteId)
      setMaintenanceLogs(logs)
    } catch (error) {
      console.error("Erro ao adicionar registro:", error)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando site...</p>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/sites"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-muted-foreground">Site não encontrado.</p>
      </div>
    )
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "Healthy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Warning": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "Critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/sites">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{site.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <a href={site.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                {site.url}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span>•</span>
              <span>{site.clientName || "Sem cliente"}</span>
              <span>•</span>
              <div className="flex items-center gap-1.5">
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(site.status)}`}>
                {site.status === "Healthy" ? "Saudável" : site.status === "Warning" ? "Aviso" : site.status === "Critical" ? "Crítico" : site.status === "Unknown" ? "Desconhecido" : site.status}
              </span>
              <Popover>
                <PopoverTrigger
                  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-foreground"
                  aria-label="Ver detalhes do status"
                >
                  <Info className="h-4 w-4" />
                </PopoverTrigger>
                <PopoverContent className="w-72 sm:w-80" align="start">
                  <p className="font-medium text-sm mb-2">Detalhes do status</p>
                  {site.issues && site.issues.length > 0 ? (
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      {site.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  ) : site.status === "Healthy" ? (
                    <p className="text-sm text-muted-foreground">Nenhum problema detectado.</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Execute as verificações em Monitoramento para obter os detalhes.</p>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/sites/${siteId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>

      {/* Avisos/Críticos - detalhes */}
      {site.issues && site.issues.length > 0 && (
        <Card className={site.status === "Critical" ? "border-rose-200" : "border-amber-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {site.status === "Critical" ? "Problemas críticos" : "Avisos"}
            </CardTitle>
            <CardDescription>
              {site.status === "Critical"
                ? "Estes problemas precisam de atenção imediata."
                : "Recomenda-se verificar estes pontos."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2 list-disc list-inside">
              {site.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="flex flex-col">
          <CardContent className="py-4 px-4 flex items-center justify-start gap-2">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">{site.type}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardContent className="py-4 px-4 flex items-center justify-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">SSL</p>
              <p className="text-sm font-medium">{site.sslValid === true ? "Válido" : site.sslValid === false ? "Inválido" : "Não verificado"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardContent className="py-4 px-4 flex items-center justify-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Tempo de resposta</p>
              <p className="text-sm font-medium">{site.responseTime ? `${site.responseTime}ms` : "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardContent className="py-4 px-4 flex items-center justify-start gap-2">
            <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Versão do WP</p>
              <p className="text-sm font-medium">{site.wpVersion || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Registro de manutenção</CardTitle>
            <CardDescription>Registro das ações de manutenção realizadas neste site.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar registro
          </Button>
        </CardHeader>
        <CardContent>
          {maintenanceLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando registros...</p>
          ) : maintenanceLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Ainda não há registros de manutenção.
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {maintenanceLogs.slice(0, maintenanceLogsVisible).map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{MAINTENANCE_TYPES.find((t) => t.value === entry.type)?.label ?? entry.type}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{entry.performedBy}</span>
                      <span className="text-muted-foreground text-xs ml-auto">{formatDate(entry.createdAt)}</span>
                    </div>
                    <p className="text-muted-foreground">{entry.description}</p>
                  </li>
                ))}
              </ul>
              {maintenanceLogsVisible < maintenanceLogs.length && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => setMaintenanceLogsVisible((v) => v + 5)}
                >
                  Ver mais
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Monitoring History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de monitoramento</CardTitle>
          <CardDescription>Resultados e tendências de desempenho para este site.</CardDescription>
        </CardHeader>
        <CardContent>
          {monitoringHistoryLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Carregando histórico...</p>
          ) : monitoringHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              O histórico de monitoramento aparecerá aqui após a execução das verificações em Monitoramento.
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {monitoringHistory.slice(0, monitoringHistoryVisible).map((log) => (
                  <li
                    key={log.id}
                    className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                          log.status === "Healthy"
                            ? "bg-emerald-100 text-emerald-800"
                            : log.status === "Warning"
                              ? "bg-amber-100 text-amber-800"
                              : log.status === "Critical" || log.status === "Error"
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
                              : log.status === "Error"
                                ? "Erro"
                                : log.status}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatMonitoringCheckedAt(log.checkedAt)}
                      </span>
                      {log.responseTimeMs != null && (
                        <span className="text-muted-foreground text-xs">
                          {log.responseTimeMs} ms
                        </span>
                      )}
                      {log.sslValid !== undefined && (
                        <span className="text-muted-foreground text-xs">
                          SSL: {log.sslValid ? "Válido" : "Inválido"}
                        </span>
                      )}
                    </div>
                    {log.issues && log.issues.length > 0 && (
                      <ul className="text-muted-foreground text-xs list-disc list-inside">
                        {log.issues.slice(0, 5).map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              {monitoringHistoryVisible < monitoringHistory.length && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => setMonitoringHistoryVisible((v) => v + 5)}
                >
                  Ver mais
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddMaintenance}>
            <DialogHeader>
              <DialogTitle>Adicionar registro de manutenção</DialogTitle>
              <DialogDescription>Descreva a ação de manutenção realizada neste site.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="maintenance-type">Tipo</Label>
                <select
                  id="maintenance-type"
                  value={maintenanceForm.type}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, type: e.target.value as MaintenanceEntry["type"] }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  {MAINTENANCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-desc">Descrição</Label>
                <Textarea
                  id="maintenance-desc"
                  value={maintenanceForm.description}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ex.: Atualização dos plugins, backup realizado..."
                  rows={3}
                  required
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-by">Realizado por</Label>
                <Input
                  id="maintenance-by"
                  value={maintenanceForm.performedBy}
                  onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, performedBy: e.target.value }))}
                  placeholder="Seu nome"
                />
              </div>
            </div>
            <DialogFooter showCloseButton>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
