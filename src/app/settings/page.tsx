import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="mt-1 text-muted-foreground">Preferences and local data management.</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Draft Polling</CardTitle>
              <CardDescription>
                Active drafts refresh every 5 seconds. Complete drafts stop polling automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Polling interval configuration coming in a future update.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Local Data</CardTitle>
              <CardDescription>
                All data is stored locally in your browser via IndexedDB. No cloud sync in v1.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Persisted locally:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>Last Sleeper username</li>
                <li>Ranking sets and draft-specific copies</li>
                <li>Per-draft queues</li>
                <li>Player match overrides</li>
                <li>User preferences</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking Imports</CardTitle>
              <CardDescription>CSV, XLSX, and Google Sheet import support.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Import architecture is in place. Full parsing and player matching coming soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
