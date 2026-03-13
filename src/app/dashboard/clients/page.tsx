"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, Search, X } from "lucide-react"
import Link from "next/link"
import { getClients, deleteClient, Client } from "@/lib/firebase/firestore"
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
import { getSites } from "@/lib/firebase/sites"
import { formatPhoneDisplay, getPhoneDigits } from "@/lib/phone"

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [sitesCountByClientId, setSitesCountByClientId] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const loadData = async () => {
    try {
      const [clientsData, sitesData] = await Promise.all([getClients(), getSites()])
      setClients(clientsData)
      const count: Record<string, number> = {}
      for (const site of sitesData) {
        if (site.clientId) {
          count[site.clientId] = (count[site.clientId] || 0) + 1
        }
      }
      setSitesCountByClientId(count)
    } catch (error) {
      console.error("Failed to load clients:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.trim().toLowerCase()
    const name = (client.name || "").toLowerCase()
    const email = (client.email || "").toLowerCase()
    const status = (client.status || "").toLowerCase()
    return name.includes(q) || email.includes(q) || status.includes(q)
  })

  const handleDeleteClient = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteClient(id)
      await loadData()
    } catch (error) {
      console.error("Failed to delete client:", error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clientes</h2>
          <p className="text-muted-foreground">Gerencie as contas dos clientes e seus sites associados.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar cliente
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Todos os clientes</CardTitle>
              <CardDescription>
                {searchQuery.trim() ? (
                  <>
                    {filteredClients.length} de {clients.length} cliente{clients.length !== 1 ? "s" : ""} encontrado{filteredClients.length !== 1 ? "s" : ""}
                  </>
                ) : (
                  "Lista completa de clientes atualmente gerenciados pela ArtnaCare."
                )}
              </CardDescription>
            </div>
            <div className="relative flex w-full shrink-0 items-center sm:w-72">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Buscar nome, e-mail ou status..."
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
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Sites ativos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    Nenhum cliente encontrado para &quot;{searchQuery}&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/clients/${client.id}`} className="hover:underline">
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatPhoneDisplay(client.phone)}</span>
                        {client.phone && (
                          <Button variant="ghost" size="icon" asChild className="h-8 w-8 shrink-0 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800 hover:scale-110 transition-all duration-200 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950 dark:hover:text-green-300">
                            <a href={`https://wa.me/${getPhoneDigits(client.phone)}`} target="_blank" rel="noreferrer" aria-label="Chamar no WhatsApp">
                              <WhatsAppIcon className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{client.id ? (sitesCountByClientId[client.id] ?? 0) : 0}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          client.status === "Active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800/70 dark:text-slate-200"
                        }`}
                      >
                        {client.status === "Active" ? "Ativo" : client.status === "Inactive" ? "Inativo" : client.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild className="hover:scale-110 hover:bg-accent/90 transition-all duration-200">
                          <Link href={`/dashboard/clients/${client.id}/edit`} aria-label="Editar">
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
                              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O cliente e os dados associados serão removidos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => client.id && handleDeleteClient(client.id)}
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
