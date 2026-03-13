"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ExternalLink, Pencil, Trash2, Info, Search, X } from "lucide-react"
import Link from "next/link"
import { getSites, deleteSite, Site } from "@/lib/firebase/sites"
import { getSiteTypeLabel } from "@/lib/site-types"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
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

function normalizeDisplayUrl(url: string) {
  const u = (url || "").trim()
  if (!u) return ""
  const withProtocol = /^https?:\/\//i.test(u) ? u : "https://" + u
  return withProtocol.endsWith("/") ? withProtocol : withProtocol + "/"
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const loadSites = async () => {
    try {
      const data = await getSites()
      setSites(data)
    } catch (error) {
      console.error("Failed to load sites:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSites()
  }, [])

  const handleDeleteSite = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteSite(id)
      await loadSites()
    } catch (error) {
      console.error("Failed to delete site:", error)
    } finally {
      setDeletingId(null)
    }
  }

const filteredSites = sites.filter((site) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    const name = (site.name || "").toLowerCase()
    const url = (site.url || "").toLowerCase()
    const client = (site.clientName || "").toLowerCase()
    const type = (site.type || "").toLowerCase()
    const status = site.status === "Healthy" ? "saudável" : site.status === "Warning" ? "aviso" : site.status === "Critical" ? "crítico" : (site.status || "").toLowerCase()
    return name.includes(q) || url.includes(q) || client.includes(q) || type.includes(q) || status.includes(q)
  })

  const statusColor = (status: string) => {
    switch (status) {
      case "Healthy": return "bg-emerald-100 text-emerald-800"
      case "Warning": return "bg-amber-100 text-amber-800"
      case "Critical": return "bg-rose-100 text-rose-800"
      default: return "bg-slate-100 text-slate-800"
    }
  }

  const getSiteTypeIconPath = (siteType?: string | null): string | null => {
    if (!siteType) return null
    const t = siteType.toLowerCase()
    if (t.includes("wordpress")) return "/icon/wordpress.png"
    if (t.includes("html")) return "/icon/html 5.svg"
    if (t.includes("woocommerce")) return "/icon/woocommerce.png"
    if (t.includes("shopify")) return "/icon/shopify.svg"
    return "/icon/website.svg"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sites</h2>
          <p className="text-muted-foreground">Monitore e gerencie todos os sites WordPress.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/sites/new">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar site
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Todos os sites</CardTitle>
              <CardDescription>
                {searchQuery.trim() ? (
                  <>
                    {filteredSites.length} de {sites.length} site{sites.length !== 1 ? "s" : ""} encontrado{filteredSites.length !== 1 ? "s" : ""}
                  </>
                ) : (
                  "Visão geral de todos os sites monitorados pela ArtnaCare."
                )}
              </CardDescription>
            </div>
            <div className="relative flex w-full shrink-0 items-center sm:w-72">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar nome, URL, cliente ou status..."
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
                <TableHead>Nome do site</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Carregando sites...
                  </TableCell>
                </TableRow>
              ) : sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhum site encontrado.
                  </TableCell>
                </TableRow>
              ) : filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhum site encontrado para &quot;{searchQuery}&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/sites/${site.id}`} className="hover:underline">
                        {site.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <a href={normalizeDisplayUrl(site.url)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                        {normalizeDisplayUrl(site.url)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>{site.clientName || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const iconPath = getSiteTypeIconPath(site.type)
                          if (!iconPath) return null
                          return (
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                              <img
                                src={iconPath}
                                alt={site.type ?? "Tipo de site"}
                                className="h-4 w-4 object-contain"
                              />
                            </span>
                          )
                        })()}
                        <span className="text-xs text-muted-foreground">
                          {getSiteTypeLabel(site.type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger
                          className="inline-flex cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted-foreground hover:text-foreground"
                          aria-label="Ver detalhes do status"
                        >
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColor(
                              site.status,
                            )}`}
                          >
                            {site.status === "Healthy"
                              ? "Saudável"
                              : site.status === "Warning"
                                ? "Aviso"
                                : site.status === "Critical"
                                  ? "Crítico"
                                  : site.status === "Unknown"
                                    ? "Desconhecido"
                                    : site.status}
                            <Info className="h-3.5 w-3.5" />
                          </span>
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
                            <p className="text-sm text-muted-foreground">
                              Execute as verificações em Monitoramento para obter os detalhes.
                            </p>
                          )}
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild className="hover:scale-110 hover:bg-accent/90 transition-all duration-200">
                          <Link href={`/dashboard/sites/${site.id}/edit`} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            className={`inline-flex h-10 w-10 items-center justify-center rounded-md border-0 bg-transparent text-destructive hover:bg-destructive/10 hover:scale-110 transition-all duration-200 ${deletingId ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir site?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O site será removido do monitoramento.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => site.id && handleDeleteSite(site.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
