"use client";

import { useT } from "@/lib/i18n/context";

const providerInfo: Record<
  string,
  { label: string; bgClass: string; icon: string }
> = {
  google: { label: "Google", bgClass: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50", icon: "G" },
  github: { label: "GitHub", bgClass: "bg-[#24292f] text-white hover:bg-[#1b1f23]", icon: "GH" },
  azure: { label: "Microsoft", bgClass: "bg-[#0078d4] text-white hover:bg-[#106ebe]", icon: "MS" },
};

export default function OAuthButtons({
  providers,
}: {
  providers: string[];
}) {
  const { t } = useT();

  if (providers.length === 0) return null;

  return (
    <div className="space-y-2">
      {providers.map((provider) => {
        const info = providerInfo[provider];
        if (!info) return null;
        return (
          <a
            key={provider}
            href={`/api/auth/oauth/${provider}`}
            className={`flex items-center justify-center gap-2 w-full py-2 px-4 rounded font-medium transition-colors ${info.bgClass}`}
          >
            <span className="font-bold text-sm">{info.icon}</span>
            {t.auth.continueWith} {info.label}
          </a>
        );
      })}
    </div>
  );
}
