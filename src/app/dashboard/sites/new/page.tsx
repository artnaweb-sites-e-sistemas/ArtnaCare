"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import SiteForm from "@/components/sites/SiteForm"

function NewSiteContent() {
  const searchParams = useSearchParams()
  const clientId = searchParams.get("clientId") || undefined

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/sites">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar para sites</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Adicionar novo site</h2>
          <p className="text-muted-foreground">Registre um novo site para monitoramento.</p>
        </div>
      </div>

      <SiteForm key={clientId || "new"} defaultClientId={clientId} />
    </div>
  )
}

export default function NewSitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>}>
      <NewSiteContent />
    </Suspense>
  )
}
