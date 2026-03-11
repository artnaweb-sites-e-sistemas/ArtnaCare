"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createSite, updateSite, Site } from "@/lib/firebase/sites"
import { getClients, Client } from "@/lib/firebase/firestore"

interface SiteFormProps {
  site?: Site
  isEditing?: boolean
  defaultClientId?: string
}

export default function SiteForm({ site, isEditing = false, defaultClientId }: SiteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    name: site?.name || "",
    url: site?.url || "",
    clientId: site?.clientId || defaultClientId || "",
    clientName: site?.clientName || "",
    type: site?.type || "WordPress" as "WordPress" | "Static" | "Other",
    reportEmail: site?.reportEmail || "",
    wpAdminUrl: site?.wpAdminUrl || "",
    wpAdminUser: site?.wpAdminUser || "",
    wpAdminPassword: site?.wpAdminPassword || "",
  })

  useEffect(() => {
    async function loadClients() {
      const data = await getClients()
      setClients(data)
    }
    loadClients()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === "clientId") {
      const selectedClient = clients.find(c => c.id === value)
      setFormData(prev => ({ ...prev, clientId: value, clientName: selectedClient?.name || "" }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isEditing && site?.id) {
        await updateSite(site.id, formData)
        router.push(`/dashboard/sites/${site.id}`)
      } else {
        const newId = await createSite({ ...formData, status: "Unknown" })
        router.push(`/dashboard/sites/${newId}`)
      }
      router.refresh()
    } catch (error) {
      console.error("Error saving site:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Site" : "New Site"}</CardTitle>
        <CardDescription>
          {isEditing ? "Update site information." : "Add a new site to monitor."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Site Name</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="My Website" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input id="url" name="url" value={formData.url} onChange={handleChange} placeholder="https://example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client</Label>
              <select
                id="clientId"
                name="clientId"
                value={formData.clientId}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="WordPress">WordPress</option>
                <option value="Static">Static</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportEmail">Report Email</Label>
            <Input id="reportEmail" name="reportEmail" type="email" value={formData.reportEmail} onChange={handleChange} placeholder="reports@example.com" />
          </div>

          {formData.type === "WordPress" && (
            <div className="border rounded-md p-4 space-y-4">
              <p className="text-sm font-medium">WordPress Credentials (Optional)</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="wpAdminUrl">WP Admin URL</Label>
                  <Input id="wpAdminUrl" name="wpAdminUrl" value={formData.wpAdminUrl} onChange={handleChange} placeholder="https://example.com/wp-admin" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wpAdminUser">WP Admin User</Label>
                  <Input id="wpAdminUser" name="wpAdminUser" value={formData.wpAdminUser} onChange={handleChange} placeholder="admin" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="wpAdminPassword">WP Admin Password</Label>
                  <Input id="wpAdminPassword" name="wpAdminPassword" type="password" value={formData.wpAdminPassword} onChange={handleChange} placeholder="••••••••" />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEditing ? "Update Site" : "Create Site"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
