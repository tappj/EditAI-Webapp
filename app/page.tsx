"use client";
import {
  MarketingLanding,
  MarketingSignIn,
} from "../components/marketing/landing";
import "./marketing.css";
import { DesktopDownloads } from "../components/desktop-downloads";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Copy,
  Download,
  Film,
  FolderOpen,
  Home,
  ImageIcon,
  Layers,
  LoaderCircle,
  LogOut,
  Menu,
  Mic,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Split,
  Square,
  Subtitles,
  Trash2,
  Type,
  Undo2,
  Upload,
  UserRound,
  Video,
  Volume2,
  X,
} from "lucide-react";
import {
  newDocument,
  newSegment,
  appearance,
  duplicate,
  duration,
  atTime,
  segmentDuration,
  split,
  captions,
  filters,
  applyCuts,
  planCuts,
  applyOperations,
  supportedOperations,
  textTiming,
  validate,
} from "@/lib/editor/model";
import type {
  Document,
  Project,
  Source,
  Word,
  Segment,
  TextLayer,
} from "@/lib/editor/model";
import {
  probe,
  normalizeRecording,
  Player,
  canvasSize,
  extractAudio,
  cancelFFmpeg,
} from "@/lib/editor/media";
import {
  saveMedia,
  loadMedia,
  saveProject,
  listProjects,
  deleteProject,
  clearStorage,
  setStorageScope,
} from "@/lib/editor/storage";
import {
  desktop,
  mediaURL,
  mediaBlob,
  type MediaResource,
} from "@/lib/editor/desktop";
import { FONTS } from "@/lib/editor/fonts";
import { makeReference, type Reference } from "@/lib/editor/reference";
import { ADVANCED_ADJUSTMENTS, POSITIVE_ADJUSTMENTS } from "@/lib/editor/color";
import { Button, IconButton, Range, Wordmark } from "./components/ui";
import { ProjectCard } from "./components/ProjectCard";
import { Recorder } from "./components/Recorder";
import { Batch } from "./components/Batch";
import { TextStyleEditor } from "./components/TextStyleEditor";
import { AppearanceEditor } from "./components/AppearanceEditor";
import { quietPauses } from "@/lib/editor/audio-evidence";
type Screen =
  | "home"
  | "library"
  | "editor"
  | "settings"
  | "record"
  | "batch"
  | "analysis"
  | "transcript";
const time = (n: number) =>
  `${Math.floor(n / 60)}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
const colors = [
  "#ffffff",
  "#111111",
  "#fff176",
  "#a8f0f0",
  "#c4e0ff",
  "#f9bdd5",
];
let activeSignal: AbortSignal | undefined;
async function api(path: string, body?: unknown, method?: string) {
  const r = await fetch("/api/" + path, {
    signal: path.startsWith("ai/") ? activeSignal : undefined,
    method: method || (body === undefined ? "GET" : "POST"),
    headers:
      body instanceof FormData ? {} : { "content-type": "application/json" },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const b: any = await r.json().catch(() => ({
    error: "EditAI could not read a server response. Please retry.",
  }));
  if (!r.ok) {
    const e: any = new Error(b.error || "Request failed.");
    e.url = b.url;
    e.status = r.status;
    throw e;
  }
  return b;
}
export default function App({ signIn = false }: { signIn?: boolean }) {
  const [session, setSession] = useState<any>(null),
    [gateError, setGateError] = useState(""),
    [pending, setPending] = useState(true),
    [screen, setScreen] = useState<Screen>("home"),
    [project, setProject] = useState<Project | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [urls, setUrls] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(""),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [errorURL, setErrorURL] = useState(""),
    [notice, setNotice] = useState(""),
    [playhead, setPlayhead] = useState(0),
    [playing, setPlaying] = useState(false),
    [selected, setSelected] = useState(""),
    [tool, setTool] = useState("clip"),
    [selectedText, setSelectedText] = useState(""),
    [exportOpen, setExportOpen] = useState(false),
    [resolution, setResolution] = useState(1280),
    [fps, setFps] = useState(30),
    [history, setHistory] = useState<Document[]>([]),
    [future, setFuture] = useState<Document[]>([]),
    [messages, setMessages] = useState<
      { role: "user" | "assistant"; text: string }[]
    >([]),
    [prompt, setPrompt] = useState(""),
    [ownKey, setOwnKey] = useState(""),
    [consent, setConsent] = useState(false),
    [telemetry, setTelemetry] = useState(true),
    [theme, setTheme] = useState("system"),
    [language, setLanguage] = useState("auto"),
    [summary, setSummary] = useState<any>(null),
    [profileName, setProfileName] = useState(""),
    [avatar, setAvatar] = useState<string | null>(null),
    [privacy, setPrivacy] = useState(false),
    [menu, setMenu] = useState(false),
    [cloud, setCloud] = useState(false);
  const authPopup = useRef<Window | null>(null);
  const [authOpened, setAuthOpened] = useState(false);
  const [blockedAuthURL, setBlockedAuthURL] = useState("");
  const recordingDirty = useRef(false);
  const lastPlayheadPaint = useRef(0);
  const input = useRef<HTMLInputElement>(null),
    extraInput = useRef<HTMLInputElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    player = useRef<Player | null>(null),
    abort = useRef<AbortController | null>(null),
    purpose = useRef("edit"),
    projectRef = useRef(project),
    urlsRef = useRef(urls),
    mediaKind = useRef("overlay");
  projectRef.current = project;
  urlsRef.current = urls;
  const [reference, setReference] = useState<Reference | null>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const doc = project?.document,
    total = doc ? duration(doc) : 0,
    segment = doc?.segments.find((s) => s.id === selected) || doc?.segments[0],
    textLayer = doc?.texts.find((t) => t.id === selectedText);
  useEffect(() => {
    if (!privacy && !exportOpen && !busy) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const el = document.querySelector(".modal") as HTMLElement | null;
      if (el) {
        el.setAttribute("role", "dialog");
        el.setAttribute("aria-modal", "true");
        el.tabIndex = -1;
        el.focus();
      }
    }, 0);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setPrivacy(false);
        setExportOpen(false);
      }
      if (e.key === "Tab") {
        const el = document.querySelector(".modal");
        const controls = Array.from(
          el?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a,input,select,textarea",
          ) || [],
        );
        if (!controls.length) return;
        const first = controls[0],
          last = controls.at(-1)!;
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [privacy, exportOpen, !!busy]);
  const fail = useCallback((e: any) => {
    setError(e.message || String(e));
    setErrorURL(e.url || "");
  }, []);
  useEffect(() => {
    if (session?.screen.id !== "sign_in" && authPopup.current) {
      // COOP may sever the WindowProxy after cross-origin navigation. Closing
      // is best effort; never weaken media isolation to control an auth window.
      if (!authPopup.current.closed) authPopup.current.close();
      authPopup.current = null;
    }
    if (session?.screen.id === "ready") {
      setAuthOpened(false);
      setBlockedAuthURL("");
    }
  }, [session?.screen.id]);
  const refresh = useCallback(async () => {
    try {
      const s = await api("session");
      setSession(s);
      setGateError("");
      setConsent(s.profile.consent);
      setTelemetry(s.profile.telemetry);
      setProfileName(s.profile.displayName || "");
      setAvatar(s.profile.avatar || null);
    } catch (e: any) {
      setGateError(e.message);
    } finally {
      setPending(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    let p: any = {};
    try {
      p = JSON.parse(localStorage.getItem("editai-preferences") || "{}");
    } catch {}
    setTheme(p.theme || "system");
    setLanguage(p.language || "auto");
  }, [refresh]);
  useEffect(() => {
    const dark =
      theme === "dark" ||
      (theme === "system" &&
        matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem(
      "editai-preferences",
      JSON.stringify({ theme, language }),
    );
  }, [theme, language, profileName]);
  useEffect(() => {
    if (session?.screen.id === "ready" || (!signIn && !desktop())) return;
    const started = Date.now();
    const resumed = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", resumed);
    document.addEventListener("visibilitychange", resumed);
    const id = setInterval(() => {
      if (Date.now() - started >= 600000) {
        clearInterval(id);
        setGateError("Sign-in is still pending. Use Retry to check again.");
        return;
      }
      if (document.visibilityState === "visible") void refresh();
    }, 3000);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", resumed);
      document.removeEventListener("visibilitychange", resumed);
    };
  }, [session?.screen.id, refresh, signIn]);
  useEffect(() => {
    if (session?.screen.id !== "ready") return;
    setStorageScope(session.profile.ownerId || session.profile.handle);
    void listProjects().then(setProjects);
    void api("projects")
      .then(async (b) => {
        for (const p of b.projects || []) {
          const remote = {
            id: p.id,
            title: p.title,
            document: JSON.parse(p.document),
            updatedAt: p.updated_at,
          };
          const local = (await listProjects()).find((x) => x.id === p.id);
          if (!local || local.updatedAt < remote.updatedAt)
            await saveProject(remote);
        }
        setProjects(await listProjects());
      })
      .catch(fail);
    let active = false;
    const event = () => {
      active = true;
    };
    document.addEventListener("pointerdown", event);
    document.addEventListener("keydown", event);
    void api("telemetry", {}).catch(() => {});
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && active) {
        active = false;
        void api("telemetry", {}).catch(() => {});
      }
    }, 1800000);
    return () => {
      clearInterval(timer);
      document.removeEventListener("pointerdown", event);
      document.removeEventListener("keydown", event);
    };
  }, [session?.screen.id, fail]);
  useEffect(() => {
    if (!project) return;
    const timer = setTimeout(async () => {
      const p = { ...project, updatedAt: Date.now() };
      await saveProject(p);
      setProjects(await listProjects());
      if (session?.screen.id === "ready")
        api("projects", {
          id: p.id,
          title: p.title,
          document: p.document,
        }).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [project, session?.screen.id]);
  useEffect(() => {
    if (screen !== "editor" || !canvas.current || !doc) return;
    const size = canvasSize(doc, resolution);
    canvas.current.width = size.width;
    canvas.current.height = size.height;
    const p = new Player(canvas.current, doc, urls, (t) => {
      const now = performance.now();
      if (!player.current?.playing || now - lastPlayheadPaint.current > 100) {
        lastPlayheadPaint.current = now;
        setPlayhead(t);
      }
    });
    p.onEnd = () => setPlaying(false);
    p.onError = (s) => setError(s);
    player.current = p;
    void p
      .init()
      .then(() => {
        if (player.current === p) p.seek(p.time);
      })
      .catch(fail);
    return () => {
      p.destroy();
      player.current = null;
    };
  }, [screen, project?.id, urls, resolution]);
  useEffect(() => {
    if (!doc || !player.current) return;
    player.current.doc = doc;
    const size = canvasSize(doc, resolution);
    player.current.canvas.width = size.width;
    player.current.canvas.height = size.height;
    player.current.seek(Math.min(playhead, duration(doc)));
    for (const font of new Set(doc.texts.map((t) => t.font)))
      void document.fonts
        .load(`600 30px "${font}"`)
        .then(() => player.current?.draw());
  }, [doc, resolution]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        ) ||
        screen !== "editor"
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key.toLowerCase() === "s" && selected) {
        try {
          const a = atTime(
            projectRef.current!.document,
            player.current?.time || 0,
          );
          if (a)
            change(split(projectRef.current!.document, selected, a.sourceTime));
        } catch (e) {
          fail(e);
        }
      }
    };
    addEventListener("keydown", fn);
    return () => removeEventListener("keydown", fn);
  });
  useEffect(
    () => () => {
      for (const u of Object.values(urlsRef.current)) URL.revokeObjectURL(u);
    },
    [],
  );
  function change(d: Document) {
    if (!projectRef.current) return;
    try {
      validate(d);
      setHistory((h) => [
        ...h.slice(-99),
        structuredClone(projectRef.current!.document),
      ]);
      setFuture([]);
      setProject((p) => (p ? { ...p, document: d } : p));
    } catch (e) {
      fail(e);
    }
  }
  function patch(fn: (d: Document) => void) {
    if (!doc) return;
    const copy = structuredClone(doc);
    fn(copy);
    change(copy);
  }
  function updateClip(fn: (s: Segment) => void) {
    if (!segment) return;
    patch((d) => fn(d.segments.find((s) => s.id === segment.id)!));
  }
  function undo() {
    if (!history.length || !doc) return;
    setFuture((f) => [doc, ...f]);
    setProject((p) => (p ? { ...p, document: history.at(-1)! } : p));
    setHistory((h) => h.slice(0, -1));
  }
  function redo() {
    if (!future.length || !doc) return;
    setHistory((h) => [...h, doc]);
    setProject((p) => (p ? { ...p, document: future[0] } : p));
    setFuture((f) => f.slice(1));
  }
  function togglePlay() {
    if (!player.current) return;
    if (playing) {
      player.current.pause();
      setPlaying(false);
    } else {
      if (player.current.time >= total - 0.02) player.current.seek(0);
      player.current.play();
      setPlaying(true);
    }
  }
  async function choose(choice: string) {
    try {
      if (choice === "sign_in" || choice === "get_plan") {
        const url = session.claimURL;
        if (url) {
          const popup = window.open(
            "about:blank",
            "editai-publik",
            "popup,width=540,height=720",
          );
          setAuthOpened(true);
          if (popup) {
            popup.opener = null;
            popup.location.href = url;
            authPopup.current = popup;
          } else setBlockedAuthURL(url);
        }
        return;
      }
      await api("choice", {
        choice: choice === "connect" ? "publik" : "own_key",
      });
      await refresh();
      if (choice === "own_key") setScreen("settings");
    } catch (e) {
      fail(e);
    }
  }
  async function run(label: string, fn: () => Promise<void>) {
    abort.current = new AbortController();
    activeSignal = abort.current.signal;
    setBusy(label);
    setProgress(0);
    setError("");
    setErrorURL("");
    try {
      await fn();
    } catch (e: any) {
      if (e.name !== "AbortError") fail(e);
    } finally {
      activeSignal = undefined;
      setBusy("");
      setProgress(0);
    }
  }
  async function openProject(p: Project) {
    await run("Opening your project", async () => {
      const next = { ...urlsRef.current };
      for (const s of p.document.sources) {
        if (next[s.id]) continue;
        let b = await loadMedia(s.id);
        if (!b) {
          const r = await fetch("/api/assets/" + s.id);
          if (!r.ok)
            throw Error(
              `The source “${s.name}” is missing. Reimport it on this device or enable cloud backup before switching devices.`,
            );
          b = await r.blob();
          await saveMedia(s.id, b);
        }
        next[s.id] = mediaURL(b);
      }
      setUrls(next);
      setProject(p);
      setSelected(p.document.segments[0]?.id || "");
      setPlayhead(0);
      setHistory([]);
      setFuture([]);
      setSummary(null);
      setMessages([]);
      setScreen("editor");
    });
  }
  function pick(p = "edit") {
    purpose.current = p;
    input.current?.click();
  }
  async function importFiles(files: File[], kind = "edit") {
    if (!files.length) return;
    await run("Importing your footage", async () => {
      if (files.length > 50) throw Error("Choose up to 50 files.");
      const d = newDocument(),
        next = { ...urlsRef.current };
      const backupFailures: string[] = [];
      for (let i = 0; i < files.length; i++) {
        activeSignal?.throwIfAborted();
        const f = /^Take \d+\.webm$/.test(files[i].name)
            ? await normalizeRecording(files[i])
            : files[i],
          s = await probe(f);
        if (s.kind !== "video")
          throw Error(
            "Choose video files for the main timeline. Add images or audio from inside the editor.",
          );
        await saveMedia(s.id, f);
        d.sources.push(s);
        d.segments.push(newSegment(i, s.duration));
        next[s.id] = desktop()
          ? mediaURL((await loadMedia(s.id))!)
          : URL.createObjectURL(f);
        setProgress((i + 1) / files.length);
        if (cloud)
          try {
            await backup(s.id, f);
          } catch (e: any) {
            if (e.name === "AbortError") throw e;
            backupFailures.push(s.name + ": " + e.message);
          }
      }
      const p = {
        id: crypto.randomUUID(),
        title: files[0].name.replace(/\.[^.]+$/, "").slice(0, 140),
        document: d,
        updatedAt: Date.now(),
      };
      setUrls(next);
      setProject(p);
      await saveProject(p);
      setProjects(await listProjects());
      setSelected(d.segments[0].id);
      setPlayhead(0);
      setHistory([]);
      setFuture([]);
      setSummary(null);
      setMessages([]);
      if (backupFailures.length)
        setError(
          "Project saved locally. Cloud backup failed: " + backupFailures[0],
        );
      setScreen(
        kind === "transcript"
          ? "transcript"
          : kind === "analysis"
            ? "analysis"
            : "editor",
      );
    });
  }
  async function backup(id: string, media: MediaResource) {
    if (media.size > 100 * 1024 * 1024)
      throw Error(
        "Cloud backup supports files up to 100 MB. This source stays local.",
      );
    const f = await mediaBlob(media);
    const r = await fetch("/api/assets/" + id, {
      method: "PUT",
      headers: {
        "content-type": f.type,
        "x-file-name": encodeURIComponent(f instanceof File ? f.name : "Media"),
      },
      body: f,
      signal: activeSignal,
    });
    if (!r.ok)
      throw Error(((await r.json()) as any).error || "Cloud backup failed.");
  }
  async function addMedia(files: File[]) {
    if (!doc) return;
    await run("Adding media", async () => {
      const next = { ...urls },
        d = structuredClone(doc);
      for (const f of files) {
        activeSignal?.throwIfAborted();
        const s = await probe(f);
        activeSignal?.throwIfAborted();
        await saveMedia(s.id, f);
        next[s.id] = desktop()
          ? mediaURL((await loadMedia(s.id))!)
          : URL.createObjectURL(f);
        const i = d.sources.length;
        d.sources.push(s);
        if (mediaKind.current === "clip") {
          if (s.kind !== "video") throw Error("Main clips must be video.");
          d.segments.push(newSegment(i, s.duration));
        } else if (mediaKind.current === "audio") {
          const lane = [0, 1, 2].find(
            (l) =>
              !d.audio.some(
                (a) =>
                  a.lane === l &&
                  a.start < playhead + s.duration &&
                  a.end > playhead,
              ),
          );
          if (lane === undefined)
            throw Error("All audio lanes are occupied at this position.");
          d.audio.push({
            id: crypto.randomUUID(),
            sourceIndex: i,
            start: playhead,
            end: Math.min(total, playhead + s.duration),
            sourceStart: 0,
            volume: 0.7,
            fadeIn: 0,
            fadeOut: 0,
            lane,
          });
        } else
          d.overlays.push({
            id: crypto.randomUUID(),
            sourceIndex: i,
            start: playhead,
            end: Math.min(
              total,
              playhead + (s.kind === "image" ? 5 : s.duration),
            ),
            sourceStart: 0,
            x: 0.75,
            y: 0.25,
            width: 0.3,
            opacity: 1,
          });
      }
      setUrls(next);
      change(d);
    });
  }
  async function ensureWords(
    d: Document,
    contextProject: Project | null = projectRef.current,
  ) {
    if (
      d.sources.filter((s) => s.kind === "video").every((s) => s.transcribed)
    ) {
      if (!d.words.length)
        throw Error(
          "No spoken audio was detected. Your footage was preserved.",
        );
      return d;
    }
    const out = structuredClone(d),
      words: Word[] = [...d.words];
    for (let i = 0; i < d.sources.length; i++) {
      const s = d.sources[i];
      if (s.kind !== "video" || s.transcribed) continue;
      if (s.duration > 900)
        throw Error(
          "AI features support videos up to 15 minutes per source. Trim or split the original first.",
        );
      const blob = await loadMedia(s.id);
      if (!blob) throw Error("Source media is missing.");
      const accept = (raw: any[], offset = 0) => {
        let previous = -1;
        for (const w of raw || []) {
          const a = Number(w.start) + offset,
            b = Number(w.end) + offset;
          if (
            !Number.isFinite(a) ||
            !Number.isFinite(b) ||
            a < offset ||
            b <= a ||
            b > s.duration + 0.1 ||
            a < previous ||
            typeof w.word !== "string"
          )
            throw Error("Speech recognition returned unsafe word timing.");
          previous = a;
          words.push({
            id: `${i}:${words.length}`,
            clip: i,
            start: a,
            end: Math.min(s.duration, b),
            text: w.word,
          });
        }
      };
      let evidenceAudio: Blob | undefined;
      if (session.profile.choice === "publik") {
        let jobId = out.sources[i].speechJob;
        const recovery = await api("ai/speech-source/" + s.id);
        if (recovery.pending)
          throw Error(
            "Your existing transcription is being created. Retry shortly to resume it.",
          );
        if (recovery.failed) {
          await api("ai/speech-reset", { sourceId: s.id });
          jobId = undefined;
          delete out.sources[i].speechJob;
        } else jobId = jobId || recovery.id;
        if (!jobId) {
          setBusy(`Preparing audio · ${s.name}`);
          const audio = await extractAudio(blob, 0, s.duration);
          evidenceAudio = audio;
          activeSignal?.throwIfAborted();
          const upload = await api("ai/audio-upload", { bytes: audio.size });
          const put = await fetch("/api/ai/audio-put", {
            method: "PUT",
            headers: {
              "content-type": "audio/wav",
              "x-upload-ticket": upload.uploadTicket,
            },
            body: audio,
            signal: activeSignal,
          });
          if (!put.ok)
            throw Error(
              ((await put.json().catch(() => ({}))) as { error?: string })
                .error || "Audio upload failed. Your original video was kept.",
            );
          activeSignal?.throwIfAborted();
          const started = await api("ai/transcription-job", {
            uploadId: upload.id,
            sourceId: s.id,
            language,
          });
          jobId = started.id;
          out.sources[i].speechJob = jobId;
          // Persist before polling: recovery reads this job instead of starting another paid one.
          out.words = [...words];
          if (contextProject) {
            setProject((p) =>
              p?.id === contextProject.id
                ? { ...p, document: structuredClone(out) }
                : p,
            );
            await saveProject({
              ...contextProject,
              document: structuredClone(out),
              updatedAt: Date.now(),
            });
          }
        }
        for (let attempt = 0; attempt < 90; attempt++) {
          activeSignal?.throwIfAborted();
          setBusy(`Transcribing with publik · ${s.name}`);
          const job = await api("ai/transcription-job/" + jobId);
          if (job.status === "completed") {
            accept(job.words);
            evidenceAudio ??= await extractAudio(blob, 0, s.duration);
            out.quietCuts ??= [];
            out.quietCuts.push(...(await quietPauses(evidenceAudio, words, i)));
            break;
          }
          if (attempt === 89)
            throw Error(
              "Transcription is still running. Retry to resume this job; you will not be charged for a second job.",
            );
          setProgress(
            (i + (Number(job.progress) || 0) / 100) / d.sources.length,
          );
          await new Promise<void>((resolve, reject) => {
            const signal = activeSignal;
            const abort = () => {
              clearTimeout(timer);
              reject(new DOMException("Cancelled", "AbortError"));
            };
            const timer = setTimeout(() => {
              signal?.removeEventListener("abort", abort);
              resolve();
            }, 10000);
            signal?.addEventListener("abort", abort, { once: true });
          });
        }
      } else {
        for (let start = 0; start < s.duration; start += 100) {
          activeSignal?.throwIfAborted();
          setBusy(
            `Transcribing ${s.name} · ${time(start)} / ${time(s.duration)}`,
          );
          const audio = await extractAudio(
            blob,
            start,
            Math.min(100, s.duration - start),
          );
          const form = new FormData();
          form.set("file", audio, "audio.wav");
          if (language !== "auto") form.set("language", language);
          activeSignal?.throwIfAborted();
          const res = await api("ai/transcribe", form);
          activeSignal?.throwIfAborted();
          let previous = -1;
          for (const w of res.words || []) {
            const a = Number(w.start) + start,
              b = Number(w.end) + start;
            if (
              !Number.isFinite(a) ||
              !Number.isFinite(b) ||
              a < start ||
              b <= a ||
              b > s.duration + 0.1 ||
              a < previous ||
              typeof w.word !== "string"
            )
              throw Error("Speech recognition returned unsafe word timing.");
            previous = a;
            words.push({
              id: `${i}:${words.length}`,
              clip: i,
              start: a,
              end: Math.min(s.duration, b),
              text: w.word,
            });
          }
          out.quietCuts ??= [];
          out.quietCuts.push(...(await quietPauses(audio, words, i, start)));
          setProgress(
            (i + Math.min(1, (start + 100) / s.duration)) / d.sources.length,
          );
        }
      }
      out.sources[i].transcribed = true;
    }
    words.sort((a, b) => a.clip - b.clip || a.start - b.start);
    out.words = words;
    if (contextProject) {
      setProject((p) =>
        p?.id === contextProject.id
          ? { ...p, document: structuredClone(out) }
          : p,
      );
      await saveProject({
        ...contextProject,
        document: structuredClone(out),
        updatedAt: Date.now(),
      });
    }
    if (!words.length)
      throw Error("No spoken audio was detected. Your footage was preserved.");
    return out;
  }
  async function transcribe() {
    if (!doc) return;
    await run("Preparing speech recognition", async () => {
      const d = await ensureWords(doc);
      change(d);
      setNotice("Transcript ready.");
    });
  }
  async function aiEdit() {
    if (!doc) return;
    await run("Preparing AI edit", async () => {
      let d = await ensureWords(doc);
      setBusy("Choosing the best takes · full-recording review");
      activeSignal?.throwIfAborted();
      const plan = await api("ai/edit", { words: d.words });
      activeSignal?.throwIfAborted();
      d = applyCuts(d, [...planCuts(d, plan), ...(d.quietCuts || [])]);
      change(d);
      setScreen("editor");
      setNotice(
        "AI edit applied. Review the timeline; Undo restores your footage.",
      );
    });
  }
  async function analyze() {
    if (!doc) return;
    await run("Preparing video analysis", async () => {
      const d = await ensureWords(doc);
      change(d);
      setBusy("Finding your main point and highlights");
      setSummary(await api("ai/summary", { words: d.words }));
    });
  }
  async function generateCaptions() {
    if (!doc) return;
    await run("Preparing captions", async () => {
      change(captions(await ensureWords(doc)));
      setTool("captions");
    });
  }
  async function sendChat() {
    if (!doc || !prompt.trim()) return;
    const message = prompt;
    setPrompt("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    await run("EditAI is working", async () => {
      const payload = {
        mode: "chat",
        prompt: message,
        messages: messages.slice(-10),
        document: {
          ...doc,
          segments: doc.segments.map((s) => ({ ...s, source: s.sourceIndex })),
          overlays: [],
          audioClips: [],
        },
        sources: doc.sources.map((s) => ({
          name: s.name,
          isAudioOnly: s.kind === "audio",
        })),
        sourceDurations: doc.sources.map((s) => s.duration),
        selectedClipID: selected,
        selectedCaptionID: selectedText || null,
        playhead,
        captionFormat: doc.captionFormat,
        supportedOperations,
        reference,
      };
      const reply = await api("ai/chat", payload);
      let d = doc;
      if (reply.generateCaptions || reply.captionFormat)
        d = captions(
          await ensureWords(d),
          reply.captionFormat || d.captionFormat,
        );
      d = applyOperations(d, reply.operations);
      if (reply.operations.length || d !== doc) change(d);
      setMessages((m) => [...m, { role: "assistant", text: reply.message }]);
    });
  }
  async function exportVideo() {
    if (!player.current || !project) return;
    setExportOpen(false);
    abort.current = new AbortController();
    await run(
      desktop()
        ? "Rendering your video locally"
        : "Rendering your video · keep this tab open",
      async () => {
        const b = await player.current!.export(
          fps,
          setProgress,
          abort.current!.signal,
        );
        if (b) download(b, project.title + ".mp4");
        setNotice("MP4 exported. Your editable project is saved.");
      },
    );
    setPlaying(false);
  }
  function download(b: Blob, name: string) {
    const u = URL.createObjectURL(b),
      a = document.createElement("a");
    a.href = u;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 30000);
  }
  async function saveSettings() {
    await run("Saving your preferences", async () => {
      await api("settings", {
        ownKey: ownKey || undefined,
        displayName: profileName,
        avatar,
        consent,
        telemetry,
      });
      setOwnKey("");
      await refresh();
      setNotice("Preferences saved.");
    });
  }
  async function removeProject(p: Project) {
    if (
      !confirm(
        `Delete “${p.title}”? This removes the project from your library.`,
      )
    )
      return;
    await deleteProject(p.id);
    await api("projects/" + p.id, undefined, "DELETE");
    setProjects(await listProjects());
  }
  const nav = (s: Screen) => {
    if (
      screen === "record" &&
      recordingDirty.current &&
      s !== "record" &&
      !confirm("Discard your recorded takes and leave the recorder?")
    )
      return;
    player.current?.pause();
    setPlaying(false);
    setScreen(s);
    if (s === "settings") void refresh();
    setMenu(false);
  };
  const busyUI = busy && (
    <div className="modal-backdrop">
      <div className="modal progress-modal">
        <div className="loading-orbit">
          <Sparkles size={30} />
        </div>
        <h2>{busy}</h2>
        <p>Your original footage stays safe.</p>
        <progress value={progress || undefined} max={1} />
        <span>
          {progress > 0 ? Math.round(progress * 100) + "%" : "Working…"}
        </span>
        <Button
          secondary
          onClick={() => {
            abort.current?.abort();
            cancelFFmpeg();
            setNotice("Cancelling the current media operation…");
          }}
        >
          Cancel media processing
        </Button>
      </div>
    </div>
  );
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="video/*,.mov,.mp4,.webm"
        multiple
        hidden
        onChange={(e) => {
          void importFiles(Array.from(e.target.files || []), purpose.current);
          e.target.value = "";
        }}
      />
      <input
        ref={extraInput}
        type="file"
        accept="video/*,image/*,audio/*"
        multiple
        hidden
        onChange={(e) => {
          void addMedia(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <input
        ref={referenceInput}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f)
            void run("Preparing your style reference", async () =>
              setReference(await makeReference(f)),
            );
          e.target.value = "";
        }}
      />
      <input
        ref={avatarInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            void run("Preparing your avatar", async () => {
              if (file.size > 5 * 1024 * 1024)
                throw Error("Choose an avatar smaller than 5 MB.");
              const image = await createImageBitmap(file),
                c = document.createElement("canvas");
              c.width = 192;
              c.height = 192;
              const size = Math.min(image.width, image.height);
              c.getContext("2d")!.drawImage(
                image,
                (image.width - size) / 2,
                (image.height - size) / 2,
                size,
                size,
                0,
                0,
                192,
                192,
              );
              image.close();
              setAvatar(c.toDataURL("image/jpeg", 0.8));
            });
          e.target.value = "";
        }}
      />
      {pending || session?.screen.id !== "ready" ? (
        signIn || desktop() ? (
          <MarketingSignIn onPrivacy={() => setPrivacy(true)}>
            <section className="sign-in-card">
              <div className="app-symbol">
                <Clapperboard />
              </div>
              <h2>
                {pending
                  ? "Opening your studio…"
                  : gateError
                    ? "Sign in with publik"
                    : session?.screen.title || "Sign in with publik"}
              </h2>
              <p>
                {gateError ||
                  session?.screen.body ||
                  "Your next great video starts here."}
              </p>
              {pending ? (
                <LoaderCircle className="spin" />
              ) : gateError ? (
                <Button
                  onClick={() => {
                    setPending(true);
                    void refresh();
                  }}
                >
                  Retry <ArrowRight size={18} />
                </Button>
              ) : (
                session?.screen.buttons.map((b: any, i: number) => (
                  <Button
                    key={b.action}
                    secondary={i > 0}
                    onClick={() => void choose(b.action)}
                  >
                    {b.label}
                    <ArrowUpRight size={16} />
                  </Button>
                ))
              )}
              {authOpened && (
                <p className="panel-note" role="status">
                  Approve in the Publik sign-in window, then return here. Your
                  studio continues automatically.
                </p>
              )}
              {blockedAuthURL && (
                <a href={blockedAuthURL} target="_blank" rel="noreferrer">
                  Open Publik sign-in ↗
                </a>
              )}
              <small>
                One account for your creative tools.
                <br />
                AI powered by publik. Editing powered by you.
              </small>
            </section>
          </MarketingSignIn>
        ) : (
          <MarketingLanding onPrivacy={() => setPrivacy(true)} />
        )
      ) : (
        <div className={`app-shell ${screen === "editor" ? "is-editor" : ""}`}>
          <aside className={`sidebar ${menu ? "open" : ""}`}>
            <button className="logo-button" onClick={() => nav("home")}>
              <Wordmark />
            </button>
            <div className="workspace-label">YOUR WORKSPACE</div>
            <nav>
              {[
                { id: "home", label: "Home", icon: Home },
                { id: "library", label: "My creations", icon: FolderOpen },
                { id: "record", label: "Record", icon: Video },
              ].map((n) => (
                <button
                  key={n.id}
                  className={screen === n.id ? "active" : ""}
                  onClick={() => nav(n.id as Screen)}
                >
                  <n.icon size={19} />
                  {n.label}
                  {n.id === "library" && (
                    <span className="nav-count">{projects.length}</span>
                  )}
                </button>
              ))}
            </nav>
            <div className="sidebar-note">
              <Sparkles size={20} />
              <strong>A little less busywork.</strong>
              <p>More room for your best ideas.</p>
              <button onClick={() => nav("settings")}>
                Manage AI connection <ArrowUpRight size={14} />
              </button>
            </div>
            <div className="sidebar-bottom">
              <button
                className={screen === "settings" ? "active" : ""}
                onClick={() => nav("settings")}
              >
                <Settings size={18} />
                Settings
              </button>
              <button className="profile-row" onClick={() => nav("settings")}>
                <span className="avatar">
                  {(profileName ||
                    session.profile.handle ||
                    "E")[0].toUpperCase()}
                </span>
                <span>
                  <strong>
                    {profileName || session.profile.handle || "Your studio"}
                  </strong>
                  <small>{session.profile.plan}</small>
                </span>
                <ChevronDown size={15} />
              </button>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <div className="breadcrumb">
                <button
                  className="mobile-menu icon-button"
                  onClick={() => setMenu(!menu)}
                  aria-label="Open navigation"
                >
                  <Menu />
                </button>
                <span>EditAI Studio</span>
                <span>/</span>
                <strong>
                  {screen === "editor"
                    ? project?.title
                    : screen === "library"
                      ? "My creations"
                      : screen[0].toUpperCase() + screen.slice(1)}
                </strong>
              </div>
              <div className="topbar-right">
                <span className="web-badge">
                  {desktop() ? "DESKTOP STUDIO" : "WEB STUDIO"}
                </span>
                {screen === "editor" && (
                  <Button
                    onClick={() => {
                      player.current?.pause();
                      setPlaying(false);
                      setExportOpen(true);
                    }}
                  >
                    <Download size={16} />
                    Export
                  </Button>
                )}
              </div>
            </header>
            {screen === "home" && (
              <main className="dashboard">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">
                      A LITTLE LESS EDITING. A LOT MORE YOU.
                    </p>
                    <h1>
                      What will you create today<span>?</span>
                    </h1>
                    <p>Your next great video starts with a first take.</p>
                    {!desktop() && <DesktopDownloads />}
                  </div>
                  <span className="ios-badge compact">iOS — Coming Soon</span>
                </div>
                <div className="dashboard-grid">
                  <section
                    className="upload-card"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void importFiles(Array.from(e.dataTransfer.files));
                    }}
                  >
                    <div className="upload-card-top">
                      <span className="pill">
                        <Sparkles size={13} /> YOUR CREATIVE SHORTCUT
                      </span>
                      <span className="outlined-icon">
                        <ArrowUpRight />
                      </span>
                    </div>
                    <div className="upload-illustration">
                      <div className="film-strip back" />
                      <div className="film-strip front">
                        <Play fill="currentColor" size={30} />
                      </div>
                      <div className="floating-spark">✦</div>
                    </div>
                    <h2>
                      Good footage.
                      <br />
                      Great possibilities.
                    </h2>
                    <p>
                      Drop in your clips. Keep the good takes.
                      <br />
                      We’ll help with everything in between.
                    </p>
                    <Button onClick={() => pick()}>
                      <Plus size={18} />
                      Create a video
                      <ArrowRight size={18} />
                    </Button>
                    <small>
                      MP4, MOV, WebM · up to 50 clips · 1 GB per file
                    </small>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={cloud}
                        onChange={(e) => setCloud(e.target.checked)}
                      />
                      {desktop()
                        ? "Copy sources to local project storage (100 MB/file)"
                        : "Back up sources to my private cloud (100 MB/file)"}
                    </label>
                  </section>
                  <div className="quick-tools">
                    <button
                      className="tool-card ice"
                      onClick={() => nav("record")}
                    >
                      <div className="tool-card-icon">
                        <Video />
                      </div>
                      <ArrowUpRight className="corner-arrow" size={18} />
                      <h3>Record</h3>
                      <p>
                        Camera ready.
                        <br />
                        Ideas rolling.
                      </p>
                      <span>Camera + teleprompter</span>
                    </button>
                    <button
                      className="tool-card lavender"
                      onClick={() => nav("batch")}
                    >
                      <div className="tool-card-icon">
                        <Layers />
                      </div>
                      <ArrowUpRight className="corner-arrow" size={18} />
                      <h3>Batch edit</h3>
                      <p>
                        More videos.
                        <br />
                        One smooth flow.
                      </p>
                      <span>Separate projects, together</span>
                    </button>
                    <button
                      className="tool-card peach"
                      onClick={() => pick("analysis")}
                    >
                      <div className="tool-card-icon">
                        <Sparkles />
                      </div>
                      <ArrowUpRight className="corner-arrow" size={18} />
                      <h3>Analyze</h3>
                      <p>
                        Find the story
                        <br />
                        in your footage.
                      </p>
                      <span>Main point + highlights</span>
                    </button>
                    <button
                      className="tool-card mint"
                      onClick={() => pick("transcript")}
                    >
                      <div className="tool-card-icon">
                        <AudioLines />
                      </div>
                      <ArrowUpRight className="corner-arrow" size={18} />
                      <h3>Transcribe</h3>
                      <p>
                        Every word.
                        <br />
                        Written down.
                      </p>
                      <span>Speech to editable text</span>
                    </button>
                  </div>
                </div>
                <div className="section-heading">
                  <h2>Pick up where you left off</h2>
                  <button
                    className="text-button"
                    onClick={() => nav("library")}
                  >
                    All creations <ArrowRight size={15} />
                  </button>
                </div>
                {projects.length ? (
                  <div className="project-grid">
                    {projects.slice(0, 4).map((p) => (
                      <ProjectCard
                        key={p.id}
                        p={p}
                        open={() => void openProject(p)}
                        remove={() => void removeProject(p)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-library">
                    <FolderOpen size={27} />
                    <div>
                      <strong>A blank canvas. A fresh start.</strong>
                      <p>Your saved projects will be right here.</p>
                    </div>
                    <button className="text-button" onClick={() => pick()}>
                      Make your first video <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </main>
            )}
            {screen === "library" && (
              <main className="dashboard">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">MADE BY YOU</p>
                    <h1>My creations</h1>
                    <p>Your ideas, saved and ready for the next cut.</p>
                  </div>
                  <Button onClick={() => pick()}>
                    <Plus size={18} />
                    New video
                  </Button>
                </div>
                <div className="project-grid">
                  {projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      p={p}
                      open={() => void openProject(p)}
                      remove={() => void removeProject(p)}
                    />
                  ))}
                </div>
                {!projects.length && (
                  <div className="empty-library">
                    <Film />
                    <p>Your first creation is one upload away.</p>
                    <Button onClick={() => pick()}>Upload video</Button>
                  </div>
                )}
              </main>
            )}
            {screen === "editor" && doc && (
              <div className="editor">
                <div className="editor-top">
                  <button
                    className="text-button"
                    onClick={() => nav("library")}
                  >
                    <ArrowLeft size={16} />
                    My creations
                  </button>
                  <input
                    className="project-title"
                    aria-label="Project name"
                    maxLength={140}
                    value={project!.title}
                    onChange={(e) =>
                      setProject((p) =>
                        p ? { ...p, title: e.target.value } : p,
                      )
                    }
                  />
                  <span className="autosave">
                    <Check size={13} />
                    Autosaved on this device
                  </span>
                  <IconButton
                    label="Undo"
                    onClick={undo}
                    disabled={!history.length}
                  >
                    <Undo2 size={18} />
                  </IconButton>
                  <IconButton
                    label="Redo"
                    onClick={redo}
                    disabled={!future.length}
                  >
                    <Redo2 size={18} />
                  </IconButton>
                </div>
                <div className="editor-workspace">
                  <div className="editor-left">
                    <div className="panel-tabs">
                      <button
                        className={tool === "media" ? "selected" : ""}
                        onClick={() => setTool("media")}
                      >
                        <Film size={15} />
                        Media
                      </button>
                      <button
                        className={tool === "chat" ? "selected" : ""}
                        onClick={() => setTool("chat")}
                      >
                        <Sparkles size={15} />
                        EditAI
                      </button>
                    </div>
                    {tool === "chat" ? (
                      <div className="chat-panel">
                        <h3>A second pair of editing eyes.</h3>
                        <p>Tell EditAI what you’d like to change.</p>
                        <div className="chat-messages">
                          {messages.map((m, i) => (
                            <div key={i} className={"message " + m.role}>
                              {m.text}
                            </div>
                          ))}
                          {!messages.length &&
                            [
                              "Make this a vertical video",
                              "Give it a warmer look",
                              "Add readable captions",
                            ].map((s) => (
                              <button
                                className="suggestion"
                                key={s}
                                onClick={() => setPrompt(s)}
                              >
                                {s}
                                <ArrowUpRight size={13} />
                              </button>
                            ))}
                        </div>
                        <div className="reference-picker">
                          <button
                            className="text-button"
                            onClick={() => referenceInput.current?.click()}
                          >
                            <ImageIcon size={14} />
                            {reference
                              ? reference.name
                              : "Add a style reference"}
                          </button>
                          {reference && (
                            <IconButton
                              label="Remove reference"
                              onClick={() => setReference(null)}
                            >
                              <X size={13} />
                            </IconButton>
                          )}
                        </div>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void sendChat();
                          }}
                        >
                          <textarea
                            aria-label="Message EditAI"
                            placeholder="Make it yours…"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            maxLength={2000}
                          />
                          <button
                            aria-label="Send message"
                            disabled={!prompt.trim() || !!busy}
                          >
                            <ArrowRight size={18} />
                          </button>
                        </form>
                      </div>
                    ) : (
                      <div className="media-panel">
                        <div className="section-heading">
                          <h3>Source library</h3>
                          <IconButton
                            label="Add clips"
                            onClick={() => {
                              mediaKind.current = "clip";
                              extraInput.current?.click();
                            }}
                          >
                            <Plus size={16} />
                          </IconButton>
                        </div>
                        {doc.sources.map((s, i) => (
                          <div className="source-item" key={s.id}>
                            <Film size={20} />
                            <div>
                              <strong>{s.name}</strong>
                              <small>
                                {time(s.duration)} · {s.kind}
                              </small>
                            </div>
                            <button
                              className="text-button"
                              aria-label={"Append " + s.name}
                              onClick={() =>
                                s.kind === "video" &&
                                patch((d) =>
                                  d.segments.push(newSegment(i, s.duration)),
                                )
                              }
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        ))}
                        <div className="panel-divider" />
                        <Button onClick={() => void aiEdit()}>
                          <Sparkles size={16} />
                          Find my best takes
                        </Button>
                        <Button
                          secondary
                          onClick={() => void generateCaptions()}
                        >
                          <Subtitles size={16} />
                          Generate captions
                        </Button>
                        <p className="panel-note">
                          AI edits are reversible. Your original footage always
                          stays intact.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="preview-area">
                    <div className="preview-controls-top">
                      <select
                        aria-label="Canvas aspect ratio"
                        value={doc.canvas}
                        onChange={(e) =>
                          patch((d) => {
                            d.canvas = e.target.value as Document["canvas"];
                          })
                        }
                      >
                        <option value="original">Original ratio</option>
                        <option value="9:16">9:16 Portrait</option>
                        <option value="16:9">16:9 Landscape</option>
                        <option value="1:1">1:1 Square</option>
                      </select>
                      <select
                        aria-label="Framing"
                        value={doc.framing}
                        onChange={(e) =>
                          patch((d) => {
                            d.framing = e.target.value as "fit" | "fill";
                          })
                        }
                      >
                        <option value="fit">Fit</option>
                        <option value="fill">Fill</option>
                      </select>
                      <span>PREVIEW</span>
                    </div>
                    <div className="canvas-stage">
                      <canvas ref={canvas} aria-label="Video preview" />
                    </div>
                    <div className="transport">
                      <span>
                        {time(playhead)}
                        <small> / {time(total)}</small>
                      </span>
                      <div>
                        <IconButton
                          label="Back 5 seconds"
                          onClick={() => player.current?.seek(playhead - 5)}
                        >
                          <ChevronLeft size={20} />
                        </IconButton>
                        <button
                          className="play-button"
                          onClick={togglePlay}
                          aria-label={playing ? "Pause" : "Play"}
                        >
                          {playing ? (
                            <Pause size={19} fill="currentColor" />
                          ) : (
                            <Play size={19} fill="currentColor" />
                          )}
                        </button>
                        <IconButton
                          label="Forward 5 seconds"
                          onClick={() => player.current?.seek(playhead + 5)}
                        >
                          <ChevronRight size={20} />
                        </IconButton>
                      </div>
                      <span className="preview-quality">
                        {resolution === 1920 ? "1080" : "720"}p · {fps} fps
                      </span>
                    </div>
                  </div>
                  <div className="inspector">
                    <div className="inspector-tabs">
                      {[
                        { id: "clip", icon: SlidersHorizontal, label: "Clip" },
                        { id: "captions", icon: Subtitles, label: "Text" },
                        { id: "layers", icon: Layers, label: "Layers" },
                      ].map((t) => (
                        <button
                          className={tool === t.id ? "selected" : ""}
                          key={t.id}
                          onClick={() => setTool(t.id)}
                        >
                          <t.icon size={16} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {tool === "captions" ? (
                      <>
                        <div className="section-heading">
                          <h3>Captions & text</h3>
                          <IconButton
                            label="Add text"
                            onClick={() => {
                              const t: TextLayer = {
                                id: crypto.randomUUID(),
                                text: "Your words here",
                                start: playhead,
                                end: Math.min(total, playhead + 3),
                                x: 0.5,
                                y: 0.5,
                                size: 0.055,
                                color: "#ffffff",
                                background: "transparent",
                                font: "TikTok Sans",
                                outline: true,
                                animation: "none",
                              };
                              patch((d) => d.texts.push(t));
                              setSelectedText(t.id);
                            }}
                          >
                            <Plus size={17} />
                          </IconButton>
                        </div>
                        <Button
                          secondary
                          onClick={() => void generateCaptions()}
                        >
                          Generate speech captions
                        </Button>
                        <select
                          aria-label="Caption grouping"
                          value={doc.captionFormat}
                          onChange={(e) =>
                            change(
                              captions(
                                doc,
                                e.target.value as Document["captionFormat"],
                              ),
                            )
                          }
                        >
                          <option value="standard">Standard · 6 words</option>
                          <option value="boxed">Boxed · 4 words</option>
                          <option value="single">One word</option>
                        </select>
                        <div className="text-layer-list">
                          {doc.texts.map((t) => (
                            <button
                              className={
                                selectedText === t.id ? "selected" : ""
                              }
                              key={t.id}
                              onClick={() => {
                                setSelectedText(t.id);
                                player.current?.seek(textTiming(doc, t).start);
                              }}
                            >
                              <span>{t.text}</span>
                              <small>{time(textTiming(doc, t).start)}</small>
                            </button>
                          ))}
                        </div>
                        {textLayer && (
                          <>
                            <textarea
                              aria-label="Caption text"
                              value={textLayer.text}
                              onChange={(e) =>
                                patch((d) => {
                                  d.texts.find(
                                    (t) => t.id === selectedText,
                                  )!.text = e.target.value;
                                })
                              }
                            />
                            <select
                              aria-label="Font"
                              value={textLayer.font}
                              onChange={(e) =>
                                patch((d) => {
                                  d.texts.find(
                                    (t) => t.id === selectedText,
                                  )!.font = e.target.value;
                                })
                              }
                            >
                              {FONTS.map((f) => (
                                <option key={f}>{f}</option>
                              ))}
                            </select>
                            {[
                              ["Size", "size", 0.02, 0.2],
                              ["Horizontal", "x", 0.07, 0.93],
                              ["Vertical", "y", 0.12, 0.88],
                            ].map(([label, key, min, max]) => (
                              <Range
                                key={String(key)}
                                label={String(label)}
                                value={(textLayer as any)[key]}
                                min={Number(min)}
                                max={Number(max)}
                                onChange={(n) =>
                                  patch((d) => {
                                    (
                                      d.texts.find(
                                        (t) => t.id === selectedText,
                                      ) as any
                                    )[key] = n;
                                  })
                                }
                              />
                            ))}
                            <div className="swatches">
                              {colors.map((c) => (
                                <button
                                  key={c}
                                  aria-label={"Text color " + c}
                                  style={{ background: c }}
                                  onClick={() =>
                                    patch((d) => {
                                      d.texts.find(
                                        (t) => t.id === selectedText,
                                      )!.color = c;
                                    })
                                  }
                                />
                              ))}
                            </div>
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                checked={textLayer.outline}
                                onChange={(e) =>
                                  patch((d) => {
                                    d.texts.find(
                                      (t) => t.id === selectedText,
                                    )!.outline = e.target.checked;
                                  })
                                }
                              />
                              Text outline
                            </label>
                            <select
                              aria-label="Text animation"
                              value={textLayer.animation}
                              onChange={(e) =>
                                patch((d) => {
                                  d.texts.find(
                                    (t) => t.id === selectedText,
                                  )!.animation = e.target.value;
                                })
                              }
                            >
                              {[
                                "none",
                                "fade",
                                "pop",
                                "zoom",
                                "slide",
                                "typewriter",
                              ].map((a) => (
                                <option key={a}>{a}</option>
                              ))}
                            </select>
                            <TextStyleEditor
                              text={textLayer}
                              timing={textTiming(doc, textLayer)}
                              total={total}
                              onChange={(values) =>
                                patch((d) => {
                                  Object.assign(
                                    d.texts.find((t) => t.id === selectedText)!,
                                    values,
                                  );
                                })
                              }
                            />
                            <Button
                              secondary
                              onClick={() =>
                                patch((d) => {
                                  d.texts = d.texts.filter(
                                    (t) => t.id !== selectedText,
                                  );
                                })
                              }
                            >
                              <Trash2 size={15} />
                              Delete text
                            </Button>
                          </>
                        )}
                      </>
                    ) : tool === "layers" ? (
                      <>
                        <h3>Layers</h3>
                        <Button
                          secondary
                          onClick={() => {
                            mediaKind.current = "overlay";
                            extraInput.current?.click();
                          }}
                        >
                          <ImageIcon size={16} />
                          Add image / video
                        </Button>
                        <Button
                          secondary
                          onClick={() => {
                            mediaKind.current = "audio";
                            extraInput.current?.click();
                          }}
                        >
                          <Music size={16} />
                          Add audio
                        </Button>
                        {doc.overlays.map((o) => (
                          <div className="layer-settings" key={o.id}>
                            <strong>{doc.sources[o.sourceIndex].name}</strong>
                            {[
                              ["Start", "start", 0, total],
                              ["End", "end", 0, total],
                              ["X", "x", 0, 1],
                              ["Y", "y", 0, 1],
                              ["Width", "width", 0.1, 1],
                              ["Opacity", "opacity", 0, 1],
                            ].map(([label, key, min, max]) => (
                              <Range
                                key={String(key)}
                                label={String(label)}
                                value={(o as any)[key]}
                                min={Number(min)}
                                max={Number(max)}
                                onChange={(n) =>
                                  patch((d) => {
                                    (
                                      d.overlays.find(
                                        (x) => x.id === o.id,
                                      ) as any
                                    )[key] = n;
                                  })
                                }
                              />
                            ))}
                            <details>
                              <summary>Overlay appearance</summary>
                              <AppearanceEditor
                                value={o.appearance || appearance()}
                                onChange={(value) =>
                                  patch((d) => {
                                    d.overlays.find(
                                      (x) => x.id === o.id,
                                    )!.appearance = value;
                                  })
                                }
                              />
                            </details>
                            <IconButton
                              label="Delete overlay"
                              onClick={() =>
                                patch((d) => {
                                  d.overlays = d.overlays.filter(
                                    (x) => x.id !== o.id,
                                  );
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </div>
                        ))}
                        {doc.audio.map((a) => (
                          <div className="layer-settings" key={a.id}>
                            <strong>
                              {doc.sources[a.sourceIndex].name} · lane{" "}
                              {a.lane + 1}
                            </strong>
                            <Range
                              label="Audio source in"
                              min={0}
                              max={Math.max(
                                0,
                                doc.sources[a.sourceIndex].duration -
                                  (a.end - a.start),
                              )}
                              value={a.sourceStart}
                              onChange={(n) =>
                                patch((d) => {
                                  d.audio.find(
                                    (x) => x.id === a.id,
                                  )!.sourceStart = n;
                                })
                              }
                            />
                            <label>
                              Audio lane
                              <select
                                value={a.lane}
                                onChange={(e) =>
                                  patch((d) => {
                                    d.audio.find((x) => x.id === a.id)!.lane =
                                      +e.target.value;
                                  })
                                }
                              >
                                {[0, 1, 2].map((n) => (
                                  <option value={n} key={n}>
                                    Lane {n + 1}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {[
                              ["Start", "start", 0, total],
                              ["End", "end", 0, total],
                              ["Volume", "volume", 0, 1],
                              ["Fade in", "fadeIn", 0, 10],
                              ["Fade out", "fadeOut", 0, 10],
                            ].map(([label, key, min, max]) => (
                              <Range
                                key={String(key)}
                                label={String(label)}
                                value={(a as any)[key]}
                                min={Number(min)}
                                max={Number(max)}
                                onChange={(n) =>
                                  patch((d) => {
                                    (d.audio.find((x) => x.id === a.id) as any)[
                                      key
                                    ] = n;
                                  })
                                }
                              />
                            ))}
                            <IconButton
                              label="Delete audio"
                              onClick={() =>
                                patch((d) => {
                                  d.audio = d.audio.filter(
                                    (x) => x.id !== a.id,
                                  );
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </div>
                        ))}
                      </>
                    ) : (
                      segment && (
                        <>
                          <h3>Clip settings</h3>
                          <p className="clip-name">
                            {doc.sources[segment.sourceIndex].name}
                          </p>
                          <div className="timing-fields">
                            <label>
                              In
                              <input
                                type="number"
                                aria-label="Clip in point"
                                min={0}
                                max={segment.end - 0.1}
                                step={0.1}
                                value={Number(segment.start.toFixed(2))}
                                onChange={(e) =>
                                  updateClip((s) => {
                                    s.start = +e.target.value;
                                  })
                                }
                              />
                            </label>
                            <label>
                              Out
                              <input
                                type="number"
                                aria-label="Clip out point"
                                min={segment.start + 0.1}
                                max={doc.sources[segment.sourceIndex].duration}
                                step={0.1}
                                value={Number(segment.end.toFixed(2))}
                                onChange={(e) =>
                                  updateClip((s) => {
                                    s.end = +e.target.value;
                                  })
                                }
                              />
                            </label>
                          </div>
                          <Range
                            label="Speed"
                            min={0.25}
                            max={4}
                            step={0.05}
                            value={segment.speed}
                            onChange={(n) =>
                              updateClip((s) => {
                                s.speed = n;
                              })
                            }
                          />
                          <Range
                            label="Volume"
                            min={0}
                            max={1}
                            value={segment.volume}
                            onChange={(n) =>
                              updateClip((s) => {
                                s.volume = n;
                              })
                            }
                          />
                          <AppearanceEditor
                            value={segment.appearance}
                            onChange={(value) =>
                              updateClip((s) => {
                                s.appearance = value;
                              })
                            }
                          />
                        </>
                      )
                    )}
                  </div>
                </div>
                <div className="timeline">
                  <div className="timeline-toolbar">
                    <div>
                      <IconButton
                        label="Split clip at playhead"
                        onClick={() => {
                          try {
                            const a = atTime(doc, playhead);
                            if (a)
                              change(split(doc, a.segment.id, a.sourceTime));
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        <Scissors size={17} />
                      </IconButton>
                      <IconButton
                        label="Duplicate selected clip"
                        onClick={() => {
                          if (segment) change(duplicate(doc, segment.id));
                        }}
                      >
                        <Copy size={16} />
                      </IconButton>
                      <IconButton
                        label="Delete selected clip"
                        disabled={doc.segments.length <= 1}
                        onClick={() =>
                          patch((d) => {
                            d.segments = d.segments.filter(
                              (s) => s.id !== segment?.id,
                            );
                          })
                        }
                      >
                        <Trash2 size={17} />
                      </IconButton>
                      <span className="toolbar-divider" />
                      <IconButton
                        label="Move clip left"
                        onClick={() =>
                          patch((d) => {
                            const i = d.segments.findIndex(
                              (s) => s.id === segment?.id,
                            );
                            if (i > 0)
                              [d.segments[i - 1], d.segments[i]] = [
                                d.segments[i],
                                d.segments[i - 1],
                              ];
                          })
                        }
                      >
                        <ChevronLeft size={18} />
                      </IconButton>
                      <IconButton
                        label="Move clip right"
                        onClick={() =>
                          patch((d) => {
                            const i = d.segments.findIndex(
                              (s) => s.id === segment?.id,
                            );
                            if (i < d.segments.length - 1)
                              [d.segments[i + 1], d.segments[i]] = [
                                d.segments[i],
                                d.segments[i + 1],
                              ];
                          })
                        }
                      >
                        <ChevronRight size={18} />
                      </IconButton>
                    </div>
                    <span>
                      {doc.segments.length} clips · {time(total)}
                    </span>
                    <button
                      className="text-button"
                      onClick={() => {
                        mediaKind.current = "clip";
                        extraInput.current?.click();
                      }}
                    >
                      <Plus size={15} />
                      Add media
                    </button>
                  </div>
                  <input
                    className="playhead-slider"
                    aria-label="Timeline playhead"
                    type="range"
                    min={0}
                    max={total}
                    step={0.01}
                    value={playhead}
                    onChange={(e) => player.current?.seek(+e.target.value)}
                  />
                  <div className="timeline-clips">
                    {doc.segments.map((s, i) => {
                      const offset = doc.segments
                        .slice(0, i)
                        .reduce((n, s) => n + segmentDuration(s), 0);
                      return (
                        <button
                          key={s.id}
                          className={`timeline-clip ${selected === s.id ? "selected" : ""}`}
                          style={{
                            flex: Math.max(0.4, segmentDuration(s)),
                            minWidth: 90,
                          }}
                          onClick={() => {
                            setSelected(s.id);
                            setTool("clip");
                            player.current?.seek(offset);
                          }}
                        >
                          <Film size={14} />
                          <strong>{doc.sources[s.sourceIndex].name}</strong>
                          <small>
                            {time(segmentDuration(s))}
                            {s.speed !== 1 ? ` · ${s.speed}×` : ""}
                          </small>
                          <div className="waveform">
                            {Array.from({ length: 24 }, (_, j) => (
                              <i key={j} style={{ height: 8 }} />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="caption-track">
                    <Subtitles size={14} />
                    {doc.texts.length
                      ? `${doc.texts.length} text layers`
                      : "Add captions to tell your story"}
                    <button onClick={() => setTool("captions")}>
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {(screen === "analysis" || screen === "transcript") && doc && (
              <main className="dashboard analysis-page">
                <button className="text-button" onClick={() => nav("editor")}>
                  <ArrowLeft size={16} />
                  Open in editor
                </button>
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">
                      {screen === "analysis"
                        ? "FIND YOUR STORY"
                        : "EVERY WORD, IN ORDER"}
                    </p>
                    <h1>
                      {screen === "analysis"
                        ? "Video analysis"
                        : "Your transcript"}
                    </h1>
                    <p>{project!.title}</p>
                  </div>
                  <Button
                    onClick={() =>
                      void (screen === "analysis" ? analyze() : transcribe())
                    }
                  >
                    <Sparkles size={17} />
                    {screen === "analysis"
                      ? "Analyze video"
                      : "Transcribe video"}
                  </Button>
                </div>
                <video
                  className="analysis-video"
                  src={urls[doc.sources[0]?.id]}
                  controls
                  playsInline
                />
                {screen === "analysis" && summary ? (
                  <div className="summary-card">
                    <h3>Main point</h3>
                    <p>{summary.summary}</p>
                    <h3>Hook</h3>
                    <p>{summary.hook}</p>
                    <h3>Highlights</h3>
                    {summary.highlights.map((h: string) => (
                      <p key={h}>{h}</p>
                    ))}
                    <Button
                      secondary
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(
                            [
                              summary.summary,
                              summary.hook,
                              ...summary.highlights,
                            ].join("\n\n"),
                          )
                          .then(() => setNotice("Analysis copied."))
                      }
                    >
                      <Copy size={16} />
                      Copy analysis
                    </Button>
                  </div>
                ) : screen === "transcript" && doc.words.length ? (
                  <div className="transcript-card">
                    <div className="section-heading">
                      <h3>{doc.words.length} words</h3>
                      <Button
                        secondary
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(doc.words.map((w) => w.text).join(" "))
                            .then(() => setNotice("Transcript copied."))
                        }
                      >
                        <Copy size={15} />
                        Copy transcript
                      </Button>
                      <Button
                        secondary
                        onClick={() =>
                          download(
                            new Blob([doc.words.map((w) => w.text).join(" ")], {
                              type: "text/plain",
                            }),
                            project!.title + ".txt",
                          )
                        }
                      >
                        <Download size={15} />
                        Download
                      </Button>
                    </div>
                    <div>
                      {doc.words.map((w) => (
                        <button
                          className="transcript-word"
                          key={w.id}
                          onClick={() => {
                            const v = document.querySelector(
                              ".analysis-video",
                            ) as HTMLVideoElement;
                            if (v) {
                              const url = urls[doc.sources[w.clip].id];
                              const seek = () => {
                                v.currentTime = w.start;
                                void v.play();
                              };
                              if (v.src !== url) {
                                v.onloadedmetadata = seek;
                                v.src = url;
                              } else seek();
                            }
                          }}
                        >
                          {w.text}{" "}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-library">
                    <AudioLines />
                    <p>
                      {screen === "analysis"
                        ? "Find the main point, hook and highlights of your original footage."
                        : "Generate a complete transcript with clickable word timestamps."}
                    </p>
                  </div>
                )}
              </main>
            )}
            {screen === "settings" && (
              <main className="dashboard settings-page">
                <div className="page-heading">
                  <div>
                    <p className="eyebrow">MAKE YOURSELF AT HOME</p>
                    <h1>Your studio, your way.</h1>
                  </div>
                </div>
                <div className="settings-grid">
                  <section className="settings-card">
                    <h2>
                      <UserRound size={20} />
                      Profile & appearance
                    </h2>
                    <div className="avatar-editor">
                      <span className="avatar">
                        {avatar ? (
                          <img src={avatar} alt="Your avatar" />
                        ) : (
                          <UserRound size={22} />
                        )}
                      </span>
                      <Button
                        secondary
                        onClick={() => avatarInput.current?.click()}
                      >
                        Change avatar
                      </Button>
                      {avatar && (
                        <button
                          className="text-button"
                          onClick={() => setAvatar(null)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <label>
                      Display name
                      <input
                        maxLength={80}
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder={session.profile.handle || "Your name"}
                      />
                    </label>
                    <label>
                      Appearance
                      <select
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                      >
                        <option value="system">Use device setting</option>
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>
                    <label>
                      Spoken language
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {Object.entries({
                          auto: "Detect automatically",
                          en: "English",
                          es: "Spanish",
                          fr: "French",
                          zh: "Chinese",
                          de: "German",
                          pt: "Portuguese",
                          it: "Italian",
                          ja: "Japanese",
                          ko: "Korean",
                        }).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      secondary
                      onClick={() =>
                        void api("logout", {}).then(() =>
                          desktop() ? desktop()!.signOut() : location.reload(),
                        )
                      }
                    >
                      <LogOut size={16} />
                      Sign out of this browser
                    </Button>
                  </section>
                  <section className="settings-card">
                    <h2>
                      <Sparkles size={20} />
                      AI connection
                    </h2>
                    <p>
                      Connected to{" "}
                      <strong>
                        {session.profile.handle
                          ? "@" + session.profile.handle
                          : "your publik account"}
                      </strong>
                    </p>
                    <div className="plan-card">
                      <span>{session.profile.plan}</span>
                      {session.profile.usedPercent != null ? (
                        <>
                          <progress
                            value={session.profile.usedPercent}
                            max={100}
                          />
                          <small>
                            {session.profile.usedPercent}% of this plan period
                            used
                          </small>
                        </>
                      ) : session.profile.prepaidRemainingPercent != null ? (
                        <>
                          <progress
                            value={session.profile.prepaidRemainingPercent}
                            max={100}
                          />
                          <small>
                            {session.profile.prepaidRemainingPercent}% of
                            prepaid credits remaining
                          </small>
                        </>
                      ) : (
                        <small>
                          Plan usage appears when a plan is connected.
                        </small>
                      )}
                    </div>
                    <label>
                      AI provider
                      <select
                        value={session.profile.choice || "publik"}
                        onChange={(e) =>
                          void api("choice", { choice: e.target.value }).then(
                            refresh,
                          )
                        }
                      >
                        <option value="publik">publik</option>
                        <option value="own_key">My OpenAI key</option>
                      </select>
                    </label>
                    <label>
                      Own OpenAI API key
                      <input
                        type="password"
                        autoComplete="off"
                        value={ownKey}
                        onChange={(e) => setOwnKey(e.target.value)}
                        placeholder={
                          session.profile.hasOwnKey
                            ? "A key is securely saved"
                            : "Paste a key to use your own account"
                        }
                      />
                    </label>
                    <p className="panel-note">
                      Keys are encrypted on the server and never returned to the
                      browser.
                    </p>
                    <a
                      className="text-button"
                      href="https://publikhq.com/wallet"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Manage publik plan <ArrowUpRight size={14} />
                    </a>
                  </section>
                  <section className="settings-card">
                    <h2>
                      <ShieldCheck size={20} />
                      Privacy & data
                    </h2>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      Allow AI processing of audio, transcripts and attached
                      reference frames
                    </label>
                    <p>
                      Editing and export happen in your browser. AI features
                      send extracted audio, transcript text and attached
                      reference frames through your selected provider. Publik
                      currently identifies these providers:{" "}
                      {session.profile.aiProviders.join(", ") ||
                        "available after connection"}
                      . No AI upload happens until you allow it.
                    </p>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={telemetry}
                        onChange={(e) => setTelemetry(e.target.checked)}
                      />
                      Share official usage events with publik
                    </label>
                    <p>
                      Events contain app/version and install identity, never
                      your videos, transcripts or prompts. Background tabs do
                      not send active-session events.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => setPrivacy(true)}
                    >
                      Read privacy & data details
                    </button>
                  </section>
                  <section className="settings-card">
                    <h2>
                      <FolderOpen size={20} />
                      Projects & storage
                    </h2>
                    <p>
                      {session.profile.identityScope === "browser"
                        ? "Projects autosave for this linked browser. Keep exported project metadata and source files when moving to another browser."
                        : "Projects autosave locally and sync their timeline to your account."}{" "}
                      {desktop()
                        ? "Desktop media is read directly from its original disk location. Keep the original files in place; local backup copies stay on this computer."
                        : "Source videos stay on this device unless you explicitly enable cloud backup."}
                    </p>
                    <Button
                      secondary
                      onClick={() =>
                        void run("Backing up source media", async () => {
                          for (const p of projects)
                            for (const s of p.document.sources) {
                              const f = await loadMedia(s.id);
                              if (f) await backup(s.id, f);
                            }
                          setNotice("Available source media backed up.");
                        })
                      }
                    >
                      Back up source media
                    </Button>
                    <Button
                      secondary
                      onClick={() =>
                        download(
                          new Blob([JSON.stringify(projects, null, 2)], {
                            type: "application/json",
                          }),
                          "editai-projects.json",
                        )
                      }
                    >
                      Download project metadata
                    </Button>
                    <button
                      className="danger-link"
                      onClick={() => {
                        if (
                          confirm(
                            "Permanently delete all EditAI Web projects, uploaded sources, usage records and saved credentials? Your publik account and plan are managed separately.",
                          )
                        )
                          void run("Deleting your EditAI data", async () => {
                            await api("account", undefined, "DELETE");
                            await clearStorage();
                            localStorage.removeItem("editai-preferences");
                            if (desktop()) await desktop()!.signOut();
                            else location.reload();
                          });
                      }}
                    >
                      Delete my EditAI Web data
                    </button>
                  </section>
                </div>
                <Button onClick={() => void saveSettings()}>
                  <Check size={17} />
                  Save preferences
                </Button>
              </main>
            )}
            {screen === "record" && (
              <Recorder
                onDone={(files) => {
                  recordingDirty.current = false;
                  void importFiles(files);
                }}
                onDirty={(dirty) => {
                  recordingDirty.current = dirty;
                }}
                onError={fail}
              />
            )}
            {screen === "batch" && (
              <Batch
                onDone={async (groups, useAI) => {
                  await run("Creating batch projects", async () => {
                    const saved: Project[] = [];
                    for (let n = 0; n < groups.length; n++) {
                      activeSignal?.throwIfAborted();
                      if (groups[n].length > 50)
                        throw Error("Choose at most 50 clips per project.");
                      const d = newDocument();
                      for (const f of groups[n]) {
                        const source = await probe(f);
                        if (source.kind !== "video")
                          throw Error("Choose video clips.");
                        await saveMedia(source.id, f);
                        d.sources.push(source);
                        d.segments.push(
                          newSegment(d.sources.length - 1, source.duration),
                        );
                      }
                      const p: Project = {
                        id: crypto.randomUUID(),
                        title:
                          `Batch ${n + 1} — ${groups[n][0].name.replace(/\.[^.]+$/, "")}`.slice(
                            0,
                            140,
                          ),
                        document: d,
                        updatedAt: Date.now(),
                      };
                      await saveProject(p);
                      await api("projects", {
                        id: p.id,
                        title: p.title,
                        document: d,
                      });
                      saved.push(p);
                      setProgress(((n + 1) / groups.length) * 0.2);
                    }
                    let completed = 0;
                    const failures: string[] = [];
                    if (useAI)
                      for (let i = 0; i < saved.length; i++) {
                        activeSignal?.throwIfAborted();
                        const p = saved[i];
                        try {
                          setBusy(
                            `Editing batch video ${i + 1} of ${saved.length}`,
                          );
                          const d = await ensureWords(p.document, p);
                          activeSignal?.throwIfAborted();
                          const plan = await api("ai/edit", { words: d.words });
                          activeSignal?.throwIfAborted();
                          p.document = applyCuts(d, [
                            ...planCuts(d, plan),
                            ...(d.quietCuts || []),
                          ]);
                          p.updatedAt = Date.now();
                          await saveProject(p);
                          await api("projects", {
                            id: p.id,
                            title: p.title,
                            document: p.document,
                          });
                          completed++;
                        } catch (e: any) {
                          if (e.name === "AbortError") throw e;
                          failures.push(p.title + ": " + e.message);
                        }
                        setProgress((i + 1) / saved.length);
                      }
                    setProjects(await listProjects());
                    setScreen("library");
                    setNotice(
                      useAI
                        ? `${saved.length} projects saved; ${completed} AI edits completed${failures.length ? `. ${failures.length} kept as original drafts.` : "."}`
                        : "Batch projects saved.",
                    );
                    if (failures.length) setError(failures[0]);
                  });
                }}
              />
            )}
            <footer className="app-footer">
              <span>Made for your next great idea.</span>
              <button onClick={() => setPrivacy(true)}>Privacy & data</button>
              <span>EditAI for iOS — Coming Soon</span>
            </footer>
          </div>
        </div>
      )}
      {exportOpen && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="section-heading">
              <h2>Ready for the world.</h2>
              <IconButton
                label="Close export"
                onClick={() => setExportOpen(false)}
              >
                <X />
              </IconButton>
            </div>
            <p>Export your finished video as an MP4.</p>
            <label>
              Resolution
              <select
                aria-label="Export resolution"
                value={resolution}
                onChange={(e) => setResolution(+e.target.value)}
              >
                <option value={0}>Original dimensions</option>
                <option value={854}>480p · smaller file</option>
                <option value={1280}>720p · recommended</option>
                <option value={1920}>1080p · full HD</option>
              </select>
            </label>
            <label>
              Frame rate
              <select value={fps} onChange={(e) => setFps(+e.target.value)}>
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </label>
            <div className="export-detail">
              <span>Duration</span>
              <strong>{time(total)}</strong>
              <span>Format</span>
              <strong>MP4 · H.264 + AAC</strong>
            </div>
            <p className="panel-note">
              {desktop()
                ? "Native FFmpeg exports to a file you choose. Simple cuts use the native pipeline; effects and captions use the same EditAI compositor. Export is SDR."
                : "Rendering takes about the length of your video, then MP4 encoding. Keep this tab visible. Browser export is SDR; original HDR/VFR preservation is not available."}
            </p>
            <Button onClick={() => void exportVideo()}>
              <Download size={17} />
              Export video
            </Button>
          </section>
        </div>
      )}
      {privacy && (
        <div className="modal-backdrop">
          <section className="modal privacy-modal">
            <div className="section-heading">
              <h2>Privacy & your data</h2>
              <IconButton
                label="Close privacy"
                onClick={() => setPrivacy(false)}
              >
                <X />
              </IconButton>
            </div>
            <p>
              {desktop()
                ? "EditAI Desktop reads selected source files from disk and renders with native FFmpeg. Projects and optional backup copies stay in this computer’s app storage. Keep originals in place. Credentials are encrypted with the OS credential vault."
                : "EditAI Web keeps editing and rendering in your browser. Drafts and source files are stored in this browser’s IndexedDB. Clearing browser storage removes local files."}
            </p>
            <h3>Your account and cloud storage</h3>
            <p>
              Publik provides sign-in and AI plan connection. EditAI stores
              encrypted per-browser credentials and account-scoped project
              timelines. Cloud source backup is optional, limited to 100 MB/file
              and 500 MB/account. Delete EditAI data in Settings to remove
              hosted projects, source files and encrypted credentials. Manage
              your Publik account/plan separately on publikhq.com.
            </p>
            <h3>AI processing</h3>
            <p>
              With your explicit permission, audio and transcript text are sent
              through Publik or your own OpenAI account for transcription,
              summaries and editing. Their provider terms and retention apply.
              AI can be wrong: review edits and captions before sharing.
            </p>
            <h3>Usage</h3>
            <p>
              Official Publik telemetry records genuine app use and can be
              disabled. It includes no footage, transcripts or prompts. No
              advertising trackers are installed.
            </p>
            <h3>Service limits</h3>
            <p>
              Keep copies of important originals and exports. Browser codec
              support, memory and device performance vary. This service does not
              guarantee native iOS HDR fidelity. Contact editaiapp@gmail.com for
              support or data questions.
            </p>
            <a
              href="https://publikhq.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              Publik privacy policy ↗
            </a>
          </section>
        </div>
      )}
      {busyUI}
      {error && (
        <div className="toast error" role="alert">
          <div>
            <strong>That didn’t finish.</strong>
            <p>{error}</p>
            {errorURL && (
              <a href={errorURL} target="_blank" rel="noreferrer">
                Continue on publik ↗
              </a>
            )}
          </div>
          <IconButton label="Dismiss error" onClick={() => setError("")}>
            <X size={17} />
          </IconButton>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={20} />
          <p>{notice}</p>
          <IconButton
            label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </IconButton>
        </div>
      )}
    </>
  );
}
