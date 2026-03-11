"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { ArrowLeft, Edit, ExternalLink, Trash2, Plus } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { getClient, deleteClient, Client } from "@/lib/firebase/firestore"

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

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
        <p className="text-muted-foreground">Client not found.</p>
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
              <span className="sr-only">Back to Clients</span>
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
              Edit
            </Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Address</p>
              <p className="text-sm">{client.address || "—"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sites</p>
              <p className="text-sm">{client.sites || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Linked Sites</CardTitle>
              <CardDescription>WordPress sites associated with this client.</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={`/dashboard/sites/new?clientId=${clientId}`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Site
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    Sites will appear here once the Sites module is connected.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
