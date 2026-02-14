"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useT } from "@/lib/i18n/context";
import { resizeImage } from "@/lib/image-utils";
import { ArrowLeft, Upload, X } from "lucide-react";

export default function EditModulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState("");
  const [descEs, setDescEs] = useState("");
  const [descEn, setDescEn] = useState("");
  const [icon, setIcon] = useState("");
  const [prefix, setPrefix] = useState("");
  const [language, setLanguage] = useState("");
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/modules/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setTitle(data.title || "");
        setDescEs(data.description?.es || "");
        setDescEn(data.description?.en || "");
        setIcon(data.icon || "");
        setPrefix(data.prefix || "");
        setLanguage(data.language || "");
        setImage(data.image || null);
      })
      .catch(() => setError("Module not found"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUri = await resizeImage(file);
      setImage(dataUri);
    } catch {
      setError("Failed to process image");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/modules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: { es: descEs, en: descEn || descEs },
          icon,
          prefix,
          language,
          image,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-[var(--muted)]">...</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link
        href="/admin/modules"
        className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t.adminPanel.back}
      </Link>

      <h1 className="text-2xl font-bold mb-6">{t.adminPanel.editModule}: {id}</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded bg-green-500/10 text-green-500 text-sm">{t.adminPanel.save} OK</div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">{t.adminPanel.moduleTitle}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">{t.adminPanel.moduleDescription} (ES)</label>
            <input
              type="text"
              value={descEs}
              onChange={(e) => setDescEs(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">{t.adminPanel.moduleDescription} (EN)</label>
            <input
              type="text"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">{t.adminPanel.moduleIcon}</label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Terminal, Box, Cog..."
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">{t.adminPanel.modulePrefix}</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted)]">{t.adminPanel.moduleLanguage}</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)] text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-[var(--muted)]">Image</label>
          {image ? (
            <div className="space-y-2">
              <Image src={image} alt="Module" width={400} height={225} className="w-full max-w-sm h-auto rounded border border-[var(--border)]" />
              <button
                type="button"
                onClick={() => { setImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="flex items-center gap-1 text-sm text-[var(--error)] hover:underline"
              >
                <X className="w-3 h-3" /> Remove image
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--muted)]" />
              <p className="text-sm text-[var(--muted)]">Click to upload image (auto-resized to 400x225)</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {saving ? t.profile.saving : t.adminPanel.save}
        </button>
      </form>
    </div>
  );
}
