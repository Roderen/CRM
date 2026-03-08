import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Users, FolderKanban } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">CRM Dashboard</h1>
        <UserButton />
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/clients">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Clients</CardTitle>
                    <CardDescription>Manage your clients</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/projects">
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-6 w-6 text-primary" />
                  <div>
                    <CardTitle>Projects</CardTitle>
                    <CardDescription>View all projects</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
