"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { ArrowLeft, Edit, ExternalLink, Trash2, Plus, MoreHorizontal, Info } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { getClient, deleteClient, Client } from "@/lib/firebase/firestore"
import { getSitesByClient, Site } from "@/lib/firebase/sites"
import { formatPhoneDisplay, getPhoneDigits } from "@/lib/phone"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getClient(clientId)
        setClient(data)
      } catch (error) {
        console.error("Failed to load client:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [clientId])

  useEffect(() => {
    async function loadSites() {
      try {
        const data = await getSitesByClient(clientId)
        setSites(data)
      } catch (error) {
        console.error("Failed to load client sites:", error)
      } finally {
        setLoadingSites(false)
      }
    }

    if (clientId) {
      loadSites()
    }
  }, [clientId])

  const statusColor = (status: string) => {
    switch (status) {
      case "Healthy": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Warning": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "Critical": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case "Healthy": return "Saudável"
      case "Warning": return "Aviso"
      case "Critical": return "Crítico"
      case "Unknown": return "Desconhecido"
      default: return status
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this client?")) return
    setDeleting(true)
    try {
      await deleteClient(clientId)
      router.push("/dashboard/clients")
    } catch (error) {
      console.error("Failed to delete client:", error)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading client...</p>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-muted-foreground">Cliente não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar para clientes</span>
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{client.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <span>{client.email}</span>
              <span>•</span>
              <span>{formatPhoneDisplay(client.phone)}</span>
              <span>•</span>
              <span className={`font-medium ${
                client.status === "Active" ? "text-green-600 dark:text-green-400" : "text-gray-500"
              }`}>
                {client.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/clients/${clientId}/edit`}>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Detalhes do cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">{formatPhoneDisplay(client.phone)}</span>
                {client.phone && (
                  <Button size="sm" variant="outline" asChild className="h-8 w-8 p-0 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300">
                    <a href={`https://wa.me/${getPhoneDigits(client.phone)}`} target="_blank" rel="noreferrer" aria-label="Chamar no WhatsApp">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de sites</p>
              <p className="text-sm">{sites.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Sites vinculados</CardTitle>
              <CardDescription>Sites WordPress associados a este cliente.</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={`/dashboard/sites/new?clientId=${clientId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar site
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do site</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSites ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Carregando sites...
                    </TableCell>
                  </TableRow>
                ) : sites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Nenhum site vinculado a este cliente.
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
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {site.url}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColor(site.status)}`}>
                            {statusLabel(site.status)}
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
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild className="hover:scale-110 hover:bg-accent/90 transition-all duration-200">
                          <Link href={`/dashboard/sites/${site.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ver site</span>
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
