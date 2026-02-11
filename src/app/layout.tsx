import type { Metadata } from "next";
import "@/styles/globals.css";
import { LanguageProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme/context";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Navbar from "@/components/Navbar";

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
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <Navbar />
              <main>{children}</main>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
