"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ExternalLink, Pencil, Trash2, Info } from "lucide-react"
import Link from "next/link"
import { getSites, deleteSite, Site } from "@/lib/firebase/sites"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
          <CardTitle>Todos os sites</CardTitle>
          <CardDescription>Visão geral de todos os sites monitorados pela ArtnaCare.</CardDescription>
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
              ) : (
                sites.map((site) => (
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
                    <TableCell>{site.type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColor(site.status)}`}>
                          {site.status === "Healthy" ? "Saudável" : site.status === "Warning" ? "Aviso" : site.status === "Critical" ? "Crítico" : site.status === "Unknown" ? "Desconhecido" : site.status}
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <span role="button" tabIndex={0} className="inline-flex cursor-pointer text-muted-foreground hover:text-foreground" aria-label="Ver detalhes do status">
                              <Info className="h-4 w-4" />
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
                              <p className="text-sm text-muted-foreground">Execute as verificações em Monitoramento para obter os detalhes.</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/sites/${site.id}/edit`} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!!deletingId}
                              aria-label="Excluir"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
