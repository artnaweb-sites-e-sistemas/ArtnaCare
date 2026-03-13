"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Download, Send, Loader2, Pencil, Info, Trash2, Search, X } from "lucide-react"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ReportRecord {
  id?: string
  clientId: string
  clientName: string
  period: string
  generatedAt: string | Date
  emailSent: boolean
  pdfGenerated: boolean
  email?: string
  emailError?: string
}

function formatDate(value: string | Date) {
  if (!value) return "—"
  const d = typeof value === "string" ? new Date(value) : value
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d)
}

function translateEmailError(error: string): string {
  const e = error.toLowerCase()
  if (e.includes("you can only send testing emails to your own") || e.includes("verify a domain at resend")) {
    return "Em modo de teste, o Resend só envia para o seu próprio e-mail. Para enviar para clientes, verifique um domínio em resend.com/domains e use um endereço de envio (from) com esse domínio."
  }
  if (e.includes("resend_api_key not configured")) {
    return "Chave da API do Resend não configurada. Configure RESEND_API_KEY no .env.local."
  }
  if (e.includes("invalid from") || e.includes("from address")) {
    return "Endereço de envio inválido. Use um e-mail de um domínio verificado no Resend (RESEND_FROM_EMAIL)."
  }
  if (e.includes("only send to verified")) {
    return "O Resend em modo sandbox só envia para e-mails verificados. Verifique um domínio em resend.com/domains para enviar para outros destinatários."
  }
  if (e.includes("failed to send") || e.includes("network")) {
    return "Falha de conexão ao enviar o e-mail. Tente novamente mais tarde."
  }
  return error || "Erro desconhecido ao enviar o e-mail."
}

export default function ReportsPage() {
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [massReportModalOpen, setMassReportModalOpen] = useState(false)
  const [massReportSending, setMassReportSending] = useState(false)

  const handleDownloadPdf = async (r: ReportRecord) => {
    if (!r.clientId || !r.period) return
    setDownloadingId(r.id ?? `${r.clientId}-${r.period}`)
    setMessage(null)
    try {
      const url = `/api/reports/download?clientId=${encodeURIComponent(r.clientId)}&period=${encodeURIComponent(r.period)}`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.details || data.error || "Falha ao gerar relatório")
      }
      const contentType = res.headers.get("content-type") ?? ""
      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = downloadUrl
      const baseName = `ArtnaCare_Relatorio_${r.clientName.replace(/\s+/g, "_")}_${r.period.replace(/\s+/g, "_")}`
      if (contentType.includes("text/html")) {
        a.download = `${baseName}.html`
        setMessage({
          type: "info",
          text: "Relatório baixado em HTML (PDF indisponível). Abra o arquivo no navegador e use Imprimir → Salvar como PDF se precisar.",
        })
      } else {
        a.download = `${baseName}.pdf`
      }
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Não foi possível gerar o relatório.",
      })
    } finally {
      setDownloadingId(null)
    }
  }

  const loadReports = async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/reports", { signal })
      const data = await res.json().catch(() => [])
      setReports(res.ok && Array.isArray(data) ? data : [])
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return
      setReports([])
    } finally {
      setLoadingReports(false)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!id) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir")
      await loadReports()
    } catch {
      setMessage({ type: "error", text: "Não foi possível excluir o relatório." })
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadReports(controller.signal)
    return () => controller.abort()
  }, [])

  const [massReportProgress, setMassReportProgress] = useState<{ processed: number; total: number } | null>(null)

  const handleSendMassReport = async () => {
    setMassReportSending(true)
    setMessage(null)
    setMassReportProgress(null)
    try {
      const createRes = await fetch("/api/reports/send-mass", { method: "POST" })
      const createData = await createRes.json().catch(() => ({}))
      if (!createRes.ok) throw new Error(createData.details || createData.error || "Falha ao iniciar envio")
      const jobId = createData.jobId
      const total = createData.totalClients ?? 0
      if (total === 0) {
        setMassReportModalOpen(false)
        setMessage({ type: "success", text: "Nenhum cliente ativo com e-mail e sites para enviar." })
        return
      }
      setMassReportProgress({ processed: 0, total })

      let done = false
      while (!done) {
        const batchRes = await fetch("/api/reports/process-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId }),
        })
        const batchData = await batchRes.json().catch(() => ({}))
        if (!batchRes.ok) throw new Error(batchData.details || batchData.error || "Falha ao processar lote")
        setMassReportProgress({ processed: batchData.processed ?? 0, total: batchData.total ?? total })
        done = batchData.done === true
        if (!done) await new Promise((r) => setTimeout(r, 800))
      }

      setMassReportModalOpen(false)
      await loadReports()
      setMessage({ type: "success", text: `${total} relatório(s) processado(s) e enviado(s) aos clientes.` })
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Não foi possível enviar os relatórios em massa." })
    } finally {
      setMassReportSending(false)
      setMassReportProgress(null)
    }
  }

  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    const clientName = (r.clientName || "").toLowerCase()
    const period = (r.period || "").toLowerCase()
    const status = r.emailSent ? "enviado" : "falha"
    return clientName.includes(q) || period.includes(q) || status.includes(q)
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Relatórios</h2>
          <p className="mt-1 text-sm text-muted-foreground">Envie relatórios pela página de Sites ou em massa. Edite o modelo aqui.</p>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <Button variant="outline" className="whitespace-nowrap" onClick={() => setMassReportModalOpen(true)}>
            <Send className="mr-2 h-4 w-4" />
            Enviar relatório em massa
          </Button>
          <Button asChild className="whitespace-nowrap">
            <Link href="/dashboard/reports/template">
              <Pencil className="mr-2 h-4 w-4" />
              Editar modelo do relatório
            </Link>
          </Button>
        </div>
      </div>

      <Dialog open={massReportModalOpen} onOpenChange={setMassReportModalOpen}>
        <DialogContent className="font-sans">
          <DialogHeader>
            <DialogTitle>Enviar relatório em massa</DialogTitle>
            <DialogDescription className="space-y-2">
              <p>Será gerado e enviado um relatório por e-mail para <strong>todos os clientes ativos</strong> que possuem e-mail cadastrado e ao menos um site.</p>
              <p className="text-sm">O envio é feito em lotes em segundo plano; com muitos clientes o processo pode levar alguns minutos. Deseja continuar?</p>
              {massReportProgress && (
                <p className="text-sm font-medium text-primary pt-2">
                  Enviando… {massReportProgress.processed}/{massReportProgress.total} clientes
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMassReportModalOpen(false)} disabled={massReportSending}>
              Cancelar
            </Button>
            <Button onClick={handleSendMassReport} disabled={massReportSending}>
              {massReportSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {massReportProgress ? `${massReportProgress.processed}/${massReportProgress.total}` : "Iniciando…"}
                </>
              ) : (
                "Enviar para todos"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {message && message.text && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : message.type === "info"
                ? "border-sky-200 bg-sky-50 text-sky-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{reports.length}</p>
              <p className="text-xs text-muted-foreground">Relatórios gerados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Send className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{reports.filter((r) => r.emailSent).length}</p>
              <p className="text-xs text-muted-foreground">Relatórios enviados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Download className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{reports.filter((r) => r.pdfGenerated).length}</p>
              <p className="text-xs text-muted-foreground">Downloads de PDF</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Histórico de relatórios</CardTitle>
              <CardDescription>
                {searchQuery.trim() ? (
                  <>
                    {filteredReports.length} de {reports.length} relatório{reports.length !== 1 ? "s" : ""} encontrado{filteredReports.length !== 1 ? "s" : ""}
                  </>
                ) : (
                  "Todos os relatórios gerados com status de envio e download."
                )}
              </CardDescription>
            </div>
            <div className="relative flex w-full shrink-0 items-center sm:w-72">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar cliente, período ou status..."
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
          </div>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                <TableHead>Relatório</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gerado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingReports ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando relatórios...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum relatório ainda. Envie relatórios individualmente pela página de Sites.
                  </TableCell>
                </TableRow>
              ) : filteredReports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum relatório encontrado para &quot;{searchQuery}&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReports.map((r) => (
                  <TableRow key={r.id ?? `${r.clientId}-${r.period}`}>
                    <TableCell className="font-medium">
                      Relatório {r.period}
                    </TableCell>
                    <TableCell>{r.clientName}</TableCell>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            r.emailSent
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-300"
                          }`}
                        >
                          {r.emailSent ? "Enviado" : "Falha no envio"}
                        </span>
                        {!r.emailSent && r.emailError && (
                          <Popover>
                            <PopoverTrigger
                              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-amber-600 hover:text-amber-800"
                              aria-label="Ver motivo do erro"
                            >
                              <Info className="h-4 w-4" />
                            </PopoverTrigger>
                            <PopoverContent className="max-w-sm" align="start">
                              <p className="font-medium text-sm mb-1">Motivo da falha</p>
                              <p className="text-sm text-muted-foreground">{translateEmailError(r.emailError)}</p>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(r.generatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:scale-110 hover:bg-accent/90 transition-all duration-200"
                          disabled={!!downloadingId}
                          aria-label="Baixar PDF"
                          title="Baixar relatório em PDF"
                          onClick={() => handleDownloadPdf(r)}
                        >
                          {downloadingId === (r.id ?? `${r.clientId}-${r.period}`) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        {r.id && (
                          <AlertDialog>
                            <AlertDialogTrigger
                              className={`inline-flex h-10 w-10 items-center justify-center rounded-md border-0 bg-transparent text-destructive hover:bg-destructive/10 hover:scale-110 transition-all duration-200 ${deletingId ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                              aria-label="Excluir relatório"
                              disabled={!!deletingId}
                            >
                              <Trash2 className="h-4 w-4" />
                            </AlertDialogTrigger>
                            <AlertDialogContent className="font-sans">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O registro será removido do histórico. Os contadores acima serão atualizados. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteReport(r.id!)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}
