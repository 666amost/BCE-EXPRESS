"use client"

import { AdminDashboard } from "@/app/admin/components/AdminDashboard"
import { LeaderAuthGuard } from "@/components/leader-auth-guard"
import { ErrorBoundary } from "@/components/error-boundary"

export default function AdminDashboardPage() {
  return (
    <ErrorBoundary>
      <LeaderAuthGuard>
        <AdminDashboard />
      </LeaderAuthGuard>
    </ErrorBoundary>
  )
}

