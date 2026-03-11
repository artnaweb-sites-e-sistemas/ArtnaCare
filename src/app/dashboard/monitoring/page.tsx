"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Activity } from "lucide-react"

type UptimeMonitor = {
  id: number;
  friendly_name: string;
  url: string;
  status: number;
  all_time_uptime_ratio?: string;
};

export default function MonitoringPage() {
  const [running, setRunning] = useState(false)
  const [uptimeMonitors, setUptimeMonitors] = useState<UptimeMonitor[]>([])
  const [uptimeError, setUptimeError] = useState<string | null>(null)

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
      if (!res.ok) throw new Error("Check failed")
      alert("Verificações concluídas!")
    } catch (error) {
      console.error("Monitoring error:", error)
      alert("Falha ao executar verificações. Verifique se o endpoint está configurado.")
    } finally {
      setRunning(false)
    }
  }

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Saudáveis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Críticos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Última verificação</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Check Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados mais recentes</CardTitle>
          <CardDescription>Resultados da execução de monitoramento mais recente.</CardDescription>
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
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Ainda não há dados de monitoramento. Clique em &ldquo;Executar todas as verificações&rdquo; para iniciar o monitoramento.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* UptimeRobot Monitors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Monitores UptimeRobot
          </CardTitle>
          <CardDescription>
            Status dos monitores configurados no UptimeRobot. Configure UPTIMEROBOT_API_KEY no .env para ativar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uptimeError ? (
            <p className="text-sm text-amber-600 py-4">{uptimeError}</p>
          ) : uptimeMonitors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum monitor encontrado ou API key não configurada.</p>
          ) : (
            <div className="space-y-3">
              {uptimeMonitors.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{m.friendly_name || m.url}</p>
                    <p className="text-sm text-muted-foreground">{m.url}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {m.all_time_uptime_ratio != null && (
                      <span className="text-sm text-muted-foreground">
                        Uptime: {parseFloat(m.all_time_uptime_ratio).toFixed(2)}%
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${statusColor(m.status)}`}>
                      {statusLabel(m.status)}
                    </span>
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
