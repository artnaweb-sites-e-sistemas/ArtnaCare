"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react"

export default function MonitoringPage() {
  const [running, setRunning] = useState(false)

  const handleRunChecks = async () => {
    setRunning(true)
    try {
      const res = await fetch("/api/cron/monitoring", { method: "POST" })
      if (!res.ok) throw new Error("Check failed")
      alert("Monitoring checks completed!")
    } catch (error) {
      console.error("Monitoring error:", error)
      alert("Failed to run monitoring checks. Make sure the API endpoint is configured.")
    } finally {
      setRunning(false)
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
    </div>
  )
}
