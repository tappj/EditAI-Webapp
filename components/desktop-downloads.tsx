"use client";
import { useEffect, useState } from "react";
import releases from "../lib/desktop-releases.json";
type Release = {
  platform: "macos" | "windows";
  arch: "arm64" | "x64";
  version: string;
  url: string;
  signed: boolean;
  notarized?: boolean;
  tested: boolean;
};
// Populated only by the release verifier after signing and platform acceptance.
const available = (releases as Release[]).filter(
  (r) =>
    r.signed &&
    r.tested &&
    (r.platform !== "macos" || r.notarized) &&
    /^https:\/\/github\.com\/tappj\/EditAI-Webapp\/releases\/download\/v[\w.-]+\/EditAI-[\w.-]+\.(dmg|exe)$/.test(
      r.url,
    ),
);
export function DesktopDownloads({ openWeb = false }: { openWeb?: boolean }) {
  // Wait for device detection before rendering installers, including during SSR.
  const [preferred, setPreferred] = useState<string | null>(null);
  useEffect(() => {
    const mobile =
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (mobile) return;
    setPreferred(/Windows/i.test(navigator.userAgent) ? "windows" : "macos");
  }, []);
  const sorted = [...available].sort(
    (a, b) =>
      Number(b.platform === preferred) - Number(a.platform === preferred),
  );
  return (
    <div className="desktop-options">
      {openWeb && (
        <button
          className="open-web"
          onClick={() => {
            const gate = document.querySelector<HTMLElement>(".sign-in-card");
            gate?.scrollIntoView({ behavior: "smooth", block: "center" });
            gate
              ?.querySelector<HTMLButtonElement>("button")
              ?.focus({ preventScroll: true });
          }}
        >
          Open EditAI Web <span aria-hidden="true">↗</span>
        </button>
      )}
      {preferred &&
        sorted.map((r) => (
          <a
            className="desktop-download"
            key={r.platform + r.arch}
            href={r.url}
          >
            Download for {r.platform === "macos" ? "macOS" : "Windows"} ·{" "}
            {r.arch === "arm64"
              ? "Apple silicon"
              : r.platform === "macos"
                ? "Intel"
                : "Intel / AMD"}{" "}
            <small>v{r.version}</small>
          </a>
        ))}
      {preferred && !available.length && (
        <p className="desktop-status">
          Desktop preview: local files and native FFmpeg. Public installers are
          awaiting signing and release verification.{" "}
          <a
            href="https://github.com/tappj/EditAI-Webapp/tree/codex/desktop-migration"
            target="_blank"
            rel="noreferrer"
          >
            View desktop source ↗
          </a>
        </p>
      )}
    </div>
  );
}
