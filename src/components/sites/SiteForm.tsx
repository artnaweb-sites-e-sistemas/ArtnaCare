"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createSite, updateSite, Site } from "@/lib/firebase/sites"
import { getClients, Client } from "@/lib/firebase/firestore"
import { Info, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface SiteFormProps {
  site?: Site
  isEditing?: boolean
  defaultClientId?: string
}

export default function SiteForm({ site, isEditing = false, defaultClientId }: SiteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testSyncLoading, setTestSyncLoading] = useState(false)
  const [testSyncResult, setTestSyncResult] = useState<"success" | "error" | null>(null)
  const [testSyncMessage, setTestSyncMessage] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    name: site?.name || "",
    url: site?.url || "",
    clientId: site?.clientId || defaultClientId || "",
    clientName: site?.clientName || "",
    type: site?.type || "WordPress" as "WordPress" | "Static" | "Other",
    reportEmail: site?.reportEmail || "",
    wpAdminUrl: site?.wpAdminUrl || "",
    wpAdminUser: site?.wpAdminUser || "",
    wpAdminPassword: site?.wpAdminPassword || "",
    wpLoginPassword: site?.wpLoginPassword || "",
    serverLoginUrl: site?.serverLoginUrl || "",
    serverLoginUser: site?.serverLoginUser || "",
    serverLoginPassword: site?.serverLoginPassword || "",
  })

  useEffect(() => {
    async function loadClients() {
      const data = await getClients()
      setClients(data)
    }
    loadClients()
  }, [])

  // Garante que defaultClientId da URL seja aplicado ao formulário (ex: ao clicar "Adicionar site" no cliente)
  // e preenche o e-mail para relatórios com o e-mail do cliente, se houver
  useEffect(() => {
    if (defaultClientId && !isEditing && clients.length > 0) {
      const client = clients.find((c) => c.id === defaultClientId)
      setFormData((prev) => ({
        ...prev,
        clientId: defaultClientId,
        clientName: client?.name || prev.clientName,
        reportEmail: client?.email?.trim() || prev.reportEmail,
      }))
    }
  }, [defaultClientId, clients, isEditing])

  /** Garante que a URL tenha https:// e termine com / */
  const normalizeSiteUrl = (url: string) => {
    const u = (url || "").trim()
    if (!u) return ""
    const withProtocol = /^https?:\/\//i.test(u) ? u : "https://" + u
    return withProtocol.endsWith("/") ? withProtocol : withProtocol + "/"
  }

  const handleTestSync = async () => {
    const url = formData.wpAdminUrl?.trim() || formData.url?.trim()
    if (!url || !formData.wpAdminUser?.trim() || !formData.wpAdminPassword?.trim()) {
      toast.error("Preencha URL do WP Admin, usuário e senha de aplicação para testar.")
      return
    }
    setTestSyncLoading(true)
    setTestSyncResult(null)
    setTestSyncMessage("")
    try {
      const res = await fetch("/api/sites/test-wp-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formData.wpAdminUrl || formData.url,
          wpAdminUser: formData.wpAdminUser,
          wpAdminPassword: formData.wpAdminPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.ok) {
        setTestSyncResult("success")
        setTestSyncMessage("Sincronização OK! As credenciais estão corretas.")
        toast.success("Credenciais válidas.")
      } else {
        setTestSyncResult("error")
        const msg = data.error || "Falha ao conectar."
        setTestSyncMessage(msg)
        const reinforce = " Use a senha de aplicação (em Usuários → Perfil no WordPress), não a senha de login."
        toast.error(msg + (msg.includes("senha de aplicação") ? "" : reinforce))
      }
    } catch {
      setTestSyncResult("error")
      setTestSyncMessage("Erro ao testar. Verifique a URL e a conexão.")
      toast.error("Erro ao testar. Confira se está usando a senha de aplicação, não a senha de login do WordPress.")
    } finally {
      setTestSyncLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "clientId") {
      const selectedClient = clients.find(c => c.id === value)
      setFormData(prev => ({
        ...prev,
        clientId: value,
        clientName: selectedClient?.name || "",
        reportEmail: selectedClient?.email?.trim() || prev.reportEmail,
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    setTestSyncResult(null)
    setTestSyncMessage("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientId?.trim()) {
      toast.error("Selecione um cliente.")
      return
    }
    setLoading(true)
    try {
      if (isEditing && site?.id) {
        const url = normalizeSiteUrl(formData.url)
        await updateSite(site.id, {
          name: formData.name,
          url,
          clientId: formData.clientId.trim(),
          clientName: formData.clientName,
          type: formData.type,
          reportEmail: formData.reportEmail || undefined,
          wpAdminUrl: formData.wpAdminUrl || undefined,
          wpAdminUser: formData.wpAdminUser || undefined,
          wpAdminPassword: formData.wpAdminPassword || undefined,
          wpLoginPassword: formData.wpLoginPassword || undefined,
          serverLoginUrl: formData.serverLoginUrl || undefined,
          serverLoginUser: formData.serverLoginUser || undefined,
          serverLoginPassword: formData.serverLoginPassword || undefined,
        })
        toast.success("Site atualizado com sucesso.")
        router.push(`/dashboard/sites/${site.id}`)
      } else {
        const url = normalizeSiteUrl(formData.url)
        const newId = await createSite({
          name: formData.name,
          url,
          clientId: formData.clientId.trim(),
          clientName: formData.clientName,
          type: formData.type,
          status: "Unknown",
          reportEmail: formData.reportEmail || undefined,
          wpAdminUrl: formData.wpAdminUrl || undefined,
          wpAdminUser: formData.wpAdminUser || undefined,
          wpAdminPassword: formData.wpAdminPassword || undefined,
          wpLoginPassword: formData.wpLoginPassword || undefined,
          serverLoginUrl: formData.serverLoginUrl || undefined,
          serverLoginUser: formData.serverLoginUser || undefined,
          serverLoginPassword: formData.serverLoginPassword || undefined,
        })
        // Criar monitor no UptimeRobot automaticamente (se API key configurada)
        try {
          const res = await fetch("/api/integrations/uptimerobot/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: formData.name, url }),
          })
          const data = await res.json()
          if (data.monitorId) {
            await updateSite(newId, { uptimerobotMonitorId: data.monitorId })
          }
        } catch {
          // Ignora se UptimeRobot não estiver configurado
        }
        toast.success("Site criado com sucesso.")
        router.push(`/dashboard/sites/${newId}`)
      }
      router.refresh()
    } catch (error) {
      console.error("Error saving site:", error)
      toast.error("Erro ao salvar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? "Editar site" : "Novo site"}</CardTitle>
        <CardDescription>
          {isEditing ? "Atualize as informações do site." : "Adicione um novo site para monitorar."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do site</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Meu site" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" value={formData.url} onChange={handleChange} placeholder="https://example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente</Label>
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="WordPress">WordPress</option>
                <option value="Static">Estático</option>
                <option value="Other">Outros</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportEmail">E-mail para relatórios</Label>
            <Input id="reportEmail" name="reportEmail" type="email" value={formData.reportEmail} onChange={handleChange} placeholder="relatorios@exemplo.com" />
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="serverLoginUrl">URL de login do servidor</Label>
              <Input
                id="serverLoginUrl"
                name="serverLoginUrl"
                type="text"
                value={formData.serverLoginUrl}
                onChange={handleChange}
                placeholder="https://painel.hospedagem.com ou cPanel, etc."
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serverLoginUser">Login do servidor</Label>
                <Input
                  id="serverLoginUser"
                  name="serverLoginUser"
                  type="text"
                  value={formData.serverLoginUser}
                  onChange={handleChange}
                  placeholder="Usuário ou e-mail"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serverLoginPassword">Senha do servidor</Label>
                <Input
                  id="serverLoginPassword"
                  name="serverLoginPassword"
                  type="password"
                  value={formData.serverLoginPassword}
                  onChange={handleChange}
                  placeholder="Senha do painel"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Opcional. Se preenchida, o ícone de servidor no Monitoramento abrirá o link.</p>
          </div>

          {formData.type === "WordPress" && (
            <div className="border rounded-md p-4 space-y-4">
              <p className="text-sm font-medium">Credenciais do WordPress (opcional)</p>
              <div className="flex flex-wrap items-center gap-2">
                <Popover>
                  <PopoverTrigger
                    className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted-foreground hover:text-foreground"
                    aria-label="Como obter a senha de aplicação"
                  >
                    <Info className="h-4 w-4" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" align="start">
                    <p className="font-medium mb-2">Como obter a Senha de aplicação</p>
                    <p className="text-muted-foreground mb-2">Não use a senha de login. Crie uma senha especial no WordPress:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>No WordPress: Usuários → Perfil</li>
                      <li>Role até &quot;Senhas de aplicação&quot;</li>
                      <li>Digite um nome (ex: ArtnaCare) e clique em &quot;Adicionar nova senha de aplicação&quot;</li>
                      <li>Copie a senha gerada (formato: xxxx xxxx xxxx...)</li>
                      <li>Cole aqui no campo abaixo</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">A conta precisa ser Administrador. Nenhum plugin é necessário.</p>
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">
                  Opcional:{" "}
                  <a href="/api/download/wordpress-plugin" download="artnacare-updates.zip" className="text-primary underline hover:no-underline">
                    baixar plugin
                  </a>
                  {" "}para contagem de plugins desatualizados no relatório.
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wpAdminUrl">URL do WP Admin</Label>
                  <Input id="wpAdminUrl" name="wpAdminUrl" value={formData.wpAdminUrl} onChange={handleChange} placeholder="https://exemplo.com/wp-admin" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wpAdminUser">Usuário (nome de login)</Label>
                  <Input id="wpAdminUser" name="wpAdminUser" value={formData.wpAdminUser} onChange={handleChange} placeholder="admin" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wpAdminPassword">Senha de aplicação</Label>
                  <Input
                    id="wpAdminPassword"
                    name="wpAdminPassword"
                    type="password"
                    value={formData.wpAdminPassword}
                    onChange={handleChange}
                    placeholder="Cole a senha gerada no WordPress"
                  />
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                    Não use a senha de login do painel.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wpLoginPassword">Senha do WP</Label>
                  <Input
                    id="wpLoginPassword"
                    name="wpLoginPassword"
                    type="password"
                    value={formData.wpLoginPassword}
                    onChange={handleChange}
                    placeholder="Senha de login do painel WP (opcional)"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestSync}
                    disabled={testSyncLoading || !formData.wpAdminUser?.trim() || !formData.wpAdminPassword?.trim()}
                  >
                    {testSyncLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Testar sincronização
                  </Button>
                  {testSyncResult === "success" && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {testSyncMessage}
                    </span>
                  )}
                  {testSyncResult === "error" && testSyncMessage && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800 max-w-md">
                      <p className="font-medium inline-flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 shrink-0" />
                        {testSyncMessage}
                      </p>
                      <p className="mt-1.5 text-amber-700">
                        Confira se você usou a <strong>senha de aplicação</strong> (gerada em Usuários → Perfil no WordPress), e não a senha de login do painel.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Atualizar site" : "Criar site"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
