"use client";
import {
  MarketingLanding,
  MarketingSignIn,
} from "../components/marketing/landing";
import "./marketing.css";
import "./components/editor-workspace.css";
import { DesktopDownloads } from "../components/desktop-downloads";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Check,
  Copy,
  Download,
  Film,
  FolderOpen,
  Home,
  ImageIcon,
  Layers,
  LayoutGrid,
  List,
  LoaderCircle,
  LogOut,
  Menu,
  Mic,
  MoreHorizontal,
  Music,
  Pause,
  Play,
  Plus,
  Redo,
  CircleHelp,
  CircleAlert,
  Scissors,
  Settings,
  ShieldCheck,
  Crop,
  SlidersHorizontal,
  Sparkles,
  Split,
  Square,
  Subtitles,
  Trash2,
  Type,
  Undo,
  Upload,
  UserRound,
  Video,
  Volume2,
  Maximize,
  X,
} from "lucide-react";
import {
  newDocument,
  newSegment,
  makeOverlay,
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
  deleteUnusedMedia,
  clearStorage,
  setStorageScope,
} from "@/lib/editor/storage";
import {
  desktop,
  mediaURL,
  mediaBlob,
  type MediaResource,
} from "@/lib/editor/desktop";
import { placeSource, type MediaDrop } from "@/lib/editor/placement";
import { FontPreviewPicker } from "./components/FontPreviewPicker";
import { makeReference, type Reference } from "@/lib/editor/reference";
import { ADVANCED_ADJUSTMENTS, POSITIVE_ADJUSTMENTS } from "@/lib/editor/color";
import {
  Button,
  IconButton,
  Range,
  Wordmark,
  resetHoveredRange,
} from "./components/ui";
import { ProjectCard } from "./components/ProjectCard";
import { StudioAccount, StudioOnboarding } from "./components/StudioOnboarding";
import {
  ProfileAvatar,
  ProfileFields,
} from "./components/ProfileCustomization";
import {
  appearances,
  avatarPresets,
  validAppearance,
  validPreset,
  type AvatarPreset,
  type ProfileAppearance,
} from "@/lib/editor/profile";
import { appThemeStyle, type AppColorTheme } from "@/lib/editor/app-theme";
import { useSettingsAutosave } from "./components/useSettingsAutosave";
import { Recorder } from "./components/Recorder";
import { Batch } from "./components/Batch";
import { MotionControls } from "./components/MotionControls";
import { ColorPicker } from "./components/ColorPicker";
import { TextStyleEditor } from "./components/TextStyleEditor";
import { EditableProjectTitle } from "./components/EditableProjectTitle";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { LANE_LIMITS } from "@/lib/editor/lanes";
import { SelectedMediaInspector } from "./components/SelectedMediaInspector";
import { CropEditor } from "./components/CropEditor";
import { PreviewHandles } from "./components/PreviewHandles";
import { removeUnusedSource } from "@/lib/editor/library";
import { EditorSourceLibrary } from "./components/EditorSourceLibrary";
import { EditorTimeline } from "./components/EditorTimeline";
import { copyItem, pasteItem, type EditorCopy } from "@/lib/editor/clipboard";
import { fitLayers, layerAction, type Track } from "@/lib/editor/timeline";
import { quietPauses } from "@/lib/editor/audio-evidence";
type Screen =
  | "home"
  | "library"
  | "editor"
  | "settings"
  | "profile"
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
export default function App({
  signIn = false,
  signedOut = false,
}: {
  signIn?: boolean;
  signedOut?: boolean;
}) {
  const voiceStart = useRef(0);
  const latestProfileName = useRef("");
  const editorCopy = useRef<{ projectId: string; copy: EditorCopy } | null>(
    null,
  );
  const [session, setSession] = useState<any>(null),
    [gateError, setGateError] = useState(""),
    [pending, setPending] = useState(true),
    [screen, setScreen] = useState<Screen>("home"),
    [project, setProject] = useState<Project | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [editsLayout, setEditsLayout] = useState("grid"),
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
    [editorPanel, setEditorPanel] = useState("media"),
    [removingMedia, setRemovingMedia] = useState(false),
    [selectedLayer, setSelectedLayer] = useState<{
      track: Track;
      id: string;
    } | null>(null),
    [selectedText, setSelectedText] = useState(""),
    [onlySelectedText, setOnlySelectedText] = useState(false),
    [captionStyleOpen, setCaptionStyleOpen] = useState(true),
    [helpOpen, setHelpOpen] = useState(false),
    [cropping, setCropping] = useState(false),
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
    [theme, setTheme] = useState<ProfileAppearance>("system"),
    [appTheme, setAppTheme] = useState<AppColorTheme>("editAI"),
    [darkAppearance, setDarkAppearance] = useState(false),
    [avatarPreset, setAvatarPreset] = useState<AvatarPreset>("editAI"),
    [language, setLanguage] = useState("auto"),
    [summary, setSummary] = useState<any>(null),
    [profileName, setProfileName] = useState(""),
    [avatar, setAvatar] = useState<string | null>(null),
    [privacy, setPrivacy] = useState(false),
    [menu, setMenu] = useState(false),
    [consentSaving, setConsentSaving] = useState(false),
    [consentError, setConsentError] = useState(""),
    [renaming, setRenaming] = useState<Project | null>(null),
    [renameTitle, setRenameTitle] = useState(""),
    [renameSaving, setRenameSaving] = useState(false),
    [renameError, setRenameError] = useState("");
  const aiBusy =
    !!busy &&
    /EditAI|speech|captions|analysis|main point|highlights|Transcrib|Preparing audio|Editing batch video/i.test(
      busy,
    );
  useEffect(() => {
    setEditsLayout(
      localStorage.getItem("editai.library.layout") === "list"
        ? "list"
        : "grid",
    );
  }, []);
  const operationActive = useRef(false);
  const remoteOwner = useRef("");
  remoteOwner.current =
    session?.profile.ownerId || session?.profile.handle || "";
  const remoteProjectWrite = useRef<Promise<unknown>>(Promise.resolve());
  function persistRemoteProject(p: Project) {
    const owner = remoteOwner.current;
    const write = remoteProjectWrite.current
      .catch(() => {})
      .then(() =>
        owner === remoteOwner.current
          ? api("projects", { id: p.id, title: p.title, document: p.document })
          : undefined,
      );
    remoteProjectWrite.current = write;
    return write;
  }
  const persistedProject = useRef<Project | null>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const renameDialog = useRef<HTMLDialogElement>(null);
  const consentRequired =
    session?.screen.id === "ready" &&
    !session.profile.consentDecided &&
    !session.profile.consent;
  const authPopup = useRef<Window | null>(null);
  const [authPurpose, setAuthPurpose] = useState<"sign_in" | "get_plan" | null>(
    null,
  );
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
  const replacingAudio = useRef<string | null>(null);
  projectRef.current = project;
  urlsRef.current = urls;
  const getPlaybackTime = useCallback(() => player.current?.time || 0, []);
  const [reference, setReference] = useState<Reference | null>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const doc = project?.document,
    total = doc ? duration(doc) : 0,
    segment = doc?.segments.find((s) => s.id === selected) || doc?.segments[0],
    textLayer = doc?.texts.find((t) => t.id === selectedText);
  const mediaSelection: {
    track: "segments" | "audio" | "overlays";
    id: string;
  } =
    selectedLayer?.track === "audio" || selectedLayer?.track === "overlays"
      ? { track: selectedLayer.track, id: selectedLayer.id }
      : { track: "segments", id: segment?.id || "" };
  function closeCrop() {
    setCropping(false);
    if (player.current && doc) {
      player.current.doc = doc;
      player.current.draw();
    }
  }
  function scrollInspector(section?: string) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const panel = document.querySelector<HTMLElement>(
          ".is-editor .inspector",
        );
        if (!panel) return;
        const target = section
          ? panel.querySelector<HTMLElement>(`[data-section="${section}"]`)
          : null;
        if (target) {
          const details = target.querySelector("details");
          if (details) details.open = true;
          const tabs = panel
            .querySelector(".inspector-tabs")!
            .getBoundingClientRect();
          panel.scrollTop = Math.max(
            0,
            target.getBoundingClientRect().top -
              panel.getBoundingClientRect().top +
              panel.scrollTop -
              tabs.height -
              16,
          );
        } else panel.scrollTop = 0;
        if (innerWidth < 1100) panel.scrollIntoView({ block: "nearest" });
      }),
    );
  }
  useEffect(() => {
    if (!privacy && !exportOpen && !helpOpen && !aiBusy) return;
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
      if (e.key === "Escape" && !aiBusy) {
        setPrivacy(false);
        setExportOpen(false);
        setHelpOpen(false);
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
  }, [privacy, exportOpen, helpOpen, aiBusy]);
  const fail = useCallback((e: any) => {
    setError(e.message || String(e));
    setErrorURL(e.url || "");
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => {
      setError("");
      setErrorURL("");
    }, 8000);
    return () => clearTimeout(timer);
  }, [error]);
  const gateScreen = session?.screen;
  const gateAdvanced =
    gateScreen?.id === "ready" ||
    (authPurpose === "sign_in" && gateScreen?.id === "choose") ||
    (authPurpose === "get_plan" &&
      gateScreen?.buttons?.some(
        (button: { action: string }) => button.action === "connect",
      ));
  useEffect(() => {
    if (!gateAdvanced || !authPurpose) return;
    // The popup may already be detached by cross-origin opener isolation.
    if (authPopup.current && !authPopup.current.closed)
      authPopup.current.close();
    authPopup.current = null;
    setAuthPurpose(null);
    setBlockedAuthURL("");
  }, [gateAdvanced, authPurpose]);
  const settingsSave = useSettingsAutosave(
    remoteOwner.current,
    async (patch) => {
      await api("settings", patch);
      setSession((current: any) => ({
        ...current,
        profile: {
          ...current.profile,
          ...Object.fromEntries(
            Object.entries(patch).filter(([key]) => key !== "ownKey"),
          ),
          ...(patch.ownKey ? { hasOwnKey: true, choice: "own_key" } : {}),
          ...(typeof patch.consent === "boolean"
            ? { consentDecided: true }
            : {}),
        },
      }));
      if (patch.ownKey)
        setOwnKey((value) => (value === patch.ownKey ? "" : value));
    },
  );
  useEffect(() => {
    if (!ownKey.trim()) return;
    const timer = setTimeout(() => {
      if (ownKey.trim().length >= 12)
        settingsSave.schedule({ ownKey: ownKey.trim() });
    }, 900);
    return () => clearTimeout(timer);
  }, [ownKey, settingsSave.schedule]);
  function updateName(value: string) {
    latestProfileName.current = value;
    setProfileName(value);
    settingsSave.schedule({ displayName: value, avatar });
  }
  function updatePhoto(value: string | null) {
    setAvatar(value);
    settingsSave.schedule({
      displayName: latestProfileName.current,
      avatar: value,
    });
  }
  async function selectProvider(choice: string) {
    if (!(await settingsSave.flush())) return;
    try {
      await api("choice", { choice });
      setSession((current: any) => ({
        ...current,
        profile: { ...current.profile, choice },
      }));
    } catch (error) {
      fail(error);
    }
  }
  const refresh = useCallback(async () => {
    try {
      const s = await api("session");
      setSession(s);
      setGateError("");
      setConsent(s.profile.consent);
      setTelemetry(s.profile.telemetry);
      latestProfileName.current = s.profile.displayName || "";
      setProfileName(latestProfileName.current);
      setAvatar(s.profile.avatar || null);
      setAvatarPreset(
        validPreset(s.profile.avatarPreset) ? s.profile.avatarPreset : "editAI",
      );
      if (validAppearance(s.profile.appearance)) setTheme(s.profile.appearance);
    } catch (e: any) {
      setGateError(e.message);
    } finally {
      setPending(false);
    }
  }, []);
  useEffect(() => {
    if (!signedOut) void refresh();
    let p: any = {};
    try {
      p = JSON.parse(localStorage.getItem("editai-preferences") || "{}");
    } catch {}
    if (validAppearance(p.theme)) setTheme(p.theme);
    setLanguage(p.language || "auto");
    if (validPreset(p.appTheme)) setAppTheme(p.appTheme);
  }, [refresh, signedOut]);
  useEffect(() => {
    const preference = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark =
        theme === "dark" || (theme === "system" && preference.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      setDarkAppearance(dark);
    };
    apply();
    preference.addEventListener("change", apply);
    localStorage.setItem(
      "editai-preferences",
      JSON.stringify({ theme, language, appTheme }),
    );
    return () => preference.removeEventListener("change", apply);
  }, [theme, language, appTheme]);
  useEffect(() => {
    if (!renaming) return;
    renameDialog.current?.showModal();
    renameInput.current?.select();
  }, [renaming]);
  useEffect(() => {
    if (!authPurpose || gateAdvanced) return;
    const started = Date.now();
    const resumed = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", resumed);
    document.addEventListener("visibilitychange", resumed);
    const id = setInterval(() => {
      if (Date.now() - started >= 600000) {
        clearInterval(id);
        setAuthPurpose(null);
        setGateError(
          "Connection is still pending. Select Retry to check again.",
        );
        return;
      }
      if (document.visibilityState === "visible") void refresh();
    }, 3000);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", resumed);
      document.removeEventListener("visibilitychange", resumed);
    };
  }, [authPurpose, gateAdvanced, refresh]);
  useEffect(() => {
    if (session?.screen.id !== "ready" || consentRequired) return;
    let cancelled = false;
    const owner = session.profile.ownerId || session.profile.handle;
    setStorageScope(owner);
    void listProjects().then((p) => {
      if (!cancelled) setProjects(p);
    });
    void api("projects")
      .then(async (b) => {
        for (const p of b.projects || []) {
          if (cancelled) return;
          const remote = {
            id: p.id,
            title: p.title,
            document: JSON.parse(p.document),
            updatedAt: p.updated_at,
          };
          const local = (await listProjects()).find((x) => x.id === p.id);
          if (!local || local.updatedAt < remote.updatedAt)
            await saveProject(remote, owner);
        }
        const restored = await listProjects();
        if (!cancelled) setProjects(restored);
      })
      .catch((e) => {
        if (!cancelled) fail(e);
      });
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
      cancelled = true;
      document.removeEventListener("pointerdown", event);
      document.removeEventListener("keydown", event);
    };
  }, [
    session?.screen.id,
    session?.profile.ownerId,
    session?.profile.handle,
    consentRequired,
    fail,
  ]);
  useEffect(() => {
    if (!project || project === persistedProject.current) return;
    const timer = setTimeout(async () => {
      const p = { ...project, updatedAt: Date.now() };
      await saveProject(p);
      persistedProject.current = project;
      setProjects(await listProjects());
      if (session?.screen.id === "ready")
        persistRemoteProject(p).catch(() => {});
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
    const current = player.current;
    void current
      .init()
      .then(() => {
        if (player.current === current)
          current.seek(Math.min(current.time, duration(doc)));
      })
      .catch(fail);
  }, [doc, resolution]);
  const textFonts = [...new Set(doc?.texts.map((t) => t.font) || [])]
    .sort()
    .join("|");
  useEffect(() => {
    for (const font of textFonts.split("|").filter(Boolean)) {
      void document.fonts
        .load(`600 30px "${font}"`)
        .then(() => player.current?.draw())
        .catch(fail);
    }
  }, [textFonts, fail]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "input,textarea,select,[contenteditable]",
        ) ||
        screen !== "editor" ||
        helpOpen ||
        exportOpen ||
        !!busy ||
        privacy
      )
        return;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        deleteSelection();
        return;
      }
      if (
        e.key.toLowerCase() === "r" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        resetHoveredRange()
      ) {
        e.preventDefault();
        return;
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        ["c", "v"].includes(e.key.toLowerCase())
      ) {
        if (e.key.toLowerCase() === "c") {
          const selection =
            selectedLayer ||
            (selectedText
              ? { track: "texts" as const, id: selectedText }
              : { track: "segments" as const, id: selected });
          if (!selection.id || !project) return;
          e.preventDefault();
          editorCopy.current = {
            projectId: project.id,
            copy: copyItem(project.document, selection.track, selection.id),
          };
        } else if (editorCopy.current && project) {
          e.preventDefault();
          try {
            if (editorCopy.current.projectId !== project.id)
              throw Error("Copy an item from this edit before pasting.");
            const result = pasteItem(
              project.document,
              editorCopy.current.copy,
              player.current?.time ?? playhead,
            );
            change(result.doc);
            setSelectedLayer({ track: result.track, id: result.id });
            if (result.track === "texts") {
              setSelectedText(result.id);
              setTool("captions");
            } else {
              setSelectedText("");
              setTool("clip");
              if (result.track === "segments") setSelected(result.id);
            }
          } catch (error) {
            fail(error);
          }
        }
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        try {
          if (selectedLayer && selectedLayer.track !== "segments") {
            change(
              layerAction(
                projectRef.current!.document,
                selectedLayer.track,
                selectedLayer.id,
                "split",
                player.current?.time || 0,
              ),
            );
            return;
          }
          const a = atTime(
            projectRef.current!.document,
            player.current?.time || 0,
          );
          if (a)
            change(
              split(projectRef.current!.document, a.segment.id, a.sourceTime),
            );
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
  function change(d: Document, saved?: Project) {
    if (!projectRef.current) return;
    try {
      fitLayers(d);
      setHistory((h) => [
        ...h.slice(-99),
        structuredClone(projectRef.current!.document),
      ]);
      setFuture([]);
      setProject((p) => saved || (p ? { ...p, document: d } : p));
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
  function updateTextStyle(values: Partial<TextLayer>) {
    patch((d) => {
      const style = Object.fromEntries(
        Object.entries(values).filter(
          ([key]) => !["id", "anchor", "text", "start", "end"].includes(key),
        ),
      );
      for (const t of d.texts.filter(
        (t) => !onlySelectedText || t.id === selectedText,
      ))
        Object.assign(t, style);
      if (!onlySelectedText) d.captionStyle = { ...d.captionStyle, ...style };
      const selected = d.texts.find((t) => t.id === selectedText);
      if (selected && (values.start != null || values.end != null)) {
        Object.assign(selected, {
          start: values.start ?? selected.start,
          end: values.end ?? selected.end,
        });
        delete selected.anchor;
      }
    });
  }
  function addTextLayer() {
    if (!doc) return;
    const start = Math.min(playhead, total - 0.1);
    const t: TextLayer = {
      id: crypto.randomUUID(),
      text: "",
      start,
      end: Math.min(total, start + 3),
      x: 0.5,
      y: 0.5,
      size: 0.055,
      color: "#ffffff",
      background: "transparent",
      font: "TikTok Sans",
      outline: true,
      animation: "none",
      ...doc.captionStyle,
    };
    patch((d) => d.texts.push(t));
    setSelectedText(t.id);
    setSelectedLayer({ track: "texts", id: t.id });
    setTool("captions");
  }
  function addLibrarySource(index: number, drop?: MediaDrop) {
    if (!doc) return;
    try {
      const track =
        editorPanel === "audio"
          ? "audio"
          : editorPanel === "overlays"
            ? "overlays"
            : "segments";
      change(
        placeSource(
          structuredClone(doc),
          index,
          drop || { track, time: track === "segments" ? total : playhead },
        ),
      );
    } catch (e) {
      fail(e);
    }
  }
  async function removeLibraryMedia(index: number) {
    const current = projectRef.current;
    if (!current || removingMedia || operationActive.current) return;
    setRemovingMedia(true);
    operationActive.current = true;
    try {
      const id = current.document.sources[index].id;
      const next = {
        ...current,
        document: removeUnusedSource(current.document, index),
        updatedAt: Date.now(),
      };
      setHistory([]);
      setFuture([]);
      editorCopy.current = null;
      projectRef.current = next;
      persistedProject.current = next;
      setProject(next);
      await saveProject(next);
      await persistRemoteProject(next);
      await api("assets/" + id, undefined, "DELETE");
      await deleteUnusedMedia(id);
      const nextUrls = { ...urlsRef.current };
      if (nextUrls[id]?.startsWith("blob:")) URL.revokeObjectURL(nextUrls[id]);
      delete nextUrls[id];
      setUrls(nextUrls);
      setProjects(await listProjects());
    } catch (e) {
      fail(e);
    } finally {
      operationActive.current = false;
      setRemovingMedia(false);
    }
  }
  function deleteSelection() {
    if (!doc) return;
    try {
      if (selectedLayer && selectedLayer.track !== "segments") {
        change(
          layerAction(
            doc,
            selectedLayer.track,
            selectedLayer.id,
            "delete",
            playhead,
          ),
        );
        setSelectedLayer(null);
        setSelectedText("");
      } else if (segment) {
        if (doc.segments.length <= 1) {
          setNotice(
            "Keep at least one video clip in your edit. Add another clip before deleting this one.",
          );
          return;
        }
        const copy = structuredClone(doc);
        copy.segments = copy.segments.filter((s) => s.id !== segment.id);
        change(copy);
        setSelected(copy.segments[0].id);
        setSelectedLayer(null);
        setSelectedText("");
      }
    } catch (e) {
      fail(e);
    }
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
      if (choice === "resume" || choice === "switch_account") {
        await api("resume", { forget: choice === "switch_account" });
        await refresh();
        setScreen("home");
        return;
      }
      if (choice === "sign_in" || choice === "get_plan") {
        const url = session?.claimURL;
        if (url) {
          const popup = window.open(
            "about:blank",
            "editai-publik",
            "popup,width=540,height=720",
          );
          setAuthPurpose(choice);
          if (popup) {
            setBlockedAuthURL("");
            popup.opener = null;
            popup.location.href = url;
            authPopup.current = popup;
          } else setBlockedAuthURL(url);
        }
        return;
      }
      await api("choice", {
        choice: choice === "own_key" ? "own_key" : "publik",
      });
      await refresh();
      setScreen("home");
    } catch (e) {
      fail(e);
    }
  }
  async function run(label: string, fn: () => Promise<void>) {
    if (operationActive.current) {
      setNotice("Finish or cancel the current operation first.");
      return;
    }
    operationActive.current = true;
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
      operationActive.current = false;
      setBusy("");
      setProgress(0);
    }
  }
  async function signOut(forget = false) {
    if (!(await settingsSave.flush())) return;
    try {
      player.current?.pause();
      setPlaying(false);
      const current = projectRef.current;
      if (current) {
        const saved = { ...current, updatedAt: Date.now() };
        const owner = session.profile.ownerId || session.profile.handle;
        await saveProject(saved, owner);
        // Finish the last edit before invalidating its session. Local media is
        // retained even if a cloud request is unavailable during sign-out.
        await remoteProjectWrite.current.catch(() => {});
        await api("projects", {
          id: saved.id,
          title: saved.title,
          document: saved.document,
        }).catch(() => {});
        persistedProject.current = current;
      }
      await api("logout", { forget });
      if (desktop()) await desktop()!.signOut(forget);
      else location.assign("/");
    } catch (e) {
      fail(e);
    }
  }
  async function openProject(p: Project) {
    p = { ...p, document: fitLayers(structuredClone(p.document)) };
    await run("Opening your project", async () => {
      const next = { ...urlsRef.current };
      for (const s of p.document.sources) {
        if (next[s.id]) continue;
        let b = await loadMedia(s.id);
        if (!b) {
          const r = await fetch("/api/assets/" + s.id);
          if (!r.ok)
            throw Error(
              `The source “${s.name}” is missing. Restore it on this device to reopen the project.`,
            );
          b = await r.blob();
          await saveMedia(s.id, b);
        }
        next[s.id] = mediaURL(b);
      }
      setUrls(next);
      persistedProject.current = p;
      setProject(p);
      setSelectedLayer(null);
      setSelectedText("");
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
      const media: { id: string; file: File; mime: string }[] = [];
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
        await saveMedia(s.id, f, s.mime);
        media.push({ id: s.id, file: f, mime: s.mime });
        d.sources.push(s);
        d.segments.push(newSegment(i, s.duration));
        next[s.id] = desktop()
          ? mediaURL((await loadMedia(s.id))!)
          : URL.createObjectURL(f);
        setProgress((i + 1) / files.length);
      }
      const p = {
        id: crypto.randomUUID(),
        title: files[0].name.replace(/\.[^.]+$/, "").slice(0, 140),
        document: d,
        updatedAt: Date.now(),
      };
      setUrls(next);
      await saveProject(p);
      persistedProject.current = p;
      setProject(p);
      setProjects(await listProjects());
      setSelectedLayer(null);
      setSelectedText("");
      setSelected(d.segments[0].id);
      setPlayhead(0);
      setHistory([]);
      setFuture([]);
      setSummary(null);
      setMessages([]);
      if (kind === "edit") {
        if (session?.profile.consent) {
          try {
            const transcribed = await ensureWords(d, p);
            setBusy("EditAI is creating your first cut");
            activeSignal?.throwIfAborted();
            const plan = await api("ai/edit", { words: transcribed.words });
            activeSignal?.throwIfAborted();
            const edited = applyCuts(transcribed, [
              ...planCuts(transcribed, plan),
              ...(transcribed.quietCuts || []),
            ]);
            p.document = edited;
            setHistory([transcribed]);
            setProject({ ...p });
            setSelected(edited.segments[0].id);
            await saveProject(p);
            setNotice(
              "Your first cut is ready. Ask EditAI for changes or refine the timeline. Undo restores the original.",
            );
          } catch (e: any) {
            // Original media and any persisted transcription job remain recoverable.
            if (e.name === "AbortError")
              setNotice(
                "Automatic editing cancelled. Your footage is ready for manual editing.",
              );
            else {
              fail(e);
              setNotice(
                "Automatic editing could not finish. Your original footage is ready to edit; ask EditAI for changes.",
              );
            }
          }
        } else
          setNotice(
            "Your footage is ready for manual editing. Enable AI processing in Settings to create an automatic first cut.",
          );
      }
      setScreen(
        kind === "transcript"
          ? "transcript"
          : kind === "analysis"
            ? "analysis"
            : "editor",
      );
      try {
        await syncProject(p, media);
      } catch (e: any) {
        if (e.name !== "AbortError")
          setError("Edit saved on this device. " + e.message);
      }
    });
  }
  async function syncProject(
    p: Project,
    media: { id: string; file: File; mime: string }[],
  ) {
    await api("projects", { id: p.id, title: p.title, document: p.document });
    if (desktop()) return;
    const failures: string[] = [];
    for (const { id, file, mime } of media) {
      activeSignal?.throwIfAborted();
      try {
        await backup(id, file, mime);
      } catch (e: any) {
        if (e.name === "AbortError") throw e;
        failures.push(`${file.name} · ${e.message}`);
      }
    }
    if (failures.length)
      throw Error(
        "Some sources could not be saved to your private cloud. " + failures[0],
      );
  }
  async function backup(id: string, media: MediaResource, mime = media.type) {
    if (media.size > 100 * 1024 * 1024)
      throw Error("The per-file cloud limit is 100 MB.");
    const f = await mediaBlob(media);
    const r = await fetch("/api/assets/" + id, {
      method: "PUT",
      headers: {
        "content-type": mime || "video/mp4",
        "x-file-name": encodeURIComponent(f instanceof File ? f.name : "Media"),
      },
      body: f,
      signal: activeSignal,
    });
    if (!r.ok)
      throw Error(((await r.json()) as any).error || "Cloud backup failed.");
  }
  async function addMedia(files: File[], drop?: MediaDrop) {
    if (!doc) return;
    const projectId = project!.id;
    const kind = mediaKind.current;
    const replacement = drop ? null : replacingAudio.current;
    if (replacement && files.length !== 1) {
      replacingAudio.current = null;
      fail(Error("Choose one file to replace this sound."));
      return;
    }
    await run("Adding media", async () => {
      const imported: { source: Source; file: File; url: string }[] = [];
      for (const f of files) {
        activeSignal?.throwIfAborted();
        const source = await probe(f);
        await saveMedia(source.id, f, source.mime);
        activeSignal?.throwIfAborted();
        imported.push({
          source,
          file: f,
          url: desktop()
            ? mediaURL((await loadMedia(source.id))!)
            : URL.createObjectURL(f),
        });
      }
      const latest = projectRef.current;
      if (!latest || latest.id !== projectId) {
        imported.forEach(({ url }) => {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        });
        return;
      }
      const d = structuredClone(latest.document);
      const total = duration(d);
      const placement = Math.min(playhead, total - 0.1);
      let dropTime = drop?.time || 0;
      const next = { ...urlsRef.current };
      const media: { id: string; file: File; mime: string }[] = [];
      for (const { source: s, file: f, url } of imported) {
        media.push({ id: s.id, file: f, mime: s.mime });
        next[s.id] = url;
        const i = d.sources.length;
        d.sources.push(s);
        if (drop) {
          placeSource(d, i, { ...drop, time: dropTime });
          if (drop.track === "segments" && s.kind !== "audio") {
            const inserted = d.segments.findIndex(
              (segment) => segment.sourceIndex === i,
            );
            dropTime = d.segments
              .slice(0, inserted + 1)
              .reduce((sum, segment) => sum + segmentDuration(segment), 0);
          }
          continue;
        }
        if (kind === "clip") {
          if (s.kind === "audio")
            throw Error(
              "Choose a video or image for the main track. Use Audio to add sound.",
            );
          d.segments.push(newSegment(i, s.kind === "image" ? 3 : s.duration));
        } else if (kind === "audio") {
          if (replacement) {
            const clip = d.audio.find((a) => a.id === replacement);
            if (!clip || s.kind === "image")
              throw Error("Choose playable audio to replace this sound.");
            clip.sourceIndex = i;
            clip.sourceStart = 0;
            clip.end = Math.min(
              clip.end,
              clip.start + s.duration / (clip.speed ?? 1),
            );
            continue;
          }
          const lane = Array.from(
            { length: LANE_LIMITS.audio },
            (_, i) => i,
          ).find(
            (l) =>
              !d.audio.some(
                (a) =>
                  a.lane === l &&
                  a.start < placement + s.duration &&
                  a.end > placement,
              ),
          );
          if (lane === undefined)
            throw Error("All audio lanes are occupied at this position.");
          d.audio.push({
            id: crypto.randomUUID(),
            sourceIndex: i,
            start: placement,
            end: Math.min(total, placement + s.duration),
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
            start: placement,
            end: Math.min(
              total,
              placement + (s.kind === "image" ? 5 : s.duration),
            ),
            sourceStart: 0,
            x: 0.75,
            y: 0.25,
            width: 0.3,
            opacity: 1,
          });
      }
      validate(d);
      const current = {
        ...projectRef.current!,
        document: d,
        updatedAt: Date.now(),
      };
      setUrls(next);
      persistedProject.current = current;
      change(d, current);
      await saveProject(current);
      const addedIndex = d.sources.length - 1;
      const addedAudio = d.audio.findLast((x) => x.sourceIndex === addedIndex),
        addedOverlay = d.overlays.findLast((x) => x.sourceIndex === addedIndex),
        addedClip = d.segments.findLast((x) => x.sourceIndex === addedIndex);
      if (addedAudio) setSelectedLayer({ track: "audio", id: addedAudio.id });
      else if (addedOverlay)
        setSelectedLayer({ track: "overlays", id: addedOverlay.id });
      else if (addedClip) {
        setSelectedLayer({ track: "segments", id: addedClip.id });
        setSelected(addedClip.id);
      }
      setSelectedText("");
      setTool("clip");
      scrollInspector();

      setProjects(await listProjects());
      await syncProject(current, media);
    });
    replacingAudio.current = null;
  }
  function moveSelectedToOverlay() {
    if (!doc || !segment) return;
    try {
      change(makeOverlay(doc, segment.id, playhead));
      setSelectedLayer({
        track: "overlays",
        id: segment.id,
      });
      setSelected(doc.segments.find((x) => x.id !== segment.id)?.id || "");
      setTool("clip");
    } catch (e) {
      fail(e);
    }
  }
  function detachClipAudio() {
    if (!doc || !segment || doc.sources[segment.sourceIndex].kind !== "video")
      return;
    try {
      const d = structuredClone(doc),
        clip = d.segments.find((s) => s.id === segment.id)!;
      const start = d.segments
        .slice(0, d.segments.indexOf(clip))
        .reduce((sum, s) => sum + segmentDuration(s), 0);
      const end = start + segmentDuration(clip);
      const lane = Array.from({ length: LANE_LIMITS.audio }, (_, i) => i).find(
        (l) =>
          !d.audio.some((a) => a.lane === l && a.start < end && a.end > start),
      );
      if (lane == null)
        throw Error(
          "All audio tracks are occupied here. Move or trim a sound first.",
        );
      const audio = {
        id: crypto.randomUUID(),
        sourceIndex: clip.sourceIndex,
        sourceStart: clip.start,
        start,
        end,
        speed: clip.speed,
        lane,
        volume: clip.volume,
        fadeIn: clip.fadeIn ?? 0,
        fadeOut: clip.fadeOut ?? 0,
      };
      d.audio.push(audio);
      clip.volume = 0;
      validate(d);
      change(d);
      setSelectedLayer({ track: "audio", id: audio.id });
      setTool("clip");
    } catch (e) {
      fail(e);
    }
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
    const wordIds = new Set(words.map((word) => word.id));
    let wordOrdinal = words.length;
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
          let wordId = `${i}:${wordOrdinal++}`;
          while (wordIds.has(wordId)) wordId = `${i}:${wordOrdinal++}`;
          wordIds.add(wordId);
          words.push({
            id: wordId,
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
      change(captions(await ensureWords(doc), doc.captionFormat));
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
          overlays: doc.overlays.map((o) => ({
            start: o.start,
            centerX: o.x,
            centerY: o.y,
            width: o.width,
            segment: {
              id: o.id,
              source: o.sourceIndex,
              start: o.sourceStart,
              end: o.sourceStart + (o.end - o.start) * (o.speed ?? 1),
              speed: o.speed ?? 1,
              volume: o.volume ?? 0,
              appearance: o.appearance,
            },
          })),
          audioClips: doc.audio.map((a) => ({
            start: a.start,
            lane: a.lane,
            fadeIn: a.fadeIn,
            fadeOut: a.fadeOut,
            isMuted: a.muted ?? false,
            segment: {
              id: a.id,
              source: a.sourceIndex,
              start: a.sourceStart,
              end: a.sourceStart + (a.end - a.start) * (a.speed ?? 1),
              speed: a.speed ?? 1,
              volume: a.volume,
            },
          })),
        },
        sources: doc.sources.map((s) => ({
          name: s.name,
          isAudioOnly: s.kind === "audio",
        })),
        sourceDurations: doc.sources.map((s) => s.duration),
        selectedClipID:
          selectedLayer?.track !== "texts"
            ? selectedLayer?.id || selected
            : selected,
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
  async function chooseConsent(allow: boolean) {
    setConsentSaving(true);
    setConsentError("");
    try {
      await api("consent", { allow });
      setConsent(allow);
      setSession((current: any) => ({
        ...current,
        profile: { ...current.profile, consent: allow, consentDecided: true },
      }));
    } catch (e: any) {
      setConsentError(e.message);
    } finally {
      setConsentSaving(false);
    }
  }
  function startRename(p: Project) {
    setRenameTitle(p.title);
    setRenameError("");
    setRenaming(p);
  }
  async function renameProject() {
    if (!renaming || renameSaving || !renameTitle.trim()) return;
    setRenameSaving(true);
    setRenameError("");
    const working =
      projectRef.current?.id === renaming.id ? projectRef.current : null;
    const updated = {
      ...(working || renaming),
      title: renameTitle.trim(),
      updatedAt: Date.now(),
    };
    try {
      const needsSync = working && working !== persistedProject.current;
      if (!needsSync) {
        try {
          const result = await api(
            "projects/" + updated.id,
            { title: updated.title },
            "PATCH",
          );
          updated.updatedAt = result.updatedAt;
        } catch (e: any) {
          if (e.status !== 404) throw e;
          await syncProject(updated, []);
        }
      } else {
        await syncProject(updated, []);
      }
      await saveProject(updated);
      if (working) {
        persistedProject.current = updated;
        setProject(updated);
      }
      setProjects(await listProjects());
      setRenaming(null);
    } catch (e: any) {
      setRenameError(e.message);
    } finally {
      setRenameSaving(false);
    }
  }
  async function removeProject(p: Project) {
    if (
      !confirm(
        `Delete “${p.title}”? This removes the project from your library.`,
      )
    )
      return;
    try {
      await api("projects/" + p.id, undefined, "DELETE");
      await deleteProject(p.id);
      if (projectRef.current?.id === p.id) setProject(null);
      setProjects(await listProjects());
    } catch (e) {
      fail(e);
    }
  }
  const nav = async (s: Screen) => {
    if (!(await settingsSave.flush())) return;
    if (
      screen === "record" &&
      recordingDirty.current &&
      s !== "record" &&
      !confirm("Discard your recorded takes and leave the recorder?")
    )
      return;
    player.current?.pause();
    setPlaying(false);
    if (screen === "editor" && s !== "editor" && projectRef.current) {
      const current = projectRef.current;
      const saved = { ...current, updatedAt: Date.now() };
      try {
        await saveProject(saved);
        persistedProject.current = current;
        setProjects(await listProjects());
        void api("projects", {
          id: saved.id,
          title: saved.title,
          document: saved.document,
        }).catch(() => {});
      } catch (e) {
        fail(e);
        return;
      }
    }
    setScreen(s);
    if (s === "settings") void settingsSave.flush();
    setMenu(false);
  };
  const accountGate = (
    <StudioAccount
      title={
        pending
          ? "Opening your studio…"
          : gateScreen?.title || "Sign in with publik"
      }
      signIn={
        !pending &&
        !gateError &&
        gateScreen?.id === "sign_in" &&
        Boolean(session?.claimURL)
      }
      onGoogle={() => void choose("sign_in")}
    >
      {pending ? (
        <LoaderCircle className="spin" aria-label="Loading" />
      ) : gateError ? (
        <>
          <p role="alert">{gateError}</p>
          <Button
            onClick={() => {
              setPending(true);
              void refresh();
            }}
          >
            Retry
          </Button>
        </>
      ) : (
        <>
          {["choose", "remembered"].includes(gateScreen?.id) && (
            <p>{gateScreen.body}</p>
          )}
          {gateScreen?.buttons?.map(
            (button: { action: string; label: string }, index: number) => (
              <Button
                key={button.action}
                secondary={gateScreen.id === "sign_in" || index > 0}
                disabled={button.action === "sign_in" && !session?.claimURL}
                onClick={() => void choose(button.action)}
              >
                {button.label}
              </Button>
            ),
          )}
          {gateScreen?.id === "sign_in" && !session?.claimURL && (
            <Button onClick={() => void refresh()}>Retry</Button>
          )}
        </>
      )}
      {authPurpose && (
        <p role="status">
          {authPurpose === "sign_in"
            ? "Finish signing in in the Publik window, then return here."
            : "Finish connecting your plan in the Publik window, then return here."}
        </p>
      )}
      {blockedAuthURL && (
        <a href={blockedAuthURL} target="_blank" rel="noreferrer">
          Open Publik sign-in
        </a>
      )}
    </StudioAccount>
  );
  const busyUI = aiBusy && (
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
              updatePhoto(c.toDataURL("image/jpeg", 0.8));
            });
          e.target.value = "";
        }}
      />
      {pending || session?.screen.id !== "ready" ? (
        !signedOut && (signIn || desktop()) ? (
          <MarketingSignIn onPrivacy={() => setPrivacy(true)}>
            {["choose", "remembered"].includes(gateScreen?.id) ||
            (pending && !session) ? (
              accountGate
            ) : (
              <StudioOnboarding>{accountGate}</StudioOnboarding>
            )}
          </MarketingSignIn>
        ) : (
          <MarketingLanding onPrivacy={() => setPrivacy(true)} />
        )
      ) : consentRequired ? (
        <main className="consent-page">
          <section
            className="settings-card consent-card"
            aria-labelledby="consent-title"
          >
            <Wordmark />
            <h1 id="consent-title">Allow AI processing?</h1>
            <p>
              When you use transcription, summaries or AI editing, EditAI sends
              audio, transcripts and any attached reference frames to your
              selected AI provider. Provider privacy and retention policies
              apply.
            </p>
            <p>
              {desktop()
                ? "Imported clips are copied into project storage on this computer."
                : "Imported clips are saved in this browser and automatically backed up to your private EditAI storage within its limits."}
            </p>
            <button className="text-button" onClick={() => setPrivacy(true)}>
              Read Privacy & data
            </button>
            {consentError && <p role="alert">{consentError}</p>}
            <div className="consent-actions">
              <Button
                disabled={consentSaving}
                onClick={() => void chooseConsent(true)}
              >
                Allow
              </Button>
              <Button
                secondary
                disabled={consentSaving}
                onClick={() => void chooseConsent(false)}
              >
                Continue without AI
              </Button>
            </div>
          </section>
        </main>
      ) : (
        <div
          className={`app-shell ${screen === "editor" ? "is-editor" : ""}`}
          data-app-theme={appTheme}
          style={appThemeStyle(appTheme, darkAppearance) as React.CSSProperties}
        >
          <aside className={`sidebar ${menu ? "open" : ""}`}>
            <button
              className="logo-button"
              aria-label="EditAI home"
              onClick={() => nav("home")}
            >
              <Wordmark />
            </button>

            <nav>
              {[
                { id: "home", label: "Home", icon: Home },
                { id: "library", label: "Edits", icon: FolderOpen },
                { id: "settings", label: "Settings", icon: Settings },
              ].map((n) => (
                <button
                  key={n.id}
                  className={screen === n.id ? "active" : ""}
                  onClick={() => nav(n.id as Screen)}
                >
                  <n.icon size={19} />
                  {n.label}
                  {n.id === "library" && (
                    <span className="nav-count" aria-hidden="true">
                      {projects.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <p className="sidebar-note">iOS coming soon</p>
            <div className="sidebar-bottom">
              <button
                className="profile-row"
                aria-label="Open profile customization"
                onClick={() => nav("settings")}
              >
                <ProfileAvatar
                  name={profileName || session.profile.handle || ""}
                  photo={avatar}
                  preset={avatarPreset}
                />
                <span>
                  <strong>
                    {profileName || session.profile.handle || "Your studio"}
                  </strong>
                  <small>{session.profile.plan}</small>
                </span>
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
                      ? "Edits"
                      : screen === "profile"
                        ? "Customize profile"
                        : screen[0].toUpperCase() + screen.slice(1)}
                </strong>
              </div>
              <div className="topbar-right">
                {!desktop() && <DesktopDownloads placement="topbar" />}
                {screen === "home" && (
                  <Button secondary onClick={() => nav("settings")}>
                    <UserRound size={16} /> Account
                  </Button>
                )}
              </div>
            </header>
            {screen === "home" && (
              <main className="dashboard">
                <div className="dashboard-grid">
                  <section
                    className="upload-card"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void importFiles(Array.from(e.dataTransfer.files));
                    }}
                  >
                    <span className="upload-card-badge">
                      <Sparkles size={13} /> YOUR CREATIVE SHORTCUT
                    </span>
                    <div className="upload-illustration" aria-hidden="true">
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
                      <Upload size={18} />
                      Upload clips
                    </Button>
                  </section>
                  <div className="quick-tools">
                    <button
                      className="tool-card ice"
                      onClick={() => nav("record")}
                    >
                      <div className="tool-card-icon">
                        <Video />
                      </div>
                      <h3>Record a take</h3>
                      <p>
                        Camera ready.
                        <br />
                        Ideas rolling.
                      </p>
                    </button>
                    <button
                      className="tool-card lavender"
                      onClick={() => nav("batch")}
                    >
                      <div className="tool-card-icon">
                        <Layers />
                      </div>
                      <h3>Batch edit</h3>
                      <p>
                        More videos.
                        <br />
                        One smooth flow.
                      </p>
                    </button>
                    <button
                      className="tool-card peach"
                      onClick={() => pick("analysis")}
                    >
                      <div className="tool-card-icon">
                        <Sparkles />
                      </div>
                      <h3>Analyze</h3>
                      <p>
                        Find the story
                        <br />
                        in your footage.
                      </p>
                    </button>
                    <button
                      className="tool-card mint"
                      onClick={() => pick("transcript")}
                    >
                      <div className="tool-card-icon">
                        <AudioLines />
                      </div>
                      <h3>Transcribe</h3>
                      <p>
                        Every word.
                        <br />
                        Written down.
                      </p>
                    </button>
                  </div>
                </div>
                <div className="section-heading">
                  <h2>Your edits</h2>
                  <button
                    className="text-button"
                    onClick={() => nav("library")}
                  >
                    View <ArrowRight size={14} aria-hidden="true" />
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
                    <p>No saved edits yet.</p>
                  </div>
                )}
              </main>
            )}
            {screen === "library" && (
              <main className="dashboard">
                <div className="page-heading">
                  <div>
                    <h1>Edits</h1>
                  </div>
                  <div className="library-actions">
                    <div
                      className="edits-layout-toggle"
                      role="group"
                      aria-label="Edits layout"
                    >
                      {[
                        { id: "grid", label: "Grid view", icon: LayoutGrid },
                        { id: "list", label: "List view", icon: List },
                      ].map((view) => (
                        <button
                          key={view.id}
                          aria-label={view.label}
                          aria-pressed={editsLayout === view.id}
                          onClick={() => {
                            setEditsLayout(view.id);
                            localStorage.setItem(
                              "editai.library.layout",
                              view.id,
                            );
                          }}
                        >
                          <view.icon size={18} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div
                  className={`project-grid ${editsLayout === "list" ? "project-list" : ""}`}
                >
                  {projects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      p={p}
                      open={() => void openProject(p)}
                      remove={() => void removeProject(p)}
                      rename={() => startRename(p)}
                    />
                  ))}
                </div>
                {!projects.length && (
                  <div className="empty-library">
                    <Film />
                    <p>No saved edits yet.</p>
                  </div>
                )}
              </main>
            )}
            {screen === "editor" && doc && (
              <div
                className="editor"
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes("Files"))
                    e.preventDefault();
                }}
                onDrop={(e) => e.preventDefault()}
              >
                <div className="editor-top">
                  <div className="editor-top-left">
                    <span className="studio-wordmark">
                      <Wordmark />
                    </span>
                    <button
                      className="text-button"
                      onClick={() => nav("library")}
                    >
                      <ArrowLeft size={16} />
                      My Edits
                    </button>
                  </div>
                  <EditableProjectTitle
                    value={project!.title}
                    onChange={(title) =>
                      setProject((p) => (p ? { ...p, title } : p))
                    }
                  />
                  <div className="editor-top-right">
                    <span className="autosave">
                      <Check size={13} />
                      Autosaved on this device
                    </span>
                    <IconButton
                      label="Editor help and shortcuts"
                      onClick={() => setHelpOpen(true)}
                    >
                      <CircleHelp size={18} />
                    </IconButton>
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
                  </div>
                </div>
                <div className="editor-workspace">
                  <div
                    className="editor-left"
                    role="region"
                    aria-label="Media and tools"
                  >
                    <div className="studio-tool-rail" aria-label="Editor tools">
                      {[
                        { id: "media", label: "Media", icon: Film },
                        { id: "audio", label: "Audio", icon: Music },
                        { id: "text", label: "Text", icon: Type },
                        {
                          id: "captions",
                          label: "Auto",
                          icon: Subtitles,
                        },
                        { id: "overlays", label: "Overlays", icon: Layers },
                        {
                          id: "adjust",
                          label: "Adjust",
                          icon: SlidersHorizontal,
                        },
                        { id: "chat", label: "EditAI", icon: Sparkles },
                      ].map((item) => (
                        <button
                          key={item.id}
                          aria-label={
                            item.id === "chat"
                              ? "Open EditAI chat"
                              : item.id === "captions"
                                ? "Auto captions workspace"
                                : item.label + " workspace"
                          }
                          title={
                            item.label === "EditAI"
                              ? "Ask EditAI to edit your video"
                              : item.label
                          }
                          className={`${editorPanel === item.id ? "selected" : ""} ${item.id === "chat" ? "editai-tool" : ""}`}
                          aria-pressed={editorPanel === item.id}
                          onClick={() => {
                            closeCrop();
                            if (item.id === "adjust") {
                              if (selectedLayer?.track === "audio" && segment) {
                                setSelectedLayer({
                                  track: "segments",
                                  id: segment.id,
                                });
                                setSelectedText("");
                              }
                              setTool("filter");
                              scrollInspector("adjust");
                              return;
                            }
                            setEditorPanel(item.id);
                            if (item.id === "text" || item.id === "captions") {
                              setTool("captions");
                              setCaptionStyleOpen(true);
                              scrollInspector();
                            }
                          }}
                        >
                          <span className="tool-icon">
                            <item.icon size={20} />
                          </span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    {editorPanel === "chat" ? (
                      <div className="chat-panel">
                        <h3>Edit with EditAI</h3>
                        <p>Tell EditAI what you’d like to change.</p>
                        <div className="chat-messages">
                          {messages.map((m, i) => (
                            <div key={i} className={"message " + m.role}>
                              {m.text}
                            </div>
                          ))}
                          {!messages.length &&
                            [
                              "Add captions",
                              "Give it a warmer look",
                              "Make the cuts more relaxed",
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
                          {reference?.frames[0] && (
                            <img
                              className="reference-thumbnail"
                              src={`data:image/jpeg;base64,${reference.frames[0].base64JPEG}`}
                              alt={`${reference.name} preview`}
                            />
                          )}
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
                    ) : editorPanel === "text" || editorPanel === "captions" ? (
                      <div className="editor-tool-panel">
                        {editorPanel === "text" ? (
                          <>
                            <span className="tool-eyebrow">TEXT</span>
                            <h3>Make it your own.</h3>
                            <p>
                              Add text, then choose its font and style in the
                              inspector. Select text on the timeline to edit it.
                            </p>
                            <Button secondary onClick={addTextLayer}>
                              <Type size={17} />
                              Add text
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="caption-generate-card">
                              <span className="caption-generate-icon">
                                <Subtitles size={26} />
                              </span>
                              <h3>Auto captions</h3>
                              <p>
                                Recognize speech and place captions on your
                                edited timeline.
                              </p>
                              <label>
                                Spoken language
                                <select
                                  aria-label="Caption spoken language"
                                  value={language}
                                  onChange={(e) => setLanguage(e.target.value)}
                                >
                                  {Object.entries({
                                    auto: "Detect automatically",
                                    en: "English",
                                    es: "Spanish",
                                    fr: "French",
                                    de: "German",
                                    it: "Italian",
                                    pt: "Portuguese",
                                    ja: "Japanese",
                                    ko: "Korean",
                                    zh: "Chinese",
                                  }).map(([id, name]) => (
                                    <option key={id} value={id}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Words per caption
                                <select
                                  aria-label="Caption grouping"
                                  value={doc.captionFormat}
                                  onChange={(e) =>
                                    change(
                                      captions(
                                        doc,
                                        e.target
                                          .value as Document["captionFormat"],
                                      ),
                                    )
                                  }
                                >
                                  <option value="standard">
                                    Standard · 6 words
                                  </option>
                                  <option value="boxed">Boxed · 4 words</option>
                                  <option value="single">One word</option>
                                </select>
                              </label>
                              <Button onClick={() => void generateCaptions()}>
                                <Subtitles size={16} />
                                Generate captions
                              </Button>
                              <small>
                                Manual text stays in place when speech captions
                                are regenerated.
                              </small>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <EditorSourceLibrary
                          key={
                            editorPanel === "audio"
                              ? "audio"
                              : editorPanel === "overlays"
                                ? "overlay"
                                : "all"
                          }
                          doc={doc}
                          urls={urls}
                          mode={
                            editorPanel === "audio"
                              ? "audio"
                              : editorPanel === "overlays"
                                ? "overlay"
                                : "all"
                          }
                          onImport={() => {
                            mediaKind.current =
                              editorPanel === "audio"
                                ? "audio"
                                : editorPanel === "overlays"
                                  ? "overlay"
                                  : "clip";
                            replacingAudio.current = null;
                            extraInput.current?.click();
                          }}
                          onRemove={(index) => void removeLibraryMedia(index)}
                          removing={removingMedia || !!busy}
                        />
                      </>
                    )}
                  </div>
                  <div
                    className="preview-area"
                    role="region"
                    aria-label="Video monitor"
                  >
                    <div className="preview-controls-top">
                      <IconButton
                        label="Expand video preview"
                        onClick={() => {
                          const stage = canvas.current?.parentElement;
                          if (document.fullscreenElement)
                            void document.exitFullscreen();
                          else void stage?.requestFullscreen().catch(fail);
                        }}
                      >
                        <Maximize size={16} />
                      </IconButton>
                      <details className="preview-canvas-options">
                        <summary>
                          <Square size={13} />
                          Canvas
                        </summary>
                        <div className="canvas-settings">
                          <h3>Canvas</h3>{" "}
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
                        </div>
                      </details>
                    </div>
                    <div className="canvas-stage">
                      <canvas ref={canvas} aria-label="Video preview" />
                      {!cropping && (
                        <PreviewHandles
                          canvas={canvas}
                          doc={doc}
                          id={
                            selectedLayer?.track === "overlays"
                              ? selectedLayer.id
                              : tool === "captions"
                                ? selectedText
                                : ""
                          }
                          time={playhead}
                          onChange={change}
                          onSelect={(id) => {
                            setSelectedText(id);
                            setSelectedLayer({ track: "texts", id });
                            setTool("captions");
                            player.current?.pause();
                            setPlaying(false);
                          }}
                          onPreview={(d) => {
                            if (player.current) {
                              player.current.pause();
                              setPlaying(false);
                              player.current.doc = d;
                              player.current.draw();
                            }
                          }}
                        />
                      )}
                      {cropping && mediaSelection.track !== "audio" && (
                        <CropEditor
                          key={mediaSelection.id}
                          canvas={canvas}
                          doc={doc}
                          track={mediaSelection.track}
                          id={mediaSelection.id}
                          onPreview={(next) => {
                            if (player.current) {
                              player.current.doc = next;
                              player.current.draw();
                            }
                          }}
                          onApply={(next) => {
                            setCropping(false);
                            change(next);
                          }}
                          onCancel={closeCrop}
                        />
                      )}
                    </div>
                    <div className="transport">
                      <span>
                        {time(playhead)}
                        <small> / {time(total)}</small>
                      </span>
                      <div>
                        <button
                          className="play-button"
                          onClick={togglePlay}
                          aria-label={playing ? "Pause" : "Play"}
                          title={playing ? "Pause (Space)" : "Play (Space)"}
                        >
                          {playing ? (
                            <Pause size={19} fill="currentColor" />
                          ) : (
                            <Play
                              size={24}
                              strokeWidth={0}
                              fill="currentColor"
                            />
                          )}
                        </button>
                      </div>
                      <span className="preview-quality">
                        {resolution === 1920 ? "1080" : "720"}p · {fps} fps
                      </span>
                    </div>
                  </div>
                  <div
                    className="inspector"
                    role="region"
                    aria-label="Editing inspector"
                  >
                    <div className="inspector-tabs">
                      {[
                        { id: "clip", icon: SlidersHorizontal, label: "Clip" },
                        { id: "captions", icon: Subtitles, label: "Text" },
                        { id: "filter", icon: ImageIcon, label: "Filter" },
                      ].map((t) => (
                        <button
                          className={tool === t.id ? "selected" : ""}
                          key={t.id}
                          onClick={() => {
                            closeCrop();
                            setTool(t.id);
                            scrollInspector();
                            if (t.id === "captions") setCaptionStyleOpen(true);
                          }}
                        >
                          <t.icon size={16} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                    {tool === "captions" ? (
                      <>
                        <div className="section-heading">
                          <h3>Text</h3>
                          <IconButton label="Add text" onClick={addTextLayer}>
                            <Plus size={17} />
                          </IconButton>
                        </div>
                        {textLayer && (
                          <textarea
                            aria-label="Caption text"
                            placeholder="Text"
                            value={textLayer.text}
                            onChange={(e) =>
                              patch((d) => {
                                d.texts.find(
                                  (t) => t.id === selectedText,
                                )!.text = e.target.value;
                              })
                            }
                          />
                        )}
                        {textLayer && (
                          <MotionControls
                            value={{
                              animationIn: textLayer.animation,
                              animationOut: textLayer.animationOut,
                              animationDuration: textLayer.animationDuration,
                            }}
                            onChange={(values) =>
                              updateTextStyle({
                                ...(values.animationIn !== undefined
                                  ? { animation: values.animationIn }
                                  : {}),
                                ...(values.animationOut !== undefined
                                  ? { animationOut: values.animationOut }
                                  : {}),
                                ...(values.animationDuration !== undefined
                                  ? {
                                      animationDuration:
                                        values.animationDuration,
                                    }
                                  : {}),
                              })
                            }
                          />
                        )}
                        <details
                          className="caption-style-panel"
                          open={captionStyleOpen}
                          onToggle={(e) =>
                            setCaptionStyleOpen(e.currentTarget.open)
                          }
                        >
                          <summary>Text style</summary>
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={onlySelectedText}
                              disabled={!textLayer}
                              onChange={(e) =>
                                setOnlySelectedText(e.target.checked)
                              }
                            />
                            Only apply style to this caption
                          </label>
                          <FontPreviewPicker
                            font={
                              (onlySelectedText && textLayer
                                ? textLayer.font
                                : doc.captionStyle?.font) || "TikTok Sans"
                            }
                            sample={textLayer?.text || "Your story"}
                            onFont={(font) => updateTextStyle({ font })}
                            onStyle={updateTextStyle}
                          />
                          {textLayer && (
                            <>
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
                                    updateTextStyle({ [String(key)]: n })
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
                                      updateTextStyle({ color: c })
                                    }
                                  />
                                ))}
                              </div>
                              <ColorPicker
                                label="Text color"
                                value={textLayer.color}
                                onChange={(color) => updateTextStyle({ color })}
                              />
                              <label className="checkbox">
                                <input
                                  type="checkbox"
                                  checked={textLayer.outline}
                                  onChange={(e) =>
                                    updateTextStyle({
                                      outline: e.target.checked,
                                    })
                                  }
                                />
                                Text outline
                              </label>
                              <TextStyleEditor
                                text={textLayer}
                                timing={textTiming(doc, textLayer)}
                                total={total}
                                onChange={(values) => updateTextStyle(values)}
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
                        </details>
                      </>
                    ) : (
                      <SelectedMediaInspector
                        doc={doc}
                        selection={mediaSelection}
                        urls={urls}
                        filter={tool === "filter"}
                        onChange={(next) => {
                          closeCrop();
                          change(next);
                        }}
                        onCrop={() => {
                          player.current?.pause();
                          setPlaying(false);
                          setCropping(true);
                        }}
                        onExtract={detachClipAudio}
                        onReplace={(id) => {
                          mediaKind.current = "audio";
                          replacingAudio.current = id;
                          extraInput.current?.click();
                        }}
                      />
                    )}
                  </div>
                </div>
                <div
                  className="timeline"
                  role="region"
                  aria-label="Editing timeline"
                >
                  <div className="timeline-toolbar">
                    <div className="timeline-history">
                      <IconButton
                        label="Undo"
                        onClick={undo}
                        disabled={!history.length}
                      >
                        <Undo size={20} />
                      </IconButton>
                      <IconButton
                        label="Redo"
                        onClick={redo}
                        disabled={!future.length}
                      >
                        <Redo size={20} />
                      </IconButton>
                      <VoiceRecorder
                        key={project!.id}
                        maxDuration={total - playhead}
                        onStart={() => {
                          voiceStart.current = playhead;
                          player.current?.pause();
                          setPlaying(false);
                        }}
                        onError={fail}
                        onRecorded={async (file) => {
                          await addMedia([file], {
                            track: "audio",
                            time: voiceStart.current,
                          });
                        }}
                      />
                    </div>
                    <div className="timeline-edit-actions">
                      <IconButton
                        label="Split"
                        onClick={() => {
                          try {
                            if (
                              selectedLayer &&
                              selectedLayer.track !== "segments"
                            ) {
                              change(
                                layerAction(
                                  doc,
                                  selectedLayer.track,
                                  selectedLayer.id,
                                  "split",
                                  playhead,
                                ),
                              );
                              return;
                            }
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
                        label="Overlay"
                        disabled={
                          mediaSelection.track !== "segments" ||
                          tool === "captions" ||
                          doc.segments.length < 2
                        }
                        onClick={moveSelectedToOverlay}
                      >
                        <Layers size={17} />
                      </IconButton>
                      <IconButton
                        label="Crop"
                        disabled={mediaSelection.track === "audio"}
                        onClick={() => {
                          setTool("clip");
                          scrollInspector("crop");
                          player.current?.pause();
                          setPlaying(false);
                          setCropping(true);
                        }}
                      >
                        <Crop size={20} />
                      </IconButton>
                      <IconButton
                        label="Duplicate"
                        onClick={() => {
                          try {
                            if (
                              selectedLayer &&
                              selectedLayer.track !== "segments"
                            )
                              change(
                                layerAction(
                                  doc,
                                  selectedLayer.track,
                                  selectedLayer.id,
                                  "duplicate",
                                  playhead,
                                ),
                              );
                            else if (segment)
                              change(duplicate(doc, segment.id));
                          } catch (e) {
                            fail(e);
                          }
                        }}
                      >
                        <Copy size={16} />
                      </IconButton>
                      <IconButton
                        label="Delete"
                        disabled={
                          (!selectedLayer ||
                            selectedLayer.track === "segments") &&
                          doc.segments.length <= 1
                        }
                        onClick={deleteSelection}
                      >
                        <Trash2 size={17} />
                      </IconButton>
                    </div>
                  </div>
                  <EditorTimeline
                    urls={urls}
                    doc={doc}
                    playhead={playhead}
                    selected={selectedLayer?.id || selectedText || selected}
                    onSeek={(t) => {
                      player.current?.pause();
                      setPlaying(false);
                      player.current?.seek(t);
                      setPlayhead(t);
                    }}
                    onSelect={(track, id) => {
                      closeCrop();
                      scrollInspector();
                      player.current?.pause();
                      setPlaying(false);
                      setSelectedLayer({ track, id });
                      if (track === "segments") {
                        setSelected(id);
                        setSelectedText("");
                        setTool("clip");
                      } else if (track === "texts") {
                        setSelectedText(id);
                        setTool("captions");
                      } else {
                        setSelectedText("");
                        setTool("clip");
                      }
                    }}
                    onAddAudio={() => {
                      mediaKind.current = "audio";
                      replacingAudio.current = null;
                      extraInput.current?.click();
                    }}
                    onAddText={addTextLayer}
                    playing={playing}
                    getPlaybackTime={getPlaybackTime}
                    onSourceDrop={(id, drop) => {
                      const index = doc.sources.findIndex((s) => s.id === id);
                      if (index >= 0) addLibrarySource(index, drop);
                    }}
                    onFilesDrop={(files, drop) => void addMedia(files, drop)}
                    onChange={change}
                    onError={fail}
                    onAdd={() => {
                      mediaKind.current = "clip";
                      extraInput.current?.click();
                    }}
                  />
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
                  <h1>Settings</h1>
                  <div
                    className="settings-save-state"
                    role={settingsSave.status === "error" ? "alert" : "status"}
                  >
                    {settingsSave.status === "saving" ? (
                      "Saving…"
                    ) : settingsSave.status === "saved" ? (
                      "All changes saved"
                    ) : settingsSave.status === "error" ? (
                      <>
                        Changes couldn't be saved. {settingsSave.error.message}{" "}
                        {settingsSave.error.url && (
                          <a
                            href={settingsSave.error.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Top up
                          </a>
                        )}{" "}
                        <button
                          className="text-button"
                          onClick={() => void settingsSave.flush()}
                        >
                          Retry
                        </button>
                      </>
                    ) : (
                      "Changes save automatically"
                    )}
                  </div>
                </div>
                <div className="settings-grid">
                  <section className="settings-card">
                    <h2>General</h2>
                    <ProfileFields
                      name={profileName}
                      handle={session.profile.handle}
                      photo={avatar}
                      preset={avatarPreset}
                      onName={updateName}
                      choosePhoto={() => avatarInput.current?.click()}
                      removePhoto={() => updatePhoto(null)}
                    />
                    <dl className="general-details">
                      <div>
                        <dt>App language</dt>
                        <dd>English</dd>
                      </div>
                      <div>
                        <dt>Saved edits</dt>
                        <dd>{projects.length}</dd>
                      </div>
                    </dl>
                    <a
                      className="text-button"
                      href="mailto:editaiapp@gmail.com"
                    >
                      Feedback &amp; help
                    </a>
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
                    <Button secondary onClick={() => void signOut()}>
                      <LogOut size={16} />
                      Sign out
                    </Button>
                    <Button secondary onClick={() => void signOut(true)}>
                      Use another Publik account
                    </Button>
                    <p>
                      Sign out keeps your encrypted Publik connection on this
                      device for your next visit. Use another account
                      disconnects it. Neither action deletes your saved videos.
                    </p>
                  </section>
                  <section className="settings-card appearance-card">
                    <h2>Appearance</h2>
                    <fieldset className="appearance-options">
                      <legend>Display mode</legend>
                      {appearances.map((value) => (
                        <label key={value}>
                          <input
                            type="radio"
                            name="appearance"
                            checked={theme === value}
                            onChange={() => {
                              setTheme(value);
                              settingsSave.schedule({
                                avatarPreset,
                                appearance: value,
                              });
                            }}
                          />
                          {value[0].toUpperCase() + value.slice(1)}
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="app-theme-options">
                      <legend>App theme</legend>
                      {(Object.keys(avatarPresets) as AppColorTheme[]).map(
                        (value) => (
                          <label key={value}>
                            <input
                              type="radio"
                              name="app-theme"
                              checked={appTheme === value}
                              onChange={() => setAppTheme(value)}
                            />
                            <span
                              className="theme-swatch"
                              style={{
                                background: appThemeStyle(
                                  value,
                                  darkAppearance,
                                )["--app-brand"],
                              }}
                              aria-hidden="true"
                            />
                            {avatarPresets[value].label}
                          </label>
                        ),
                      )}
                    </fieldset>
                    <p>
                      Choose colors for the EditAI logo, iOS badge, EditAI tool
                      and Home cards.
                    </p>
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
                        onChange={(e) => void selectProvider(e.target.value)}
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
                        onBlur={() => {
                          if (ownKey.trim())
                            settingsSave.schedule({ ownKey: ownKey.trim() });
                        }}
                        placeholder={
                          session.profile.hasOwnKey
                            ? "A key is securely saved"
                            : "Paste a key to use your own account"
                        }
                      />
                    </label>
                    <p className="panel-note">
                      {desktop()
                        ? "Your key is encrypted locally with an encryption key protected by macOS Keychain or your OS credential vault."
                        : "Your key is encrypted on the server and never returned to the browser."}{" "}
                      Your Publik sign-in identifies your saved edits. OpenAI
                      bills your API account directly for AI requests. No Publik
                      subscription is needed for this option; a ChatGPT
                      subscription is separate.
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
                        onChange={(e) => {
                          setConsent(e.target.checked);
                          settingsSave.schedule({ consent: e.target.checked });
                        }}
                      />
                      Allow AI processing of audio, transcripts and attached
                      reference frames
                    </label>
                    <p>
                      Editing and export happen in your browser. AI features
                      send extracted audio, transcript text and attached
                      reference frames through your selected provider. Publik
                      {session.profile.choice === "own_key"
                        ? "is not used for these AI requests. Your audio, transcripts and reference frames go to OpenAI."
                        : `currently identifies these providers: ${session.profile.aiProviders.join(", ") || "available after connection"}`}
                      . No AI upload happens until you allow it.
                    </p>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={telemetry}
                        onChange={(e) => {
                          setTelemetry(e.target.checked);
                          settingsSave.schedule({
                            telemetry: e.target.checked,
                          });
                        }}
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
                        ? "New imports are copied into EditAI storage on this computer. Older edits may still reference the original file location."
                        : "New sources automatically back up to private storage, up to 100 MB per file and 500 MB per account. Sources that exceed those limits stay in this browser."}
                    </p>
                    {!desktop() && (
                      <Button
                        secondary
                        onClick={() =>
                          void run("Backing up source media", async () => {
                            for (const p of projects) {
                              await syncProject(p, []);
                              for (const s of p.document.sources) {
                                const f = await loadMedia(s.id);
                                if (f) await backup(s.id, f, s.mime);
                              }
                            }
                            setNotice("Available source media backed up.");
                          })
                        }
                      >
                        Back up existing sources
                      </Button>
                    )}
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
                    const storageFailures: string[] = [];
                    for (let n = 0; n < groups.length; n++) {
                      activeSignal?.throwIfAborted();
                      if (groups[n].length > 50)
                        throw Error("Choose at most 50 clips per project.");
                      const d = newDocument();
                      const media: { id: string; file: File; mime: string }[] =
                        [];
                      for (const f of groups[n]) {
                        const source = await probe(f);
                        if (source.kind !== "video")
                          throw Error("Choose video clips.");
                        await saveMedia(source.id, f, source.mime);
                        media.push({
                          id: source.id,
                          file: f,
                          mime: source.mime,
                        });
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
                      try {
                        await syncProject(p, media);
                      } catch (e: any) {
                        if (e.name === "AbortError") throw e;
                        storageFailures.push(e.message);
                      }
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
                    if (storageFailures.length || failures.length)
                      setError(storageFailures[0] || failures[0]);
                  });
                }}
              />
            )}
          </div>
        </div>
      )}
      {renaming && (
        <dialog
          ref={renameDialog}
          className="modal rename-dialog"
          aria-labelledby="rename-title"
          onCancel={(e) => {
            e.preventDefault();
            if (!renameSaving) setRenaming(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void renameProject();
            }}
          >
            <h2 id="rename-title">Rename edit</h2>
            <label>
              Edit name
              <input
                ref={renameInput}
                value={renameTitle}
                maxLength={140}
                required
                onChange={(e) => setRenameTitle(e.target.value)}
              />
            </label>
            {renameError && <p role="alert">{renameError}</p>}
            <div className="consent-actions">
              <button
                className="button"
                type="submit"
                disabled={renameSaving || !renameTitle.trim()}
              >
                Save name
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={renameSaving}
                onClick={() => setRenaming(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </dialog>
      )}
      {helpOpen && (
        <div className="modal-backdrop">
          <section
            className="modal editor-help"
            aria-labelledby="editor-help-title"
          >
            <div className="section-heading">
              <h2 id="editor-help-title">Editor help & shortcuts</h2>
              <IconButton label="Close help" onClick={() => setHelpOpen(false)}>
                <X size={20} />
              </IconButton>
            </div>
            <p>
              Select clips or text on the timeline to edit them in the
              inspector. Your original media stays intact.
            </p>
            <dl>
              <dt>Play / pause</dt>
              <dd>
                <kbd>Space</kbd>
              </dd>
              <dt>Split</dt>
              <dd>
                <kbd>S</kbd>
              </dd>
              <dt>Reset a slider</dt>
              <dd>
                Focus or hover a slider and press <kbd>R</kbd> to restore its
                default value.
              </dd>
              <dt>Undo / redo</dt>
              <dd>
                <kbd>⌘ / Ctrl Z</kbd> / <kbd>⌘ / Ctrl Shift Z</kbd>
              </dd>
              <dt>Zoom timeline</dt>
              <dd>
                Pinch on your trackpad. Scroll sideways to move through the
                edit. Drag source library media or files from your desktop onto
                a timeline row to add them.
              </dd>
              <dt>Move / trim</dt>
              <dd>
                Drag a clip to an insertion marker and release to move it. Drop
                outside the timeline to cancel. Drag edges to shorten or restore
                footage. Use arrow keys on an edge for precise trims; Alt +
                arrow moves a focused layer.
              </dd>
              <dt>Copy / paste</dt>
              <dd>
                Ctrl/Cmd + C copies the selected clip, text or audio. Ctrl/Cmd +
                V pastes at the cursor in this edit. Typing fields keep normal
                copy and paste.
              </dd>
              <dt>Sliders</dt>
              <dd>
                Drag near a major mark to snap and hold its value. Hold Alt to
                bypass snapping, or enter an exact value.
              </dd>
              <dt>Duplicate / delete</dt>
              <dd>
                Select a clip or layer, then press Delete / Backspace or use the
                timeline toolbar. The final video clip is protected.
              </dd>
              <dt>Audio</dt>
              <dd>
                Import sound in Audio, or use Extract audio in Clip settings.
                Extraction mutes the video and creates an independently editable
                sound track. Undo restores it. Record voice with the microphone
                beside Undo, then stop to add your take at its starting cursor
                position. Up to seven audio tracks can overlap.
              </dd>
              <dt>Text / auto captions</dt>
              <dd>
                Text adds your own words. Auto captions recognizes speech.
                Select text on the timeline to change its words, font, style or
                timing.
              </dd>
              <dt>Overlays / filters / adjustments</dt>
              <dd>
                Import overlay media; drag and resize it in the preview. Select
                a clip to change its look, speed and volume.
              </dd>
              <dt>EditAI</dt>
              <dd>
                Ask for changes in the EditAI tool. Review the result and Undo
                when needed.
              </dd>
              <dt>Save / export</dt>
              <dd>
                Edits save automatically on this device. Export renders your
                timeline as a video; My Edits returns to your library.
              </dd>
            </dl>
          </section>
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
                ? "EditAI Desktop copies new imports into its local project storage and renders with native FFmpeg. Older projects may need their original files. Credentials are encrypted with the OS credential vault."
                : "EditAI Web edits and renders in your browser. Drafts and source files are also stored in this browser’s IndexedDB. Clearing browser storage removes local files."}
            </p>
            <h3>Your account and cloud storage</h3>
            <p>
              Publik provides sign-in and AI plan connection. EditAI stores your
              project timelines and profile preferences.{" "}
              {desktop()
                ? "Desktop projects and source files are stored on this computer."
                : "Web automatically backs up new sources to private cloud storage within 100 MB per file and 500 MB per account."}{" "}
              Delete EditAI data in Settings to remove your projects, stored
              sources and encrypted credentials. Manage your Publik account and
              plan on publikhq.com.
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
      <div className="notification-stack">
        {busy && !aiBusy && (
          <div className="toast operation-status" role="status">
            <LoaderCircle size={16} className="spin" />
            <div>
              <p>
                {busy}
                {progress > 0 ? ` · ${Math.round(progress * 100)}%` : "…"}
              </p>
              {progress > 0 && (
                <progress value={progress} max={1} aria-label={busy} />
              )}
            </div>
            <IconButton
              label="Cancel current operation"
              onClick={() => {
                abort.current?.abort();
                cancelFFmpeg();
              }}
            >
              <X size={14} />
            </IconButton>
          </div>
        )}
        {error && (
          <div className="toast error" role="alert">
            <CircleAlert size={16} />
            <div>
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
      </div>
    </>
  );
}
