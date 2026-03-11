"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Edit, ExternalLink, Trash2, Globe, Shield, Clock, Activity } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { getSite, deleteSite, Site } from "@/lib/firebase/sites"

export default function SiteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.id as string

  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getSite(siteId)
        setSite(data)
      } catch (error) {
        console.error("Failed to load site:", error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [siteId])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this site?")) return
    setDeleting(true)
    try {
      await deleteSite(siteId)
      router.push("/dashboard/sites")
    } catch (error) {
      console.error("Failed to delete site:", error)
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading site...</p>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/sites"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <p className="text-muted-foreground">Site not found.</p>
      </div>
    )
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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/sites">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{site.name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <a href={site.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                {site.url}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span>•</span>
              <span>{site.clientName || "No client"}</span>
              <span>•</span>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(site.status)}`}>
                {site.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/sites/${siteId}/edit`}>
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

      {/* Monitoring Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium">{site.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">SSL</p>
                <p className="text-sm font-medium">{site.sslValid === true ? "Valid" : site.sslValid === false ? "Invalid" : "Not checked"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Response Time</p>
                <p className="text-sm font-medium">{site.responseTime ? `${site.responseTime}ms` : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">WP Version</p>
                <p className="text-sm font-medium">{site.wpVersion || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitoring History placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring History</CardTitle>
          <CardDescription>Check results and performance trends for this site.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Monitoring history will appear here after checks are executed.
          </p>
        </CardContent>
      </Card>

      {/* Maintenance Log placeholder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Maintenance Log</CardTitle>
            <CardDescription>Record of maintenance actions performed on this site.</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            Add Entry
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No maintenance records yet.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
