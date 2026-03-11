"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteForm from "@/components/sites/SiteForm"
import { getSite, Site } from "@/lib/firebase/sites"

export default function EditSitePage() {
  const params = useParams()
  const siteId = params.id as string
  const [site, setSite] = useState<Site | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/sites/${siteId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Site</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit {site.name}</h2>
          <p className="text-muted-foreground">Update this site&apos;s information.</p>
        </div>
      </div>

      <SiteForm site={site} isEditing />
    </div>
  )
}
