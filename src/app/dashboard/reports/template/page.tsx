"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const PLACEHOLDERS = [
  { key: "{{clientName}}", desc: "Nome do cliente" },
  { key: "{{period}}", desc: "Período (ex: março 2026)" },
  { key: "{{sitesTotal}}", desc: "Total de sites" },
  { key: "{{sitesHealthy}}", desc: "Sites saudáveis" },
  { key: "{{sitesWarning}}", desc: "Sites com avisos" },
  { key: "{{sitesCritical}}", desc: "Sites críticos" },
  { key: "{{uptimePercentage}}", desc: "Percentual de uptime" },
]

export default function ReportTemplatePage() {
  const [html, setHtml] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch("/api/reports/template")
      .then((res) => res.json())
      .then((data) => {
        setHtml(data.html ?? "")
      })
      .catch(() => toast.error("Erro ao carregar modelo"))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/reports/template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Erro ao salvar")
      toast.success("Modelo salvo com sucesso!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar modelo")
    } finally {
      setSaving(false)
    }
  }

  const previewHtml = useMemo(() => {
    if (!html.trim()) return ""
    return html
      .replace(/\{\{clientName\}\}/g, "Cliente Exemplo")
      .replace(/\{\{period\}\}/g, "março 2026")
      .replace(/\{\{sitesTotal\}\}/g, "5")
      .replace(/\{\{sitesHealthy\}\}/g, "3")
      .replace(/\{\{sitesWarning\}\}/g, "1")
      .replace(/\{\{sitesCritical\}\}/g, "1")
      .replace(/\{\{uptimePercentage\}\}/g, "98")
  }, [html])

  const insertPlaceholder = (placeholder: string) => {
    const ta = textareaRef.current
    if (ta) {
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const newHtml = html.slice(0, start) + placeholder + html.slice(end)
      setHtml(newHtml)
      setTimeout(() => {
        ta.focus()
        ta.setSelectionRange(start + placeholder.length, start + placeholder.length)
      }, 0)
    } else {
      setHtml((prev) => prev + placeholder)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="hover:scale-110 hover:bg-accent/90 transition-all duration-200">
            <Link href="/dashboard/reports" aria-label="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Editar modelo do relatório</h2>
            <p className="text-muted-foreground">
              Personalize o HTML usado como base para envio dos relatórios aos clientes.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar modelo
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>HTML do modelo</CardTitle>
            <CardDescription>
              Use os placeholders abaixo para inserir os dados dinâmicos em cada relatório.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="h-[500px] w-full resize-y rounded-md border bg-muted/30 p-4 font-mono text-sm"
                placeholder="Cole ou edite o HTML do modelo..."
                spellCheck={false}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visualização</CardTitle>
            <CardDescription>
              Prévia do relatório com dados de exemplo. Atualiza automaticamente ao editar o HTML.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-slate-50 p-4">
              <iframe
                srcDoc={previewHtml}
                title="Prévia do relatório"
                className="h-[500px] w-full rounded border-0 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Placeholders</CardTitle>
          <CardDescription>Clique para inserir no cursor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS.map(({ key, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => insertPlaceholder(key)}
                className="rounded-md border bg-muted/30 px-3 py-2 text-left text-xs font-mono hover:bg-muted/60 transition-colors"
                title={desc}
              >
                <span className="font-semibold text-primary">{key}</span>
                <span className="ml-1.5 text-muted-foreground">— {desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
