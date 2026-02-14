"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { CheckCircle, XCircle, Lightbulb, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/AuthProvider";

const CodeEditor = dynamic(() => import("@/components/editor/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[var(--muted)]">
      Cargando editor...
    </div>
  ),
});

const Terminal = dynamic(() => import("@/components/terminal/Terminal"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[var(--muted)]">
      Cargando terminal...
    </div>
  ),
});

interface LabLayoutProps {
  exerciseId: string;
  title: string;
  briefing: string;
  initialCode: string;
  language: string;
  onComplete: () => void;
}

interface FeedbackState {
  passed: boolean;
  summary: string;
  hint?: string;
}

export default function LabLayout({
  exerciseId,
  title,
  briefing,
  initialCode,
  language,
  onComplete,
}: LabLayoutProps) {
  const { lang, t } = useT();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [failureCount, setFailureCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(`devops-lab-failures-${exerciseId}`);
    return stored ? parseInt(stored, 10) || 0 : 0;
  });
  const codeRef = useRef(initialCode);

  const handleCodeChange = useCallback((value: string) => {
    codeRef.current = value;
  }, []);

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const userId = user?.id;
      const res = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          code: codeRef.current,
          failureCount,
          userId,
          lang,
        }),
      });
      const data = await res.json();

      setFeedback({
        passed: data.passed,
        summary: data.summary,
        hint: data.nextHint,
      });

      if (!data.passed) {
        setFailureCount((c) => {
          const next = c + 1;
          localStorage.setItem(`devops-lab-failures-${exerciseId}`, String(next));
          return next;
        });
      } else {
        onComplete();
      }
    } catch {
      setFeedback({
        passed: false,
        summary: t.lab.validationError,
      });
    }
    setIsValidating(false);
  };

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-[var(--muted)]">{briefing}</p>
        </div>
        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t.lab.validating}
            </>
          ) : (
            t.lab.validate
          )}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Editor panel */}
        <div className="flex-1 min-w-0 p-2">
          <CodeEditor
            language={language}
            initialValue={initialCode}
            onChange={handleCodeChange}
          />
        </div>

        {/* Terminal + Feedback panel */}
        <div className="w-[45%] min-w-0 flex flex-col p-2 gap-2">
          <div className="flex-1 min-h-0">
            <Terminal exerciseId={exerciseId} codeRef={codeRef} />
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`border rounded-lg p-4 max-h-[40%] overflow-y-auto ${
                feedback.passed
                  ? "border-[var(--success)] bg-[var(--success)]/10"
                  : "border-[var(--error)] bg-[var(--error)]/10"
              }`}
            >
              <div className="flex items-start gap-2">
                {feedback.passed ? (
                  <CheckCircle className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5" />
                )}
                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {feedback.summary}
                </pre>
              </div>

              {feedback.hint && (
                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
                  <p className="text-sm text-[var(--warning)]">
                    {feedback.hint}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
