import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "DevOps Learning Platform",
  description: "Aprende Terraform y Kubernetes resolviendo problemas reales",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <nav className="border-b border-[var(--border)] px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            DevOps Lab
          </Link>
          <div className="flex gap-6 text-sm text-[var(--muted)]">
            <Link href="/modules/terraform" className="hover:text-[var(--foreground)] transition-colors">
              Terraform
            </Link>
            <Link href="/modules/kubernetes" className="hover:text-[var(--foreground)] transition-colors">
              Kubernetes
            </Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
