"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ExternalLink, MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { getSites, Site } from "@/lib/firebase/sites"

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSites() {
      try {
        const data = await getSites()
        setSites(data)
      } catch (error) {
        console.error("Failed to load sites:", error)
      } finally {
        setLoading(false)
      }
    }
    loadSites()
  }, [])

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
                      <a href={site.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                        {site.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>{site.clientName || "—"}</TableCell>
                    <TableCell>{site.type}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColor(site.status)}`}>
                        {site.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/sites/${site.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">View</span>
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
  )
}
