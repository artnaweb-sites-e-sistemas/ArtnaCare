"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { ArrowLeft, Edit, ExternalLink, Trash2, Plus, MoreHorizontal } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { getClient, deleteClient, Client } from "@/lib/firebase/firestore"
import { getSitesByClient, Site } from "@/lib/firebase/sites"

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
              <span>{client.phone}</span>
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
              <p className="text-sm font-medium text-muted-foreground">Endereço</p>
              <p className="text-sm">{client.address || "—"}</p>
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
                      <TableCell>{site.status}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
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
