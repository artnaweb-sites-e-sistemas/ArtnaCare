"use client"

import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteForm from "@/components/sites/SiteForm"

export default function NewSitePage() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get("clientId") || undefined

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/sites">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Sites</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Add New Site</h2>
          <p className="text-muted-foreground">Register a new site for monitoring.</p>
        </div>
      </div>

      <SiteForm defaultClientId={clientId} />
    </div>
  )
}
