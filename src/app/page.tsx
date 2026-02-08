import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-57px)]">
      <h1 className="text-4xl font-bold tracking-tight mb-4">
        Aprende DevOps rompiendo cosas
      </h1>
      <p className="text-[var(--muted)] text-lg mb-12 max-w-xl text-center">
        Ejercicios interactivos de Terraform y Kubernetes. Código roto, terminal simulada, feedback inmediato.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-2xl w-full px-6">
        <div className="border border-[var(--border)] rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">1</div>
          <div className="font-medium mb-1">Lee el briefing</div>
          <div className="text-sm text-[var(--muted)]">2-3 líneas que explican qué está roto y por qué importa</div>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">2</div>
          <div className="font-medium mb-1">Corrige el código</div>
          <div className="text-sm text-[var(--muted)]">Editor con el código roto, terminal que simula comandos reales</div>
        </div>
        <div className="border border-[var(--border)] rounded-lg p-6 text-center">
          <div className="text-2xl mb-2">3</div>
          <div className="font-medium mb-1">Valida tu solución</div>
          <div className="text-sm text-[var(--muted)]">Feedback técnico inmediato: qué falló, por qué, y cómo se arregla</div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/modules/terraform"
          className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium transition-colors"
        >
          Terraform
        </Link>
        <Link
          href="/modules/kubernetes"
          className="px-6 py-3 border border-[var(--border)] hover:bg-[var(--surface-hover)] rounded-lg font-medium transition-colors"
        >
          Kubernetes
        </Link>
      </div>
    </div>
  );
}
