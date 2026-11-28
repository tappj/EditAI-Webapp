"use client";
import {
  t as uiText,
  setInterfaceLanguage,
  subscribeLanguage,
  languageRevision,
  serverLanguageRevision,
} from "@/lib/editor/i18n";

import {
  languageNames,
  mostUsedLanguage,
  languageScores,
  type AppLanguage,
  validLanguage,
} from "@/lib/editor/language";
import { trackSave } from "@/lib/editor/save-activity";
import { AutosaveStatus } from "./components/AutosaveStatus";
import { referenceCaptionPhrases } from "@/lib/editor/caption-phrases";
import { firstCutProgress } from "@/lib/editor/job-progress";
import { briefChatMessage } from "@/lib/editor/chat-display";
import {
  normalizeTranscript,
  TranscriptTimingError,
  hasAudioSignal,
  NO_AUDIO,
} from "@/lib/editor/transcript";
import {
  MarketingLanding,
  MarketingSignIn,
} from "../components/marketing/landing";
import "./marketing.css";
import "./components/editor-workspace.css";
import { DesktopDownloads } from "../components/desktop-downloads";
import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
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
  LogOut,
  Menu,
  Mic,
  MoreHorizontal,
  Music,
  Pause,
  MessageCircle,
  Play,
  Plus,
  Redo,
  CircleHelp,
  CircleAlert,
  Scissors,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
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
  applyAutomaticCuts,
  planCuts,
  applyOperations,
  supportedOperations,
  textTiming,
  validate,
} from "@/lib/editor/model";
import { DEFAULT_TEXT_STYLE } from "@/lib/editor/fonts";
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
import { defaultReferenceRequest } from "@/lib/editor/reference-intent";
import { makeReference, type Reference } from "@/lib/editor/reference";
import { calibrateReferenceText } from "@/lib/editor/reference-calibration";
import { protectReferenceText } from "@/lib/editor/reference-placement";
import { ADVANCED_ADJUSTMENTS, POSITIVE_ADJUSTMENTS } from "@/lib/editor/color";
import {
  Button,
  IconButton,
  Range,
  Wordmark,
  resetHoveredRange,
} from "./components/ui";
import { ProjectCard } from "./components/ProjectCard";
import { ActionSparkles } from "./components/ActionSparkles";
import {
  EditAIMascot,
  HomeMascot,
  TypingDots,
} from "./components/EditAIMascot";
import { StudioNameOnboarding } from "./components/StudioNameOnboarding";
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
import { AppThemeContext } from "./components/AppThemeContext";
import { useSettingsAutosave } from "./components/useSettingsAutosave";
import { DiscardToolDialog } from "./components/DiscardToolDialog";
import { UploadFlow } from "./components/UploadFlow";
import { Recorder } from "./components/Recorder";
import { Batch } from "./components/Batch";
import { MotionControls } from "./components/MotionControls";
import { TimelineResizeHandle } from "./components/TimelineResizeHandle";
import { ColorPicker } from "./components/ColorPicker";
import { TextStyleEditor } from "./components/TextStyleEditor";
import { EditableProjectTitle } from "./components/EditableProjectTitle";
import { VoiceRecorder } from "./components/VoiceRecorder";
import { LANE_LIMITS } from "@/lib/editor/lanes";
import { SelectedMediaInspector } from "./components/SelectedMediaInspector";
import { CropEditor } from "./components/CropEditor";
import { PreviewHandles } from "./components/PreviewHandles";
import { DeleteProjectDialog } from "./components/DeleteProjectDialog";
import { DeleteAccountDialog } from "./components/DeleteAccountDialog";
import { SupportDialog } from "./components/SupportDialog";
import { removeUnusedSource } from "@/lib/editor/library";
import { EditorSourceLibrary } from "./components/EditorSourceLibrary";
import { EditorTimeline } from "./components/EditorTimeline";
import { copyItem, pasteItem, type EditorCopy } from "@/lib/editor/clipboard";
import { fitLayers, layerAction, type Track } from "@/lib/editor/timeline";
import { warmSpeechDetector } from "@/lib/editor/speech-regions";
import { quietPauses, QUIET_CUT_VERSION } from "@/lib/editor/audio-evidence";
import { recordSpeechRegions } from "@/lib/editor/audio-final-check";
type Screen =
  | "home"
  | "review"
  | "library"
  | "editor"
  | "settings"
  | "profile"
  | "record"
  | "batch"
  | "analysis"
  | "transcript";
type UploadDraft = {
  options?: { autoCut: boolean; addCaptions: boolean };
  project: Project;
  media: { id: string; file: File; mime: string }[];
};
const time = (n: number) =>
  `${Math.floor(n / 60)}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
let activeSignal: AbortSignal | undefined;
async function requestApi(path: string, body?: unknown, method?: string) {
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
function api(path: string, body?: unknown, method?: string) {
  const writes = (method || (body === undefined ? "GET" : "POST")) !== "GET";
  const saving = /^(projects(?:\/|$)|assets\/|settings$|consent$)/.test(path);
  return writes && saving
    ? trackSave(() => requestApi(path, body, method))
    : requestApi(path, body, method);
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
    [supportOpen, setSupportOpen] = useState(false),
    [deleteAccountOpen, setDeleteAccountOpen] = useState(false),
    [deletingProject, setDeletingProject] = useState<Project | null>(null),
    [cropping, setCropping] = useState(false),
    [exportOpen, setExportOpen] = useState(false),
    [resolution, setResolution] = useState(0),
    [fps, setFps] = useState(0),
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
    [preferencesReady, setPreferencesReady] = useState(false),
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
  const promptRecall = useRef<{ index: number; draft: string } | null>(null);
  const promptCaretFrame = useRef<number | null>(null);
  function cancelPromptCaret() {
    if (promptCaretFrame.current !== null)
      cancelAnimationFrame(promptCaretFrame.current);
    promptCaretFrame.current = null;
  }
  function recallPrompt(value: string, field: HTMLTextAreaElement) {
    cancelPromptCaret();
    setPrompt(value);
    promptCaretFrame.current = requestAnimationFrame(() => {
      promptCaretFrame.current = null;
      if (
        field.isConnected &&
        field.value === value &&
        document.activeElement === field
      )
        field.setSelectionRange(value.length, value.length);
    });
  }
  const [upload, setUpload] = useState<UploadDraft | null>(null);
  const [firstCut, setFirstCut] = useState(false);
  const firstCutTarget = useRef<UploadDraft | null>(null);
  const [firstCutStage, setFirstCutStage] = useState<
    "transcribe" | "cut" | "captions" | "save" | "complete"
  >("transcribe");
  async function viewFirstCut() {
    const target = firstCutTarget.current;
    if (!target) {
      setScreen("library");
      return;
    }
    if (
      target.project.firstCutTask?.status === "pending" &&
      operationActive.current
    ) {
      stayedOnUpload.current = true;
      setUpload(target);
      setScreen("review");
      return;
    }
    try {
      // Reuse the current document or the latest saved copy, including any edits
      // made after completion. A notification must never restore its old snapshot.
      const latest =
        projectRef.current?.id === target.project.id
          ? projectRef.current
          : (await listProjects()).find(
              (item) => item.id === target.project.id,
            );
      if (!latest) {
        setNotice("");
        setScreen("library");
        return;
      }
      persistedProject.current = latest;
      setProject({ ...latest });
      setSelected(latest.document.segments[0]?.id || "");
      setUpload(null);
      stayedOnUpload.current = false;
      setNotice("");
      setScreen("editor");
    } catch (error) {
      setScreen("library");
      fail(error);
    }
  }
  useEffect(() => {
    // A cleared upload can never leave the app on an inert, empty Review screen.
    if (screen === "review" && !upload) {
      if (firstCutTarget.current?.project.firstCutTask?.status === "complete")
        void viewFirstCut();
      else setScreen("home");
    }
  }, [screen, upload]);
  const [backgroundAI, setBackgroundAI] = useState(false);
  const [chatWorking, setChatWorking] = useState(false);
  const chatOperation = useRef(false);
  const backgroundRequested = useRef(false);
  useEffect(() => {
    if (!busy) setBackgroundAI(false);
  }, [busy]);
  const cutTask = useRef<Project["firstCutTask"]>(undefined);
  const stayedOnUpload = useRef(true);
  const [activeUploadIndex, setActiveUploadIndex] = useState(0);
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
  const [projectsOwner, setProjectsOwner] = useState("");
  const languageOwner =
    session?.profile.ownerId || session?.profile.handle || "";
  const [chatLanguageUsage, setChatLanguageUsage] = useState<{
    owner: string;
    scores: Partial<Record<AppLanguage, number>>;
  }>({ owner: "", scores: {} });
  useEffect(() => {
    let scores: Partial<Record<AppLanguage, number>> = {};
    try {
      const saved = JSON.parse(
        localStorage.getItem("editai.language-usage." + languageOwner) || "{}",
      );
      scores = Object.fromEntries(
        Object.entries(saved).filter(
          ([code, count]) =>
            validLanguage(code) &&
            typeof count === "number" &&
            Number.isFinite(count) &&
            count >= 0 &&
            count <= 1e7,
        ),
      );
    } catch {}
    setChatLanguageUsage({ owner: languageOwner, scores });
  }, [languageOwner]);
  function rememberLanguageUse(text: string) {
    if (!languageOwner) return;
    const added = languageScores([text]);
    const scores = {
      ...(chatLanguageUsage.owner === languageOwner
        ? chatLanguageUsage.scores
        : {}),
    };
    for (const code of Object.keys(added) as AppLanguage[])
      scores[code] = Math.min(1e7, (scores[code] || 0) + (added[code] || 0));
    setChatLanguageUsage({ owner: languageOwner, scores });
    try {
      localStorage.setItem(
        "editai.language-usage." + languageOwner,
        JSON.stringify(scores),
      );
    } catch {}
  }
  const languageEvidence = JSON.stringify([
    ...projects
      .filter((p) => p.id !== project?.id)
      .map((p) => p.document.words.map((w) => w.text).join(" ")),
    ...(project ? [project.document.words.map((w) => w.text).join(" ")] : []),
  ]);
  const detectedLanguage = useMemo(
    () =>
      mostUsedLanguage(
        JSON.parse(languageEvidence),
        chatLanguageUsage.owner === languageOwner
          ? chatLanguageUsage.scores
          : {},
      ),
    [languageEvidence, chatLanguageUsage, languageOwner],
  );
  useSyncExternalStore(
    subscribeLanguage,
    languageRevision,
    serverLanguageRevision,
  );
  const effectiveLanguage = validLanguage(language)
    ? language
    : detectedLanguage;
  useEffect(() => {
    void setInterfaceLanguage(effectiveLanguage).catch(() =>
      setError("The selected language could not be loaded. Please try again."),
    );
  }, [effectiveLanguage]);
  const operationActive = useRef(false);
  const operationDone = useRef<Promise<void>>(Promise.resolve());
  const temporaryTool = useRef<Project | null>(null);
  const leavePending = useRef<Promise<boolean> | null>(null);
  const [toolExit, setToolExit] = useState<((leave: boolean) => void) | null>(
    null,
  );
  const exitPreference = "editai.tool-exit-warning:" + projectsOwner;
  function confirmToolExit(): Promise<boolean> {
    if (
      !temporaryTool.current ||
      localStorage.getItem(exitPreference) === "skip"
    )
      return Promise.resolve(true);
    if (leavePending.current) return leavePending.current;
    const promise = new Promise<boolean>((resolve) =>
      setToolExit(() => resolve),
    );
    leavePending.current = promise;
    return promise;
  }
  async function discardTool() {
    const temporary = temporaryTool.current;
    if (!temporary) return;
    abort.current?.abort();
    cancelFFmpeg();
    await operationDone.current;
    if (temporaryTool.current?.id !== temporary.id) return;
    const ids = new Set(temporary.document.sources.map((source) => source.id));
    document.querySelector<HTMLVideoElement>(".analysis-video")?.pause();
    projectRef.current = null;
    persistedProject.current = null;
    setProject(null);
    setSummary(null);
    setUrls((current) => {
      const next = { ...current };
      for (const id of ids) {
        if (next[id]?.startsWith("blob:")) URL.revokeObjectURL(next[id]);
        delete next[id];
      }
      return next;
    });
    temporaryTool.current = null;
    sessionStorage.removeItem("editai.temporary-tool:" + projectsOwner);
    await Promise.all([...ids].map((id) => deleteUnusedMedia(id)));
  }
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        !temporaryTool.current ||
        localStorage.getItem(exitPreference) === "skip"
      )
        return;
      event.preventDefault();
      event.returnValue = "";
      if (desktop())
        void confirmToolExit().then(async (leave) => {
          if (!leave) return;
          await discardTool();
          window.close();
        });
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [exitPreference]);
  const resumedTasks = useRef(new Set<string>());
  const unloading = useRef(false);
  useEffect(() => {
    const leaving = () => {
      unloading.current = true;
    };
    const restored = () => {
      unloading.current = false;
    };
    window.addEventListener("pagehide", leaving);
    window.addEventListener("beforeunload", leaving);
    window.addEventListener("pageshow", restored);
    return () => {
      window.removeEventListener("pagehide", leaving);
      window.removeEventListener("beforeunload", leaving);
      window.removeEventListener("pageshow", restored);
    };
  }, []);
  useEffect(() => {
    if (
      busy ||
      operationActive.current ||
      session?.screen.id !== "ready" ||
      session?.profile.needsName ||
      !session?.profile.consent ||
      projectsOwner !== (session.profile.ownerId || session.profile.handle)
    )
      return;
    const saved = projects.find(
      (p) =>
        p.firstCutTask?.status === "pending" &&
        p.firstCutTask.provider === session.profile.choice &&
        !resumedTasks.current.has(p.firstCutTask.id),
    );
    if (!saved?.firstCutTask) return;
    resumedTasks.current.add(saved.firstCutTask.id);
    void sendUpload({ project: saved, media: [] });
  }, [
    projects,
    projectsOwner,
    busy,
    session?.screen.id,
    session?.profile.needsName,
    session?.profile.choice,
    session?.profile.consent,
  ]);
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
    return trackSave(() => write);
  }
  const persistedProject = useRef<Project | null>(null);
  const [localSaveError, setLocalSaveError] = useState(false);
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
  const historyRef = useRef(history);
  const futureRef = useRef(future);
  const sliderGesture = useRef<{ changed: boolean } | null>(null);
  historyRef.current = history;
  futureRef.current = future;
  projectRef.current = project;
  urlsRef.current = urls;
  useEffect(() => {
    const finish = () => {
      sliderGesture.current = null;
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("blur", finish);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
    };
  }, []);
  const getPlaybackTime = useCallback(() => player.current?.time || 0, []);
  const [reference, setReference] = useState<Reference | null>(null);
  const referenceInput = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = chatMessagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, tool, editorPanel, chatWorking]);
  const doc = project?.document,
    total = doc ? duration(doc) : 0,
    segment = doc?.segments.find((s) => s.id === selected),
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
          if (section === "adjust") {
            for (const animation of target.getAnimations())
              if (animation.id === "adjust-feedback") animation.cancel();
            const flash = target.animate(
              [
                { backgroundColor: "rgba(196,224,255,0.45)" },
                { backgroundColor: "rgba(196,224,255,0)" },
              ],
              {
                duration: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? 250
                  : 750,
                easing: "ease-out",
              },
            );
            flash.id = "adjust-feedback";
          }
        } else panel.scrollTop = 0;
        if (innerWidth < 1100) panel.scrollIntoView({ block: "nearest" });
      }),
    );
  }
  useEffect(() => {
    if (
      !privacy &&
      !exportOpen &&
      !helpOpen &&
      (!aiBusy || firstCut || chatWorking)
    )
      return;
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
        const el =
          document.querySelector("dialog[open]") ||
          document.querySelector(".modal");
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
  }, [privacy, exportOpen, helpOpen, aiBusy, firstCut, chatWorking]);
  const fail = useCallback((e: any) => {
    setError(e.message || String(e));
    setErrorURL(e.url || "");
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(uiText("")), 5000);
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
    latestProfileName.current = value.trim();
    setProfileName(value);
    settingsSave.schedule({ displayName: value.trim(), avatar });
  }
  function updatePhoto(value: string | null) {
    setAvatar(value);
    settingsSave.schedule({
      displayName: latestProfileName.current,
      avatar: value,
    });
  }
  async function selectProvider(choice: string) {
    if (operationActive.current) {
      setNotice(
        uiText("Finish or cancel processing before changing the AI provider."),
      );
      return;
    }
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
    setLanguage(validLanguage(p.language) ? p.language : "auto");
    if (validPreset(p.appTheme)) setAppTheme(p.appTheme);
    setPreferencesReady(true);
  }, [refresh, signedOut]);
  useEffect(() => {
    if (!preferencesReady) return;
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
  }, [theme, language, appTheme, preferencesReady]);
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
    if (
      session?.screen.id !== "ready" ||
      session?.profile.needsName ||
      consentRequired
    )
      return;
    let cancelled = false;
    const owner = session.profile.ownerId || session.profile.handle;
    setStorageScope(owner);
    const temporaryKey = "editai.temporary-tool:" + owner;
    const abandoned = sessionStorage.getItem(temporaryKey);
    if (abandoned) {
      try {
        const ids: unknown = JSON.parse(abandoned);
        if (Array.isArray(ids))
          void Promise.all(
            ids
              .filter((id): id is string => typeof id === "string")
              .map(deleteUnusedMedia),
          )
            .then(() => {
              if (sessionStorage.getItem(temporaryKey) === abandoned)
                sessionStorage.removeItem(temporaryKey);
            })
            .catch(() => {});
      } catch {
        sessionStorage.removeItem(temporaryKey);
      }
    }
    setProjectsOwner("");
    setProjects([]);
    void listProjects().then((p) => {
      if (!cancelled) {
        setProjects(p);
        setProjectsOwner(owner);
      }
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
            await saveProject(
              { ...remote, firstCutTask: local?.firstCutTask },
              owner,
            );
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
    session?.profile.needsName,
    fail,
  ]);
  useEffect(() => {
    setLocalSaveError(false);
    if (
      !project ||
      project.id === temporaryTool.current?.id ||
      project === persistedProject.current
    )
      return;
    const timer = setTimeout(async () => {
      const p = { ...project, updatedAt: Date.now() };
      try {
        await saveProject(p);
        persistedProject.current = project;
        setProjects(await listProjects());
        if (session?.screen.id === "ready")
          persistRemoteProject(p).catch(() => {});
      } catch (error) {
        if (projectRef.current?.id === p.id) setLocalSaveError(true);
        fail(error);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [project, session?.screen.id]);
  const pausedPreview = useRef<{ project: string | undefined; time: number }>({
    project: undefined,
    time: 0,
  });
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
    if (pausedPreview.current.project === project?.id)
      p.time = pausedPreview.current.time;
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
      pausedPreview.current = { project: project?.id, time: p.time };
      p.destroy();
      player.current = null;
    };
  }, [screen, project?.id, urls]);
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
        supportOpen ||
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
    if (chatOperation.current && !saved) {
      setNotice(
        uiText(
          "EditAI is working. Cancel the request before making another edit.",
        ),
      );
      return;
    }
    try {
      fitLayers(d);
      if (JSON.stringify(d) === JSON.stringify(projectRef.current.document))
        return;
      // A slider drag is one edit, including its final pointer-up snap.
      if (!sliderGesture.current?.changed) {
        const nextHistory = [
          ...historyRef.current.slice(-99),
          structuredClone(projectRef.current.document),
        ];
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        if (sliderGesture.current) sliderGesture.current.changed = true;
      }
      futureRef.current = [];
      setFuture([]);
      const next = saved || { ...projectRef.current, document: d };
      projectRef.current = next;
      setProject(next);
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
      ...DEFAULT_TEXT_STYLE,
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
            uiText(
              "Keep at least one video clip in your edit. Add another clip before deleting this one.",
            ),
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
    const current = projectRef.current;
    if (!historyRef.current.length || !current || chatOperation.current) return;
    const previous = historyRef.current.at(-1)!;
    futureRef.current = [
      structuredClone(current.document),
      ...futureRef.current,
    ];
    historyRef.current = historyRef.current.slice(0, -1);
    setFuture(futureRef.current);
    setHistory(historyRef.current);
    restoreHistory(previous);
  }
  function redo() {
    const current = projectRef.current;
    if (!futureRef.current.length || !current || chatOperation.current) return;
    const next = futureRef.current[0];
    historyRef.current = [
      ...historyRef.current.slice(-99),
      structuredClone(current.document),
    ];
    futureRef.current = futureRef.current.slice(1);
    setHistory(historyRef.current);
    setFuture(futureRef.current);
    restoreHistory(next);
  }
  function restoreHistory(document: Document) {
    sliderGesture.current = null;
    player.current?.pause();
    setPlaying(false);
    const restored = structuredClone(document);
    const next = { ...projectRef.current!, document: restored };
    projectRef.current = next;
    setProject(next);
    if (!restored.segments.some((s) => s.id === selected)) setSelected("");
    if (!restored.texts.some((t) => t.id === selectedText)) setSelectedText("");
    if (
      selectedLayer &&
      !restored[selectedLayer.track].some(
        (item) => item.id === selectedLayer.id,
      )
    )
      setSelectedLayer(null);
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
  async function run(
    label: string,
    fn: () => Promise<void>,
    presentation: "default" | "chat" = "default",
  ) {
    if (operationActive.current) {
      setNotice(uiText("Finish or cancel the current operation first."));
      return;
    }
    operationActive.current = true;
    chatOperation.current = presentation === "chat";
    setChatWorking(chatOperation.current);
    let finishOperation!: () => void;
    operationDone.current = new Promise<void>((resolve) => {
      finishOperation = resolve;
    });
    backgroundRequested.current = false;
    abort.current = new AbortController();
    activeSignal = abort.current.signal;
    setBusy(label);
    setProgress(0);
    setError("");
    setErrorURL("");
    try {
      await desktop()?.setBackgroundWork?.(true);
      await fn();
    } catch (e: any) {
      if (e.name !== "AbortError") fail(e);
    } finally {
      await desktop()
        ?.setBackgroundWork?.(false)
        .catch(() => {});
      activeSignal = undefined;
      operationActive.current = false;
      chatOperation.current = false;
      setChatWorking(false);
      finishOperation();
      setBusy("");
      setProgress(0);
    }
  }
  async function signOut(forget = false) {
    if (operationActive.current) {
      setNotice(uiText("Finish or cancel processing before signing out."));
      return;
    }
    if (!(await settingsSave.flush()) || !(await confirmToolExit())) return;
    await discardTool();
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
      setPrompt("");
      promptRecall.current = null;
      setScreen("editor");
    });
    if (
      p.firstCutTask?.status === "pending" &&
      p.firstCutTask.provider === session.profile.choice &&
      session.profile.consent
    ) {
      await sendUpload({ project: p, media: [] });
    }
  }
  function pick(p = "edit") {
    purpose.current = p;
    input.current?.click();
  }
  async function importFiles(files: File[], kind = "edit") {
    if (!files.length) return;
    let prepared: UploadDraft | null = null;
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
      activeSignal?.throwIfAborted();
      const p = {
        id: kind === "edit" && upload ? upload.project.id : crypto.randomUUID(),
        title: files[0].name.replace(/\.[^.]+$/, "").slice(0, 140),
        document: d,
        updatedAt: Date.now(),
      };
      setUrls(next);
      if (kind === "edit" || kind === "recording") {
        await saveProject(p);
        setProjects(await listProjects());
        prepared = { project: p, media };
        setUpload(prepared);
        setActiveUploadIndex(0);
        setNotice(uiText(""));
        setScreen("review");
        return;
      }
      temporaryTool.current = p;
      sessionStorage.setItem(
        "editai.temporary-tool:" + projectsOwner,
        JSON.stringify(p.document.sources.map((source) => source.id)),
      );
      prepared = { project: p, media };
      persistedProject.current = p;
      setProject(p);
      setSelectedLayer(null);
      setSelectedText("");
      setSelected(p.document.segments[0].id);
      setPlayhead(0);
      setHistory([]);
      setFuture([]);
      setSummary(null);
      setMessages([]);
      setPrompt("");
      promptRecall.current = null;
      setScreen(kind === "transcript" ? "transcript" : "analysis");
    });
    const ready = prepared as UploadDraft | null;
    if (ready && (kind === "analysis" || kind === "transcript")) {
      await run(
        kind === "analysis"
          ? "Preparing video analysis"
          : "Preparing speech recognition",
        async () => {
          const d = await ensureWords(ready.project.document, null);
          activeSignal?.throwIfAborted();
          setProject({ ...ready.project, document: d });
          if (kind === "analysis") {
            setBusy("Finding your main point and highlights");
            setSummary(
              await api("ai/summary", {
                words: d.words,
                responseLanguage: effectiveLanguage,
              }),
            );
          }
        },
      );
    }
  }
  async function sendUpload(
    prepared: UploadDraft | null = upload,
    retry = false,
  ) {
    if (!prepared || operationActive.current) return;
    const { project: original, media } = prepared;
    // Stable task ID recovers completed model stages without reposting paid jobs.
    const p: Project = {
      ...original,
      document: structuredClone(original.document),
    };
    if (p.firstCutTask && !session?.profile.consent) {
      setNotice(
        uiText("Enable AI processing in Settings to resume automatic editing."),
      );
      return;
    }
    if (p.firstCutTask && p.firstCutTask.provider !== session.profile.choice) {
      setError(
        "Select the original AI provider in Settings before resuming this edit.",
      );
      return;
    }
    p.firstCutTask =
      p.firstCutTask && ["pending", "failed"].includes(p.firstCutTask.status)
        ? { ...p.firstCutTask, status: "pending" }
        : {
            id: crypto.randomUUID(),
            status: "pending",
            progress: 0,
            provider: session.profile.choice,
            startedAt: Date.now(),
            autoCut: prepared.options?.autoCut ?? true,
            addCaptions: prepared.options?.addCaptions ?? false,
          };
    firstCutTarget.current = { ...prepared, project: p };
    setUpload(firstCutTarget.current);
    setFirstCutStage(
      p.firstCutTask.autoCut !== false || p.firstCutTask.addCaptions
        ? "transcribe"
        : "save",
    );
    cutTask.current = p.firstCutTask;
    stayedOnUpload.current = screen === "review" || screen === "record";
    await saveProject(p);
    await run("EditAI is preparing your footage", async () => {
      setFirstCut(true);
      try {
        persistedProject.current = p;
        setProject(p);
        setProjects(await listProjects());
        setSelectedLayer(null);
        setSelectedText("");
        setSelected(p.document.segments[0].id);
        setPlayhead(0);
        setHistory([]);
        setFuture([]);
        setSummary(null);
        setMessages([]);
        setPrompt("");
        promptRecall.current = null;
        if (
          session?.profile.consent &&
          (p.firstCutTask!.autoCut !== false || p.firstCutTask!.addCaptions)
        ) {
          try {
            const transcribed = await ensureWords(p.document, p);
            setBusy(
              p.firstCutTask!.autoCut !== false
                ? "EditAI is creating your first cut"
                : "Preparing captions",
            );
            p.document = transcribed;
            updateCutProgress(1, "edit", p.document.sources.length);
            p.firstCutTask = {
              ...cutTask.current!,
              progress: firstCutProgress(
                cutTask.current?.progress || 0,
                1,
                p.document.sources.length,
                "edit",
              ),
            };
            await saveProject(p);
            activeSignal?.throwIfAborted();
            let edited = transcribed;
            if (p.firstCutTask!.autoCut !== false) {
              setFirstCutStage("cut");
              const taskStatus = await api("ai/edit-job/" + p.firstCutTask.id);
              let plan =
                taskStatus.state === "complete" ? taskStatus.result : null;
              if (taskStatus.state === "running") {
                for (let attempt = 0; attempt < 240 && !plan; attempt++) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  activeSignal?.throwIfAborted();
                  const status = await api("ai/edit-job/" + p.firstCutTask.id);
                  if (status.state === "complete") plan = status.result;
                  else if (status.state !== "running") break;
                }
                if (!plan)
                  throw Error(
                    "Your saved edit is not finished. Reopen it to resume; completed stages are retained.",
                  );
              }
              if (
                !plan &&
                ["failed", "interrupted"].includes(taskStatus.state) &&
                !retry
              )
                throw Error(
                  "This stage was interrupted. Your transcript is saved. Select Resume editing to retry the unfinished stage.",
                );
              if (!plan)
                plan = await api("ai/edit", {
                  words: transcribed.words,
                  jobId: p.firstCutTask.id,
                  retry:
                    taskStatus.state === "failed" ||
                    taskStatus.state === "interrupted",
                });
              updateCutProgress(1, "save", p.document.sources.length);
              activeSignal?.throwIfAborted();
              edited = applyAutomaticCuts(transcribed, [
                ...planCuts(transcribed, plan),
                ...(transcribed.quietCuts || []),
              ]);
            }
            if (p.firstCutTask!.addCaptions) {
              setFirstCutStage("captions");
              // Let the actual caption stage paint before its local work runs.
              // A timeout keeps background tabs from waiting on animation frames.
              await new Promise<void>((resolve) => {
                let frame = 0;
                const done = () => {
                  clearTimeout(timer);
                  cancelAnimationFrame(frame);
                  resolve();
                };
                const timer = setTimeout(done, 80);
                frame = requestAnimationFrame(() => {
                  frame = requestAnimationFrame(done);
                });
              });
              activeSignal?.throwIfAborted();
              edited = captions(edited, edited.captionFormat);
            }
            setFirstCutStage("save");
            p.document = edited;
            p.firstCutTask = {
              ...p.firstCutTask!,
              status: "complete",
              progress: 1,
            };
            cutTask.current = p.firstCutTask;
            setHistory([transcribed]);
            setProject({ ...p });
            setSelected(edited.segments[0].id);
            await saveProject(p);
            setFirstCutStage("complete");
            updateCutProgress(1, "complete", p.document.sources.length);
            setNotice(
              p.firstCutTask!.autoCut !== false
                ? p.firstCutTask!.addCaptions
                  ? "Your cut and captions are ready."
                  : "Your first cut is ready."
                : "Your captions are ready.",
            );
          } catch (e: any) {
            // WebKit can reject fetch during reload before destroying its context.
            // Retain pending recovery; a transport teardown is not user cancellation.
            if (unloading.current && !activeSignal?.aborted) return;
            // Original media and any persisted transcription job remain recoverable.
            if (e.name === "AbortError" || activeSignal?.aborted) {
              const saved = (await listProjects()).find(
                (item) => item.id === p.id,
              );
              const cancelled = {
                ...(saved || p),
                firstCutTask: {
                  ...p.firstCutTask!,
                  status: "cancelled" as const,
                },
              };
              await saveProject(cancelled);
              if (firstCutTarget.current)
                firstCutTarget.current.project = cancelled;
              setProject(cancelled);
              setNotice(
                uiText(
                  "Automatic editing cancelled. Your original footage is saved in Edits.",
                ),
              );
              setScreen("home");
              return;
            } else {
              const saved = (await listProjects()).find(
                (item) => item.id === p.id,
              );
              const failed = {
                ...(saved || p),
                firstCutTask: { ...p.firstCutTask!, status: "failed" as const },
              };
              await saveProject(failed);
              if (firstCutTarget.current)
                firstCutTarget.current.project = failed;
              setProject(failed);
              fail(e);
              setNotice(
                uiText(
                  "Automatic editing could not finish. Your original footage is ready to edit; ask EditAI for changes.",
                ),
              );
            }
          }
        } else {
          p.firstCutTask = {
            ...p.firstCutTask!,
            status: "complete",
            progress: 1,
          };
          cutTask.current = p.firstCutTask;
          await saveProject(p);
          setFirstCutStage("complete");
          setNotice(uiText("Your footage is ready."));
        }
        activeSignal?.throwIfAborted();
        if (stayedOnUpload.current) setScreen("editor");
        try {
          const saved = (await listProjects()).find((item) => item.id === p.id);
          await syncProject(saved || p, media);
        } catch (e: any) {
          if (e.name !== "AbortError")
            setError(uiText("Saved") + ". " + e.message);
        }
      } finally {
        if (activeSignal?.aborted) setScreen("home");
        setProjects(await listProjects());
        setUpload(null);
        setFirstCut(false);
        cutTask.current = undefined;
      }
    });
  }
  function updateCutProgress(
    value: number,
    stage: "transcribe" | "edit" | "save" | "complete" = "transcribe",
    sources = upload?.project.document.sources.length || 1,
  ) {
    const task = cutTask.current;
    if (!task) return;
    task.progress = firstCutProgress(task.progress, value, sources, stage);
  }
  function backgroundUpload() {
    stayedOnUpload.current = false;
    setScreen("home");
    setNotice(uiText("Editing continues in the background."));
  }
  function closeUpload() {
    if (operationActive.current) {
      abort.current?.abort();
      cancelFFmpeg();
      setNotice(
        uiText("Cancelling editing. Your original footage is saved in Edits."),
      );
      if (firstCut) return;
    }
    setUpload(null);
    setScreen("home");
  }
  async function writeProjectSources(
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
  function syncProject(...args: Parameters<typeof writeProjectSources>) {
    return trackSave(() => writeProjectSources(...args));
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
      d.sources.some((source) => source.kind === "video" && !source.transcribed)
    )
      warmSpeechDetector();
    if (
      d.sources.filter((s) => s.kind === "video").every((s) => s.transcribed)
    ) {
      if (!d.words.length) throw Error(NO_AUDIO);
      if (d.quietCutVersion === QUIET_CUT_VERSION) return d;
      const refreshed = structuredClone(d);
      refreshed.quietCuts = [];
      refreshed.speechRegions = [];
      let complete = true;
      for (let i = 0; i < d.sources.length; i++) {
        const source = d.sources[i];
        if (source.kind !== "video" || !d.words.some((w) => w.clip === i))
          continue;
        setBusy("Checking speech pauses");
        const media = await loadMedia(source.id);
        if (!media) throw Error("Source media is missing.");
        const audio = await extractAudio(media, 0, source.duration);
        activeSignal?.throwIfAborted();
        refreshed.quietCuts.push(
          ...(await quietPauses(
            audio,
            d.words,
            i,
            0,
            (ready, bounds, regions) => {
              recordSpeechRegions(refreshed, i, regions);
              complete &&= ready;
              if (bounds)
                refreshed.wordAudioBounds = {
                  ...refreshed.wordAudioBounds,
                  ...bounds,
                };
            },
          )),
        );
      }
      refreshed.quietCutVersion = complete ? QUIET_CUT_VERSION : 0;
      return refreshed;
    }
    const out = structuredClone(d),
      words: Word[] = [...d.words];
    const wordIds = new Set(words.map((word) => word.id));
    let wordOrdinal = words.length;
    let speechComplete = true;
    const refreshCachedAudio = d.quietCutVersion !== QUIET_CUT_VERSION;
    if (refreshCachedAudio) {
      out.quietCuts = [];
      out.speechRegions = [];
    }
    for (let i = 0; i < d.sources.length; i++) {
      const s = d.sources[i];
      if (s.kind !== "video") continue;
      if (s.transcribed) {
        if (refreshCachedAudio && words.some((word) => word.clip === i)) {
          setBusy("Checking speech pauses");
          const media = await loadMedia(s.id);
          if (!media) throw Error("Source media is missing.");
          const audio = await extractAudio(media, 0, s.duration);
          activeSignal?.throwIfAborted();
          out.quietCuts!.push(
            ...(await quietPauses(
              audio,
              words,
              i,
              0,
              (ready, bounds, regions) => {
                speechComplete &&= ready;
                recordSpeechRegions(out, i, regions);
                if (bounds)
                  out.wordAudioBounds = { ...out.wordAudioBounds, ...bounds };
              },
            )),
          );
        }
        continue;
      }
      setActiveUploadIndex(i);
      if (s.duration > 900)
        throw Error(
          "AI features support videos up to 15 minutes per source. Trim or split the original first.",
        );
      const blob = await loadMedia(s.id);
      if (!blob) throw Error("Source media is missing.");
      const accept = (
        reply: { words?: unknown; segments?: unknown; text?: unknown },
        offset = 0,
        length = s.duration,
      ) => {
        const recognized = normalizeTranscript(reply, length);
        const added = recognized.map((w) => {
          let wordId = `${i}:${wordOrdinal++}`;
          while (wordIds.has(wordId)) wordId = `${i}:${wordOrdinal++}`;
          wordIds.add(wordId);
          return {
            id: wordId,
            clip: i,
            start: w.start + offset,
            end: w.end + offset,
            text: w.text,
          };
        });
        words.push(...added);
      };
      const audioSection = async (start: number, length: number) => {
        const audio = await extractAudio(blob, start, length);
        if (!(await hasAudioSignal(audio))) throw Error(NO_AUDIO);
        return audio;
      };
      const persistTranscript = async () => {
        out.words = [...words];
        if (!contextProject) return;
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
      };
      const transcribeSections = async (alignmentJob?: string) => {
        const cursor = alignmentJob
          ? (out.sources[i].speechAlignment?.until ?? 0)
          : 0;
        for (let start = cursor; start < s.duration; start += 100) {
          activeSignal?.throwIfAborted();
          setBusy(
            `${alignmentJob ? "Recovering speech timing" : "Transcribing"} · ${s.name} · ${time(start)} / ${time(s.duration)}`,
          );
          const length = Math.min(100, s.duration - start);
          let audio: Blob | undefined;
          try {
            audio = await audioSection(start, length);
          } catch (e) {
            if ((e as Error).message !== NO_AUDIO) throw e;
          }
          if (audio) {
            const form = new FormData();
            form.set("file", audio, "audio.wav");
            if (language !== "auto") form.set("language", language);
            if (alignmentJob) {
              form.set("alignmentJob", alignmentJob);
              form.set("sourceId", s.id);
              form.set("offset", String(start));
              form.set("length", String(length));
            }
            const res = await api("ai/transcribe", form);
            activeSignal?.throwIfAborted();
            accept(res, start, length);
            out.quietCuts ??= [];
            out.quietCuts.push(
              ...(await quietPauses(
                audio,
                words,
                i,
                start,
                (ready, bounds, regions) => {
                  recordSpeechRegions(out, i, regions);
                  speechComplete &&= ready;
                  if (bounds)
                    out.wordAudioBounds = { ...out.wordAudioBounds, ...bounds };
                },
              )),
            );
          }
          if (alignmentJob) {
            out.sources[i].speechAlignment = {
              job: alignmentJob,
              until: start + length,
            };
            await persistTranscript();
          }
          setProgress(
            (i + Math.min(1, (start + length) / s.duration)) / d.sources.length,
          );
          updateCutProgress(
            (i + Math.min(1, (start + length) / s.duration)) / d.sources.length,
            "transcribe",
            d.sources.length,
          );
        }
      };
      try {
        let evidenceAudio: Blob | undefined;
        if (
          session.profile.choice === "publik" &&
          out.sources[i].speechAlignment
        ) {
          await transcribeSections(out.sources[i].speechAlignment!.job);
        } else if (session.profile.choice === "publik") {
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
            const audio = await audioSection(0, s.duration);
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
                  .error ||
                  "Audio upload failed. Your original video was kept.",
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
          for (let attempt = 0; attempt < 460; attempt++) {
            activeSignal?.throwIfAborted();
            setBusy(`Transcribing with publik · ${s.name}`);
            const job = await api("ai/transcription-job/" + jobId);
            if (job.status === "completed") {
              evidenceAudio ??= await audioSection(0, s.duration);
              try {
                accept(job);
                out.quietCuts ??= [];
                out.quietCuts.push(
                  ...(await quietPauses(
                    evidenceAudio,
                    words,
                    i,
                    0,
                    (ready, bounds, regions) => {
                      recordSpeechRegions(out, i, regions);
                      speechComplete &&= ready;
                      if (bounds)
                        out.wordAudioBounds = {
                          ...out.wordAudioBounds,
                          ...bounds,
                        };
                    },
                  )),
                );
              } catch (e) {
                if (!(e instanceof TranscriptTimingError)) throw e;
                out.sources[i].speechAlignment = { job: jobId!, until: 0 };
                await persistTranscript();
                await transcribeSections(jobId);
              }
              break;
            }
            if (attempt === 459)
              throw Error(
                "Transcription is still running. Retry to resume this job; you will not be charged for a second job.",
              );
            setProgress(
              (i + (Number(job.progress) || 0) / 100) / d.sources.length,
            );
            // Provider progress is advisory and can reset on retries. Only completed
            // sources count toward the whole task; no fabricated time estimate.
            updateCutProgress(
              i / d.sources.length,
              "transcribe",
              d.sources.length,
            );
            await new Promise<void>((resolve, reject) => {
              const signal = activeSignal;
              const abort = () => {
                clearTimeout(timer);
                reject(new DOMException("Cancelled", "AbortError"));
              };
              const timer = setTimeout(
                () => {
                  signal?.removeEventListener("abort", abort);
                  resolve();
                },
                attempt < 20 ? 1000 : 2000,
              );
              signal?.addEventListener("abort", abort, { once: true });
            });
          }
        } else {
          await transcribeSections();
        }
        out.sources[i].transcribed = true;
        updateCutProgress(
          (i + 1) / d.sources.length,
          "transcribe",
          d.sources.length,
        );
      } catch (e) {
        if ((e as Error).message.includes(NO_AUDIO)) {
          out.sources[i].transcribed = true;
          continue;
        }
        throw e;
      }
    }
    words.sort((a, b) => a.clip - b.clip || a.start - b.start);
    out.words = words;
    out.quietCutVersion = speechComplete ? QUIET_CUT_VERSION : 0;
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
    if (!words.length) throw Error(NO_AUDIO);
    return out;
  }
  async function transcribe() {
    if (!doc) return;
    await run("Preparing speech recognition", async () => {
      const d = await ensureWords(
        doc,
        temporaryTool.current ? null : projectRef.current,
      );
      change(d);
      setNotice(uiText("Transcript ready."));
    });
  }
  async function analyze() {
    if (!doc) return;
    await run("Preparing video analysis", async () => {
      const d = await ensureWords(
        doc,
        temporaryTool.current ? null : projectRef.current,
      );
      change(d);
      setBusy("Finding your main point and highlights");
      setSummary(
        await api("ai/summary", {
          words: d.words,
          responseLanguage: effectiveLanguage,
        }),
      );
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
    if (!doc || (!prompt.trim() && !reference) || operationActive.current)
      return;
    if (cropping) closeCrop();
    promptRecall.current = null;
    const message = prompt.trim() || "Match this reference’s style";
    const requestPrompt = prompt.trim() || defaultReferenceRequest;
    const replyLanguage = validLanguage(language)
      ? language
      : mostUsedLanguage(
          [...JSON.parse(languageEvidence), prompt.trim()],
          chatLanguageUsage.owner === languageOwner
            ? chatLanguageUsage.scores
            : {},
        );
    if (prompt.trim()) rememberLanguageUse(prompt.trim());
    setPrompt("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    await run(
      "EditAI is working",
      async () => {
        // Reference pacing needs source words before planning cuts; reuse cached
        // jobs/transcripts. Silent target footage can still receive a visual match.
        let context = doc;
        if (
          reference &&
          doc.sources.some((s) => s.kind !== "image" && !s.transcribed)
        ) {
          try {
            context = await ensureWords(doc);
          } catch (e) {
            if ((e as Error).message !== NO_AUDIO) throw e;
          }
        }
        setBusy(
          reference
            ? "Matching reference text and pacing"
            : "EditAI is working",
        );
        const payload = {
          mode: "chat",
          captionPhrasesV1: true,
          referenceLayoutV1: true,
          prompt: requestPrompt,
          responseLanguage: replyLanguage,
          messages: messages.slice(-10),
          document: {
            ...context,
            speechRegions: undefined,
            segments: context.segments.map((s) => ({
              ...s,
              source: s.sourceIndex,
            })),
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
        let d = context;
        if (reply.generateCaptions || reply.captionFormat)
          d = captions(
            await ensureWords(d),
            reply.captionFormat || d.captionFormat,
          );
        d = applyOperations(d, reply.operations);
        if (reply.generateCaptions || reply.captionFormat)
          d = referenceCaptionPhrases(d, reply.captionPhrases);
        if (reference) {
          const { width, height } = canvasSize(d);
          d = await calibrateReferenceText(
            context,
            d,
            reply.referenceLayouts,
            width,
            height,
            reference.textObservations,
          );
        }
        if (reference?.safePlacement) {
          const { width, height } = canvasSize(d);
          const result = await protectReferenceText(context, d, width, height);
          d = result.document;
        }
        if (reply.operations.length || d !== doc) {
          const saved = {
            ...projectRef.current!,
            document: d,
            updatedAt: Date.now(),
          };
          change(d, saved);
          await saveProject(saved);
          setProjects(await listProjects());
        }
        if (backgroundRequested.current)
          setNotice(
            uiText("EditAI finished. Your changes are saved in Edits."),
          );
        setMessages((m) => [...m, { role: "assistant", text: reply.message }]);
      },
      "chat",
    );
  }
  async function exportVideo() {
    if (!player.current || !project) return;
    setExportOpen(false);
    abort.current = new AbortController();
    await run(
      desktop() ? "Rendering your video locally" : "Rendering your video",
      async () => {
        const b = await player.current!.export(
          fps,
          setProgress,
          abort.current!.signal,
        );
        if (b) download(b, project.title + ".mp4");
        setNotice(
          desktop()
            ? "MP4 exported to Downloads. Your editable project is saved."
            : "MP4 exported. Your editable project is saved.",
        );
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
    await api("projects/" + p.id, undefined, "DELETE");
    await deleteProject(p.id);
    if (projectRef.current?.id === p.id) setProject(null);
    setProjects(await listProjects());
    setDeletingProject(null);
  }
  const nav = async (s: Screen) => {
    if (!(await settingsSave.flush())) return;
    if ((screen === "analysis" || screen === "transcript") && s !== screen) {
      if (!(await confirmToolExit())) return;
      await discardTool();
    }
    if (
      screen === "record" &&
      recordingDirty.current &&
      s !== "record" &&
      !confirm(uiText("Discard your recorded takes and leave the recorder?"))
    )
      return;
    player.current?.pause();
    setPlaying(false);
    if (screen === "editor" && s !== "editor" && projectRef.current) {
      if (chatOperation.current) backgroundRequested.current = true;
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
    stayedOnUpload.current = false;
    setScreen(s);
    if (s === "settings") void settingsSave.flush();
    setMenu(false);
  };
  useEffect(() => {
    if (!aiBusy || backgroundAI || !temporaryTool.current) return;
    const leave = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        void nav("home");
      }
    };
    window.addEventListener("keydown", leave);
    return () => window.removeEventListener("keydown", leave);
  }, [aiBusy, backgroundAI, screen, exitPreference]);
  const accountGate = pending ? (
    <section className="studio-loading" role="status" aria-live="polite">
      <EditAIMascot size={124} greeting interactive={false} />
      <h2>{uiText("Opening your studio…")}</h2>
    </section>
  ) : (
    <StudioAccount
      title={gateScreen?.title || "Sign in with publik"}
      signIn={
        !gateError && gateScreen?.id === "sign_in" && Boolean(session?.claimURL)
      }
    >
      {gateError ? (
        <>
          <p role="alert">{uiText(gateError)}</p>
          <Button
            onClick={() => {
              setPending(true);
              void refresh();
            }}
          >
            {uiText("Retry")}
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
                secondary={index > 0}
                disabled={button.action === "sign_in" && !session?.claimURL}
                onClick={() => void choose(button.action)}
              >
                {button.label}
              </Button>
            ),
          )}
          {gateScreen?.id === "sign_in" && !session?.claimURL && (
            <Button onClick={() => void refresh()}>{uiText("Retry")}</Button>
          )}
        </>
      )}
      {authPurpose && (
        <p role="status">
          {authPurpose === "sign_in"
            ? uiText(
                "Finish signing in in the Publik window, then return here.",
              )
            : uiText(
                "Finish connecting your plan in the Publik window, then return here.",
              )}
        </p>
      )}
      {blockedAuthURL && (
        <a href={blockedAuthURL} target="_blank" rel="noreferrer">
          {uiText("Open Publik sign-in")}
        </a>
      )}
    </StudioAccount>
  );
  const temporaryProcessing =
    !!temporaryTool.current ||
    (!!busy && ["analysis", "transcript"].includes(purpose.current));
  const processingFile = busy.includes(" · ")
    ? busy.slice(busy.indexOf(" · ") + 3)
    : temporaryTool.current?.document.sources[0]?.name;
  const processingTitle = temporaryTool.current
    ? uiText(screen === "analysis" ? "Analyzing video" : "Transcribing video")
    : uiText(busy.split(" · ")[0]);
  const cutCompleteNotice =
    [
      "Your first cut is ready.",
      "Your cut and captions are ready.",
      "Your captions are ready.",
      "Your footage is ready.",
    ].some((message) => notice === message || notice === uiText(message)) &&
    firstCutTarget.current?.project.firstCutTask?.status === "complete";
  const busyUI = aiBusy && !chatWorking && !firstCut && !backgroundAI && (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && temporaryTool.current)
          void nav("home");
      }}
    >
      <div
        className="modal progress-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="processing-title"
      >
        <EditAIMascot working size={112} />
        <h2 id="processing-title">{processingTitle}</h2>
        {processingFile && (
          <p className="processing-filename">{processingFile}</p>
        )}
        <div
          className="processing-progress"
          role="progressbar"
          aria-label={uiText("Loading")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress > 0 ? Math.round(progress * 100) : undefined}
        >
          <span
            className={progress > 0 ? "" : "indeterminate"}
            style={{
              width: progress > 0 ? `${Math.min(100, progress * 100)}%` : "40%",
            }}
          />
        </div>
        <span>
          {progress > 0 ? Math.round(progress * 100) + "%" : uiText("Loading")}
        </span>
        {!temporaryProcessing && (
          <Button
            secondary
            onClick={() => {
              player.current?.pause();
              setPlaying(false);
              backgroundRequested.current = true;
              setBackgroundAI(true);
              setScreen("home");
            }}
          >
            {uiText("Continue in background")}
          </Button>
        )}
        <Button
          secondary
          onClick={() => {
            abort.current?.abort();
            cancelFFmpeg();
            setNotice(uiText("Cancelling the current media operation…"));
          }}
        >
          {uiText("Cancel media processing")}
        </Button>
      </div>
    </div>
  );
  return (
    <AppThemeContext.Provider value={appTheme}>
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
              setReference(await makeReference(f, setBusy)),
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
          <MarketingSignIn loading={pending} onPrivacy={() => setPrivacy(true)}>
            {pending || ["choose", "remembered"].includes(gateScreen?.id) ? (
              accountGate
            ) : (
              <StudioOnboarding>{accountGate}</StudioOnboarding>
            )}
          </MarketingSignIn>
        ) : (
          <MarketingLanding onPrivacy={() => setPrivacy(true)} />
        )
      ) : session.profile.needsName ? (
        <MarketingSignIn onPrivacy={() => setPrivacy(true)}>
          <StudioNameOnboarding
            key={session.profile.ownerId || session.profile.handle || "account"}
            onSave={async (firstName, lastName) => {
              const saved = await api("onboarding/name", {
                firstName,
                lastName,
              });
              latestProfileName.current = saved.displayName;
              setProfileName(saved.displayName);
              setSession((current: any) => ({
                ...current,
                profile: {
                  ...current.profile,
                  displayName: saved.displayName,
                  needsName: false,
                },
              }));
            }}
          />
        </MarketingSignIn>
      ) : consentRequired ? (
        <main className="consent-page">
          <section
            className="settings-card consent-card"
            aria-labelledby="consent-title"
          >
            <Wordmark />
            <h1 id="consent-title">{uiText("Allow AI processing?")}</h1>
            <p>
              {uiText(
                "When you use AI features, EditAI processes transcripts and attached reference frames on its servers and sends the required data to your selected AI provider. Transcription sends extracted audio. Provider privacy and retention policies apply.",
              )}
            </p>
            <p>
              {desktop()
                ? uiText(
                    "Imported clips are copied into project storage on this computer.",
                  )
                : uiText(
                    "Imported clips are saved in this browser and automatically backed up to your private EditAI storage within its limits.",
                  )}
            </p>
            <button className="text-button" onClick={() => setPrivacy(true)}>
              {uiText("Read Privacy & data")}
            </button>
            {consentError && <p role="alert">{consentError}</p>}
            <div className="consent-actions">
              <Button
                disabled={consentSaving}
                onClick={() => void chooseConsent(true)}
              >
                {uiText("Allow")}
              </Button>
              <Button
                secondary
                disabled={consentSaving}
                onClick={() => void chooseConsent(false)}
              >
                {uiText("Continue without AI")}
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
          <aside
            inert={screen === "review"}
            className={`sidebar ${menu ? "open" : ""}`}
          >
            <button
              className="logo-button"
              aria-label={uiText("EditAI home")}
              onClick={() => nav("home")}
            >
              <Wordmark />
            </button>

            <nav>
              {[
                { id: "home", label: uiText("Home"), icon: Home },
                { id: "library", label: uiText("Edits"), icon: FolderOpen },
                { id: "settings", label: uiText("Settings"), icon: Settings },
              ].map((n) => (
                <button
                  key={n.id}
                  data-nav={n.id}
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

            <div className="sidebar-bottom">
              <button
                className="profile-row"
                aria-label={uiText("Open profile customization")}
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
            <header className="topbar" inert={screen === "review"}>
              <div className="breadcrumb">
                <button
                  className="mobile-menu icon-button"
                  onClick={() => setMenu(!menu)}
                  aria-label={uiText("Open navigation")}
                >
                  <Menu />
                </button>
                <span>{uiText("EditAI Studio")}</span>
                <span>/</span>
                <strong>
                  {screen === "editor"
                    ? project?.title
                    : screen === "library"
                      ? uiText("Edits")
                      : screen === "profile"
                        ? uiText("Customize profile")
                        : screen === "analysis"
                          ? uiText("Analyze")
                          : screen === "transcript"
                            ? uiText("Transcribe")
                            : uiText(screen[0].toUpperCase() + screen.slice(1))}
                </strong>
              </div>
              <div className="topbar-right">
                {!desktop() && <DesktopDownloads placement="topbar" />}
                {screen === "home" && (
                  <Button secondary onClick={() => nav("settings")}>
                    <UserRound size={16} /> {uiText(" Account")}
                  </Button>
                )}
              </div>
            </header>
            {screen === "review" && upload && (
              <UploadFlow
                key={upload.project.id}
                sources={upload.project.document.sources}
                urls={urls}
                sizes={upload.media.map((item) => item.file.size)}
                preparing={busy === "Importing your footage"}
                processing={firstCut}
                stage={firstCutStage}
                options={{
                  autoCut: upload.project.firstCutTask?.autoCut ?? true,
                  addCaptions:
                    upload.project.firstCutTask?.addCaptions ?? false,
                }}
                startedAt={upload.project.firstCutTask?.startedAt}
                activeIndex={activeUploadIndex}
                error={uiText(error)}
                onRetake={() => pick()}
                onSend={(options) => void sendUpload({ ...upload, options })}
                onClose={closeUpload}
                onBackground={backgroundUpload}
              />
            )}
            {screen === "home" && (
              <main className="dashboard">
                {!busy &&
                  projects.some(
                    (p) =>
                      p.firstCutTask &&
                      ["pending", "failed"].includes(p.firstCutTask.status),
                  ) && (
                    <div className="saved-edit-status">
                      <p>
                        {uiText(
                          "An automatic edit is saved and ready to resume.",
                        )}
                      </p>
                      <Button
                        secondary
                        onClick={() => {
                          const p = projects.find(
                            (p) =>
                              p.firstCutTask &&
                              ["pending", "failed"].includes(
                                p.firstCutTask.status,
                              ),
                          );
                          if (p)
                            void sendUpload({ project: p, media: [] }, true);
                        }}
                      >
                        {uiText("Resume editing")}
                      </Button>
                    </div>
                  )}

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
                      <Sparkles size={13} /> {uiText(" YOUR CREATIVE SHORTCUT")}
                    </span>
                    <HomeMascot />
                    <h2>
                      {uiText("Welcome")}
                      {session.profile.displayName?.trim()
                        ? `, ${session.profile.displayName.trim().split(/\s+/)[0]}`
                        : ""}
                    </h2>
                    <p>{uiText("Upload your clips here, we do the rest")}</p>
                    <Button onClick={() => pick()}>
                      <Upload size={18} />
                      {uiText("Upload clips")}
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
                      <h3>{uiText("Record")}</h3>
                      <p>
                        {uiText("Record your ideas")}
                        <br />
                        {uiText("Read your script")}
                      </p>
                    </button>
                    <button
                      className="tool-card lavender"
                      onClick={() => nav("batch")}
                    >
                      <div className="tool-card-icon">
                        <Layers />
                      </div>
                      <h3>{uiText("Batch")}</h3>
                      <p>
                        {uiText("Edit more videos")}
                        <br />
                        {uiText("Up to 10 uploads")}
                      </p>
                    </button>
                    <button
                      className="tool-card peach"
                      onClick={() => pick("analysis")}
                    >
                      <div className="tool-card-icon">
                        <ActionSparkles />
                      </div>
                      <h3>{uiText("Analyze")}</h3>
                      <p>
                        {uiText("Understand your video")}
                        <br />
                        {uiText("Find key moments")}
                      </p>
                    </button>
                    <button
                      className="tool-card mint"
                      onClick={() => pick("transcript")}
                    >
                      <div className="tool-card-icon">
                        <AudioLines />
                      </div>
                      <h3>{uiText("Transcribe")}</h3>
                      <p>
                        {uiText("Speech to text")}
                        <br />
                        {uiText("Copy your transcript")}
                      </p>
                    </button>
                  </div>
                </div>
                <div className="section-heading">
                  <h2>{uiText("Your edits")}</h2>
                  <button
                    className="text-button"
                    onClick={() => nav("library")}
                  >
                    {uiText("View ")}
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
                {projects.length ? (
                  <div className="project-grid">
                    {projects.slice(0, 4).map((p) => (
                      <ProjectCard
                        key={p.id}
                        p={p}
                        open={() => void openProject(p)}
                        remove={() => setDeletingProject(p)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-library">
                    <FolderOpen size={27} />
                    <p>{uiText("No saved edits yet.")}</p>
                  </div>
                )}
              </main>
            )}
            {screen === "library" && (
              <main className="dashboard">
                <div className="page-heading">
                  <div>
                    <h1>{uiText("Edits")}</h1>
                  </div>
                  <div className="library-actions">
                    <div
                      className="edits-layout-toggle"
                      role="group"
                      aria-label={uiText("Edits layout")}
                    >
                      {[
                        {
                          id: "grid",
                          label: uiText("Grid view"),
                          icon: LayoutGrid,
                        },
                        { id: "list", label: uiText("List view"), icon: List },
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
                      remove={() => setDeletingProject(p)}
                      rename={() => startRename(p)}
                    />
                  ))}
                </div>
                {!projects.length && (
                  <div className="empty-library">
                    <Film />
                    <p>{uiText("No saved edits yet.")}</p>
                  </div>
                )}
              </main>
            )}
            {screen === "editor" && doc && (
              <div
                className="editor"
                onPointerDownCapture={(event) => {
                  if (
                    event.target instanceof HTMLInputElement &&
                    event.target.type === "range"
                  )
                    sliderGesture.current = { changed: false };
                }}
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
                      {uiText("My Edits")}
                    </button>
                  </div>
                  <EditableProjectTitle
                    value={project!.title}
                    onChange={(title) =>
                      setProject((p) => (p ? { ...p, title } : p))
                    }
                  />
                  <div className="editor-top-right">
                    <AutosaveStatus
                      dirty={!!project && project !== persistedProject.current}
                      error={localSaveError}
                    />
                    <button
                      type="button"
                      className="support-button"
                      aria-label={uiText("Support")}
                      title={uiText("Support")}
                      onClick={() => {
                        player.current?.pause();
                        setPlaying(false);
                        setSupportOpen(true);
                      }}
                    >
                      <MessageCircle size={17} aria-hidden="true" />
                    </button>
                    <IconButton
                      label={uiText("Help")}
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
                      {uiText("Export")}
                    </Button>
                  </div>
                </div>
                <div className="editor-workspace">
                  <div
                    className="editor-left"
                    role="region"
                    aria-label={uiText("Media and tools")}
                  >
                    <div
                      className="studio-tool-rail"
                      aria-label={uiText("Editor tools")}
                    >
                      {[
                        { id: "media", label: uiText("Media"), icon: Film },
                        { id: "audio", label: uiText("Audio"), icon: Music },
                        { id: "text", label: uiText("Text"), icon: Type },
                        {
                          id: "captions",
                          label: uiText("Auto"),
                          icon: Subtitles,
                        },
                        {
                          id: "overlays",
                          label: uiText("Overlays"),
                          icon: Layers,
                        },
                        {
                          id: "adjust",
                          label: uiText("Adjust"),
                          icon: SlidersHorizontal,
                        },
                        { id: "chat", label: "EditAI", icon: Sparkles },
                      ].map((item) => (
                        <button
                          key={item.id}
                          aria-label={
                            item.id === "chat"
                              ? uiText("Open EditAI chat")
                              : item.id === "captions"
                                ? uiText("Auto captions workspace")
                                : item.label + " workspace"
                          }
                          title={
                            item.label === "EditAI"
                              ? uiText("Ask EditAI to edit your video")
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
                        <h3>{uiText("Edit with Eva")}</h3>
                        {!messages.length && (
                          <p>{uiText("Tell Eva what you’d like to change.")}</p>
                        )}
                        <div
                          className="chat-messages"
                          ref={chatMessagesRef}
                          role="log"
                          aria-label={uiText("Eva conversation")}
                        >
                          {messages.map((m, i) => (
                            <div
                              key={i}
                              className={"chat-message-row " + m.role}
                              role="group"
                              aria-label={
                                m.role === "user" ? uiText("You") : "EditAI"
                              }
                            >
                              {m.role === "assistant" ? (
                                <EditAIMascot size={42} />
                              ) : (
                                <ProfileAvatar
                                  name={
                                    profileName || session.profile.handle || ""
                                  }
                                  photo={avatar}
                                  preset={avatarPreset}
                                />
                              )}
                              <div className={"message " + m.role}>
                                {m.role === "assistant"
                                  ? briefChatMessage(m.text)
                                  : m.text}
                              </div>
                            </div>
                          ))}
                          {chatWorking && (
                            <div className="chat-message-row assistant typing-row">
                              <EditAIMascot working size={48} />
                              <div
                                className="message assistant typing-bubble"
                                role="status"
                                aria-label={uiText("EditAI is working")}
                              >
                                <TypingDots />
                              </div>
                              <IconButton
                                label={uiText("Cancel EditAI request")}
                                onClick={() => {
                                  abort.current?.abort();
                                  cancelFFmpeg();
                                }}
                              >
                                <X size={14} />
                              </IconButton>
                            </div>
                          )}
                          {!messages.length &&
                            [
                              "Add captions",
                              "Give it a warmer look",
                              "Make the cuts more relaxed",
                            ].map((s) => (
                              <button
                                className="suggestion"
                                key={s}
                                onClick={() => {
                                  promptRecall.current = null;
                                  setPrompt(s);
                                }}
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
                              alt={uiText("{0} preview", { 0: reference.name })}
                            />
                          )}
                          <button
                            className="text-button"
                            onClick={() => referenceInput.current?.click()}
                          >
                            <ImageIcon size={14} />
                            {reference
                              ? reference.name
                              : uiText("Add a style reference")}
                          </button>
                          {reference && (
                            <IconButton
                              label={uiText("Remove reference")}
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
                            aria-label={uiText("Message EditAI")}
                            placeholder={uiText("Make it yours…")}
                            value={prompt}
                            onChange={(e) => {
                              cancelPromptCaret();
                              promptRecall.current = null;
                              setPrompt(e.target.value);
                            }}
                            onBlur={cancelPromptCaret}
                            onKeyDown={(e) => {
                              cancelPromptCaret();
                              if (e.nativeEvent.isComposing) return;
                              const field = e.currentTarget;
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void sendChat();
                                return;
                              }
                              if (
                                e.altKey ||
                                e.shiftKey ||
                                e.ctrlKey ||
                                e.metaKey ||
                                field.selectionStart !== field.selectionEnd
                              )
                                return;
                              const sent = messages
                                .filter((m) => m.role === "user")
                                .map((m) => m.text);
                              const atTop = !prompt
                                .slice(0, field.selectionStart)
                                .includes("\n");
                              const atBottom = !prompt
                                .slice(field.selectionEnd)
                                .includes("\n");
                              if (e.key === "ArrowUp" && atTop && sent.length) {
                                e.preventDefault();
                                const index = promptRecall.current
                                  ? Math.max(0, promptRecall.current.index - 1)
                                  : sent.length - 1;
                                const draft =
                                  promptRecall.current?.draft ?? prompt;
                                promptRecall.current = { index, draft };
                                recallPrompt(sent[index], field);
                              } else if (
                                e.key === "ArrowDown" &&
                                atBottom &&
                                promptRecall.current
                              ) {
                                e.preventDefault();
                                const next = promptRecall.current.index + 1;
                                const value =
                                  next < sent.length
                                    ? sent[next]
                                    : promptRecall.current.draft;
                                promptRecall.current =
                                  next < sent.length
                                    ? { ...promptRecall.current, index: next }
                                    : null;
                                recallPrompt(value, field);
                              }
                            }}
                            maxLength={2000}
                          />
                          <button
                            aria-label={uiText("Send message")}
                            disabled={(!prompt.trim() && !reference) || !!busy}
                          >
                            <ArrowRight size={18} />
                          </button>
                        </form>
                      </div>
                    ) : editorPanel === "text" || editorPanel === "captions" ? (
                      <div className="editor-tool-panel">
                        {editorPanel === "text" ? (
                          <>
                            <span className="tool-eyebrow">
                              {uiText("TEXT")}
                            </span>
                            <h3>{uiText("Make it your own.")}</h3>
                            <p>
                              {uiText(
                                "Add text, then choose its font and style in the inspector. Select text on the timeline to edit it.",
                              )}
                            </p>
                            <Button secondary onClick={addTextLayer}>
                              <Type size={17} />
                              {uiText("Add text")}
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="caption-generate-card">
                              <span className="caption-generate-icon">
                                <Subtitles size={26} />
                              </span>
                              <h3>{uiText("Auto captions")}</h3>
                              <p>
                                {uiText(
                                  "Recognize speech and place captions on your edited timeline.",
                                )}
                              </p>
                              <label>
                                {uiText("Spoken language")}
                                <select
                                  aria-label={uiText("Caption spoken language")}
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
                                {uiText("Words per caption")}
                                <select
                                  aria-label={uiText("Caption grouping")}
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
                                    {uiText("Standard · 6 words")}
                                  </option>
                                  <option value="boxed">
                                    {uiText("Boxed · 4 words")}
                                  </option>
                                  <option value="single">
                                    {uiText("One word")}
                                  </option>
                                </select>
                              </label>
                              <Button onClick={() => void generateCaptions()}>
                                <Subtitles size={16} />
                                {uiText("Generate captions")}
                              </Button>
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
                    aria-label={uiText("Video monitor")}
                  >
                    <div className="preview-controls-top">
                      <IconButton
                        label={uiText("Expand video preview")}
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
                          {uiText("Canvas")}
                        </summary>
                        <div className="canvas-settings">
                          <h3>{uiText("Canvas")}</h3>{" "}
                          <select
                            aria-label={uiText("Canvas aspect ratio")}
                            value={doc.canvas}
                            onChange={(e) =>
                              patch((d) => {
                                d.canvas = e.target.value as Document["canvas"];
                              })
                            }
                          >
                            <option value="original">
                              {uiText("Original ratio")}
                            </option>
                            <option value="9:16">
                              {uiText("9:16 Portrait")}
                            </option>
                            <option value="16:9">
                              {uiText("16:9 Landscape")}
                            </option>
                            <option value="1:1">{uiText("1:1 Square")}</option>
                          </select>
                          <select
                            aria-label={uiText("Framing")}
                            value={doc.framing}
                            onChange={(e) =>
                              patch((d) => {
                                d.framing = e.target.value as "fit" | "fill";
                              })
                            }
                          >
                            <option value="fit">{uiText("Fit")}</option>
                            <option value="fill">{uiText("Fill")}</option>
                          </select>
                        </div>
                      </details>
                    </div>
                    <div
                      className="canvas-stage"
                      onPointerDown={(e) => {
                        if (
                          !(e.target as HTMLElement).closest(
                            "button,input,textarea,.preview-selection,.preview-text-hit,.crop-selection",
                          )
                        ) {
                          setSelected("");
                          setSelectedLayer(null);
                        }
                      }}
                    >
                      <canvas
                        ref={canvas}
                        aria-label={uiText("Video preview")}
                      />
                      {!cropping && !chatWorking && (
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
                          onSelect={(id, track) => {
                            setSelectedText(track === "texts" ? id : "");
                            setSelectedLayer({ track, id });
                            setTool(track === "texts" ? "captions" : "clip");
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
                          aria-label={
                            playing ? uiText("Pause") : uiText("Play")
                          }
                          title={
                            playing
                              ? uiText("Pause (Space)")
                              : uiText("Play (Space)")
                          }
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
                        {resolution
                          ? resolution === 1920
                            ? "1080p"
                            : resolution === 854
                              ? "480p"
                              : "720p"
                          : uiText("Original")}{" "}
                        · {fps ? `${fps} fps` : uiText("Source frame rate")}
                      </span>
                    </div>
                  </div>
                  <div
                    className="inspector"
                    role="region"
                    aria-label={uiText("Editing inspector")}
                  >
                    <div className="inspector-tabs">
                      {[
                        {
                          id: "clip",
                          icon: SlidersHorizontal,
                          label: uiText("Clip"),
                        },
                        {
                          id: "captions",
                          icon: Subtitles,
                          label: uiText("Text"),
                        },
                        {
                          id: "filter",
                          icon: ImageIcon,
                          label: uiText("Filter"),
                        },
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
                          <h3>{uiText("Text")}</h3>
                          <IconButton
                            label={uiText("Add text")}
                            onClick={addTextLayer}
                          >
                            <Plus size={17} />
                          </IconButton>
                        </div>
                        {textLayer && (
                          <textarea
                            aria-label={uiText("Caption text")}
                            placeholder={uiText("Text")}
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
                          <summary>{uiText("Text style")}</summary>
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={onlySelectedText}
                              disabled={!textLayer}
                              onChange={(e) =>
                                setOnlySelectedText(e.target.checked)
                              }
                            />
                            {uiText("Only apply style to selected text")}
                          </label>
                          <FontPreviewPicker
                            font={
                              (onlySelectedText && textLayer
                                ? textLayer.font
                                : doc.captionStyle?.font) || "TikTok Sans"
                            }
                            weight={
                              onlySelectedText && textLayer
                                ? (textLayer.fontWeight ?? 600)
                                : (doc.captionStyle?.fontWeight ??
                                  DEFAULT_TEXT_STYLE.fontWeight)
                            }
                            onWeight={(fontWeight) =>
                              updateTextStyle({ fontWeight })
                            }
                            onFont={(font) => updateTextStyle({ font })}
                          />
                          {textLayer && (
                            <>
                              <TextStyleEditor
                                text={textLayer}
                                onChange={(values) => updateTextStyle(values)}
                              />
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
                                {uiText("Delete text")}
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
                  aria-label={uiText("Editing timeline")}
                >
                  <TimelineResizeHandle />
                  <div className="timeline-toolbar">
                    <div className="timeline-history">
                      <IconButton
                        label={uiText("Undo")}
                        onClick={undo}
                        disabled={!history.length || chatWorking}
                      >
                        <Undo size={20} />
                      </IconButton>
                      <IconButton
                        label={uiText("Redo")}
                        onClick={redo}
                        disabled={!future.length || chatWorking}
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
                        label={uiText("Split")}
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
                        label={uiText("Overlay")}
                        disabled={
                          !segment ||
                          mediaSelection.track !== "segments" ||
                          tool === "captions" ||
                          doc.segments.length < 2
                        }
                        onClick={moveSelectedToOverlay}
                      >
                        <Layers size={17} />
                      </IconButton>
                      <IconButton
                        label={uiText("Crop")}
                        disabled={
                          !mediaSelection.id || mediaSelection.track === "audio"
                        }
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
                        label={uiText("Duplicate")}
                        disabled={!selectedLayer && !segment}
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
                        label={uiText("Delete")}
                        disabled={
                          (!selectedLayer && !segment) ||
                          ((!selectedLayer ||
                            selectedLayer.track === "segments") &&
                            doc.segments.length <= 1)
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
                    onDeselect={() => {
                      closeCrop();
                      setSelected("");
                      setSelectedLayer(null);
                      setSelectedText("");
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
                <div className="page-heading">
                  <h1>
                    {screen === "analysis"
                      ? uiText("Analyze")
                      : uiText("Transcribe")}
                  </h1>
                </div>
                <div className="analysis-layout">
                  <video
                    className="analysis-video"
                    style={{
                      aspectRatio: `${doc.sources[0]?.width || 16} / ${doc.sources[0]?.height || 9}`,
                      width: `min(100%, calc(70dvh * ${(doc.sources[0]?.width || 16) / (doc.sources[0]?.height || 9)}))`,
                    }}
                    src={urls[doc.sources[0]?.id]}
                    controls
                    playsInline
                  />
                  {screen === "analysis" && summary ? (
                    <div className="summary-card">
                      <h3>{uiText("Main point")}</h3>
                      <p>{summary.summary}</p>
                      <h3>{uiText("Hook")}</h3>
                      <p>{summary.hook}</p>
                      <h3>{uiText("Highlights")}</h3>
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
                            .then(() => setNotice(uiText("Analysis copied.")))
                        }
                      >
                        <Copy size={16} />
                        {uiText("Copy analysis")}
                      </Button>
                    </div>
                  ) : screen === "transcript" && doc.words.length ? (
                    <div className="transcript-card">
                      <div className="section-heading">
                        <h3>
                          {doc.words.length} {uiText(" words")}
                        </h3>
                        <Button
                          secondary
                          onClick={() =>
                            void navigator.clipboard
                              .writeText(doc.words.map((w) => w.text).join(" "))
                              .then(() =>
                                setNotice(uiText("Transcript copied.")),
                              )
                          }
                        >
                          <Copy size={15} />
                          {uiText("Copy transcript")}
                        </Button>
                        <Button
                          secondary
                          onClick={() =>
                            download(
                              new Blob(
                                [doc.words.map((w) => w.text).join(" ")],
                                {
                                  type: "text/plain",
                                },
                              ),
                              project!.title + ".txt",
                            )
                          }
                        >
                          <Download size={15} />
                          {uiText("Download")}
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
                    <div className="empty-library" role="status">
                      <AudioLines />
                      <p>
                        {busy
                          ? uiText("Preparing your results…")
                          : uiText("Your results aren’t ready yet.")}
                      </p>
                      {!busy && (
                        <Button
                          secondary
                          onClick={() =>
                            void (screen === "analysis"
                              ? analyze()
                              : transcribe())
                          }
                        >
                          {uiText("Retry")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </main>
            )}
            {screen === "settings" && (
              <main className="dashboard settings-page">
                <div className="page-heading">
                  <h1>{uiText("Settings")}</h1>
                  <div
                    className="settings-save-state"
                    role={settingsSave.status === "error" ? "alert" : "status"}
                  >
                    {settingsSave.status === "saving" ? (
                      uiText("Saving…")
                    ) : settingsSave.status === "saved" ? (
                      uiText("All changes saved")
                    ) : settingsSave.status === "error" ? (
                      <>
                        {uiText("Changes couldn't be saved. ")}
                        {uiText(settingsSave.error.message)}{" "}
                        {settingsSave.error.url && (
                          <a
                            href={settingsSave.error.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {uiText("Top up")}
                          </a>
                        )}{" "}
                        <button
                          className="text-button"
                          onClick={() => void settingsSave.flush()}
                        >
                          {uiText("Retry")}
                        </button>
                      </>
                    ) : (
                      uiText("Changes save automatically")
                    )}
                  </div>
                </div>
                <div className="settings-grid">
                  <div className="settings-column">
                    <section className="settings-card">
                      <h2>{uiText("General")}</h2>
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
                          <dt>{uiText("Saved edits")}</dt>
                          <dd>{projects.length}</dd>
                        </div>
                      </dl>
                      <label>
                        {uiText("App language")}
                        <select
                          id="app-language"
                          aria-label={uiText("App language")}
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                        >
                          <option value="auto">
                            {uiText("Detected automatically")} (
                            {uiText(languageNames[detectedLanguage])})
                          </option>
                          {Object.entries(languageNames).map(([code, name]) => (
                            <option key={code} value={code}>
                              {uiText(name)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Button secondary onClick={() => void signOut()}>
                        <LogOut size={16} />
                        {uiText("Sign out")}
                      </Button>
                      <Button secondary onClick={() => void signOut(true)}>
                        {uiText("Use another Publik account")}
                      </Button>
                      <div className="general-account-actions">
                        <Button secondary onClick={() => setSupportOpen(true)}>
                          {uiText("Feedback &amp; help")}
                        </Button>
                        <button
                          className="danger-link"
                          onClick={() => setDeleteAccountOpen(true)}
                        >
                          {uiText("Delete my account")}
                        </button>
                      </div>
                    </section>
                    <section className="settings-card">
                      <h2>
                        <ShieldCheck size={20} />
                        {uiText("Privacy & data")}
                      </h2>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => {
                            setConsent(e.target.checked);
                            settingsSave.schedule({
                              consent: e.target.checked,
                            });
                          }}
                        />
                        {uiText(
                          "Allow AI processing of audio, transcripts and attached reference frames",
                        )}
                      </label>
                      <p>
                        {uiText(
                          "Editing and export stay on your device. AI editing and summaries process transcripts and reference frames on EditAI servers before calling your selected provider. Transcription sends extracted audio to that provider. Publik",
                        )}{" "}
                        {session.profile.choice === "own_key"
                          ? uiText(
                              "is not used for these AI requests. EditAI securely forwards your own key to OpenAI for editing and summaries without storing it on the AI service",
                            )
                          : `currently identifies these providers: ${session.profile.aiProviders.join(", ") || "available after connection"}`}
                        {uiText(". No AI upload happens until you allow it.")}
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
                        {uiText("Share official usage events with publik")}
                      </label>
                      <p>
                        {uiText(
                          "Events contain app/version and install identity, never your videos, transcripts or prompts. Background tabs do not send active-session events.",
                        )}
                      </p>
                      <button
                        className="text-button"
                        onClick={() => setPrivacy(true)}
                      >
                        {uiText("Read privacy & data details")}
                      </button>
                    </section>
                  </div>
                  <div className="settings-column">
                    <section className="settings-card appearance-card">
                      <h2>{uiText("Appearance")}</h2>
                      <fieldset className="appearance-options">
                        <legend>{uiText("Display mode")}</legend>
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
                            {value === "light" ? (
                              <Sun size={22} />
                            ) : value === "dark" ? (
                              <Moon size={22} />
                            ) : (
                              <Monitor size={22} />
                            )}
                            <span>
                              {uiText(value[0].toUpperCase() + value.slice(1))}
                            </span>
                          </label>
                        ))}
                      </fieldset>
                      <div
                        className="settings-eva-preview"
                        role="img"
                        aria-label={uiText("Eva app theme preview")}
                      >
                        <EditAIMascot size={112} shadow interactive={false} />
                      </div>
                      <fieldset className="app-theme-options">
                        <legend>{uiText("App theme")}</legend>
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
                              {uiText(avatarPresets[value].label)}
                            </label>
                          ),
                        )}
                      </fieldset>
                    </section>
                    <section className="settings-card">
                      <h2>
                        <Sparkles size={20} />
                        {uiText("AI connection")}
                      </h2>
                      <p>
                        {uiText("Connected to")}{" "}
                        <strong>
                          {session.profile.handle
                            ? "@" + session.profile.handle
                            : uiText("your publik account")}
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
                              {session.profile.usedPercent}
                              {uiText("% of this plan period used")}
                            </small>
                          </>
                        ) : session.profile.prepaidRemainingPercent != null ? (
                          <>
                            <progress
                              value={session.profile.prepaidRemainingPercent}
                              max={100}
                            />
                            <small>
                              {session.profile.prepaidRemainingPercent}
                              {uiText("% of prepaid credits remaining")}
                            </small>
                          </>
                        ) : (
                          <small>
                            {uiText(
                              "Plan usage appears when a plan is connected.",
                            )}
                          </small>
                        )}
                      </div>
                      <label>
                        {uiText("AI provider")}
                        <select
                          value={session.profile.choice || "publik"}
                          onChange={(e) => void selectProvider(e.target.value)}
                        >
                          <option value="publik">{uiText("publik")}</option>
                          <option value="own_key">
                            {uiText("My OpenAI key")}
                          </option>
                        </select>
                      </label>
                      <label>
                        {uiText("Own OpenAI API key")}
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
                              ? uiText("A key is securely saved")
                              : uiText("Paste a key to use your own account")
                          }
                        />
                      </label>
                      <p className="panel-note">
                        {desktop()
                          ? uiText(
                              "Your key is encrypted locally with an encryption key protected by macOS Keychain or your OS credential vault.",
                            )
                          : uiText(
                              "Your key is encrypted on the server and never returned to the browser.",
                            )}{" "}
                        {uiText(
                          "Your Publik sign-in identifies your saved edits. OpenAI bills your API account directly for AI requests. No Publik subscription is needed for this option; a ChatGPT subscription is separate.",
                        )}
                      </p>
                      <a
                        className="text-button"
                        href="https://publikhq.com/wallet"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {uiText("Manage publik plan ")}
                        <ArrowUpRight size={14} />
                      </a>
                    </section>
                  </div>
                </div>
              </main>
            )}
            {screen === "record" && (
              <Recorder
                onDone={(files) => {
                  recordingDirty.current = false;
                  void importFiles(files, "recording");
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
                          p.document = applyAutomaticCuts(d, [
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
      {deletingProject && (
        <DeleteProjectDialog
          title={deletingProject.title}
          onClose={() => setDeletingProject(null)}
          onDelete={() => removeProject(deletingProject)}
        />
      )}
      {deleteAccountOpen && (
        <DeleteAccountDialog
          onClose={() => setDeleteAccountOpen(false)}
          onDelete={async () => {
            await api("account", undefined, "DELETE");
            await clearStorage();
            localStorage.removeItem("editai-preferences");
            localStorage.removeItem("editai.language-usage." + languageOwner);
            if (desktop()) await desktop()!.signOut(true);
            else location.reload();
          }}
        />
      )}
      {toolExit && (
        <DiscardToolDialog
          onDecision={(leave, suppress) => {
            if (leave && suppress) localStorage.setItem(exitPreference, "skip");
            toolExit(leave);
            leavePending.current = null;
            setToolExit(null);
          }}
        />
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
            <h2 id="rename-title">{uiText("Rename edit")}</h2>
            <label>
              {uiText("Edit name")}
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
                {uiText("Save name")}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={renameSaving}
                onClick={() => setRenaming(null)}
              >
                {uiText("Cancel")}
              </button>
            </div>
          </form>
        </dialog>
      )}
      {supportOpen && (
        <SupportDialog
          send={(body) => api("support", body)}
          onClose={() => setSupportOpen(false)}
        />
      )}
      {helpOpen && (
        <div className="modal-backdrop">
          <section
            className="modal editor-help"
            aria-labelledby="editor-help-title"
          >
            <div className="section-heading">
              <h2 id="editor-help-title">
                {uiText("Editor help & shortcuts")}
              </h2>
              <IconButton
                label={uiText("Close help")}
                onClick={() => setHelpOpen(false)}
              >
                <X size={20} />
              </IconButton>
            </div>
            <p>
              {uiText(
                "Select clips or text on the timeline to edit them in the inspector. Your original media stays intact.",
              )}
            </p>
            <dl>
              <dt>{uiText("Play / pause")}</dt>
              <dd>
                <kbd>{uiText("Space")}</kbd>
              </dd>
              <dt>{uiText("Split")}</dt>
              <dd>
                <kbd>S</kbd>
              </dd>
              <dt>{uiText("Reset a slider")}</dt>
              <dd>
                {uiText("Focus or hover a slider and press ")}
                <kbd>R</kbd> {uiText(" to restore its default value.")}
              </dd>
              <dt>{uiText("Undo / redo")}</dt>
              <dd>
                <kbd>{uiText("⌘ / Ctrl Z")}</kbd> /{" "}
                <kbd>{uiText("⌘ / Ctrl Shift Z")}</kbd>
              </dd>
              <dt>{uiText("Zoom timeline")}</dt>
              <dd>
                {uiText(
                  "Pinch on your trackpad. Scroll sideways to move through the edit. Drag source library media or files from your desktop onto a timeline row to add them.",
                )}
              </dd>
              <dt>{uiText("Move / trim")}</dt>
              <dd>
                {uiText(
                  "Drag a clip to an insertion marker and release to move it. Drop outside the timeline to cancel. Drag edges to shorten or restore footage. Use arrow keys on an edge for precise trims; Alt + arrow moves a focused layer.",
                )}
              </dd>
              <dt>{uiText("Copy / paste")}</dt>
              <dd>
                {uiText(
                  "Ctrl/Cmd + C copies the selected clip, text or audio. Ctrl/Cmd + V pastes at the cursor in this edit. Typing fields keep normal copy and paste.",
                )}
              </dd>
              <dt>{uiText("Sliders")}</dt>
              <dd>
                {uiText(
                  "Drag near a major mark to snap and hold its value. Hold Alt to bypass snapping, or enter an exact value.",
                )}
              </dd>
              <dt>{uiText("Duplicate / delete")}</dt>
              <dd>
                {uiText(
                  "Select a clip or layer, then press Delete / Backspace or use the timeline toolbar. The final video clip is protected.",
                )}
              </dd>
              <dt>{uiText("Audio")}</dt>
              <dd>
                {uiText(
                  "Import sound in Audio, or use Extract audio in Clip settings. Extraction mutes the video and creates an independently editable sound track. Undo restores it. Record voice with the microphone beside Undo, then stop to add your take at its starting cursor position. Up to seven audio tracks can overlap.",
                )}
              </dd>
              <dt>{uiText("Text / auto captions")}</dt>
              <dd>
                {uiText(
                  "Text adds your own words. Auto captions recognizes speech. Select text on the timeline to change its words, font, style or timing.",
                )}
              </dd>
              <dt>{uiText("Overlays / filters / adjustments")}</dt>
              <dd>
                {uiText(
                  "Import overlay media; drag and resize it in the preview. Select a clip to change its look, speed and volume.",
                )}
              </dd>
              <dt>EditAI</dt>
              <dd>
                {uiText(
                  "Ask for changes in the EditAI tool. Review the result and Undo when needed.",
                )}
              </dd>
              <dt>{uiText("Save / export")}</dt>
              <dd>
                {uiText(
                  "Edits save automatically on this device. Export renders your timeline as a video; My Edits returns to your library.",
                )}
              </dd>
            </dl>
          </section>
        </div>
      )}
      {exportOpen && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="section-heading">
              <h2>{uiText("Ready for the world.")}</h2>
              <IconButton
                label={uiText("Close export")}
                onClick={() => setExportOpen(false)}
              >
                <X />
              </IconButton>
            </div>
            <p>{uiText("Export your finished video as an MP4.")}</p>
            <label>
              {uiText("Resolution")}
              <select
                aria-label={uiText("Export resolution")}
                value={resolution}
                onChange={(e) => setResolution(+e.target.value)}
              >
                <option value={0}>
                  {uiText("Original dimensions · best quality")}
                </option>
                <option value={854}>{uiText("480p · smaller file")}</option>
                <option value={1280}>720p</option>
                <option value={1920}>{uiText("1080p · full HD")}</option>
              </select>
            </label>
            <label>
              {uiText("Frame rate")}
              <select value={fps} onChange={(e) => setFps(+e.target.value)}>
                <option value={0}>
                  {uiText("Source frame rate · recommended")}
                </option>
                <option value={24}>{uiText("24 fps")}</option>
                <option value={30}>{uiText("30 fps")}</option>
                <option value={60}>{uiText("60 fps")}</option>
              </select>
            </label>
            <div className="export-detail">
              <span>{uiText("Duration")}</span>
              <strong>{time(total)}</strong>
              <span>{uiText("Format")}</span>
              <strong>{uiText("MP4 · H.264 + AAC")}</strong>
            </div>

            <Button onClick={() => void exportVideo()}>
              <Download size={17} />
              {uiText("Export video")}
            </Button>
          </section>
        </div>
      )}
      {privacy && (
        <div className="modal-backdrop">
          <section className="modal privacy-modal">
            <div className="section-heading">
              <h2>{uiText("Privacy & your data")}</h2>
              <IconButton
                label={uiText("Close privacy")}
                onClick={() => setPrivacy(false)}
              >
                <X />
              </IconButton>
            </div>
            <p>
              {desktop()
                ? uiText(
                    "EditAI Desktop copies new imports into its local project storage and renders with native FFmpeg. Older projects may need their original files. Credentials are encrypted with the OS credential vault.",
                  )
                : uiText(
                    "EditAI Web edits and renders in your browser. Drafts and source files are also stored in this browser’s IndexedDB. Clearing browser storage removes local files.",
                  )}
            </p>
            <h3>{uiText("Your account and cloud storage")}</h3>
            <p>
              {uiText(
                "Publik provides sign-in and AI plan connection. EditAI stores your project timelines and profile preferences.",
              )}{" "}
              {desktop()
                ? uiText(
                    "Desktop projects and source files are stored on this computer.",
                  )
                : uiText(
                    "Web automatically backs up new sources to private cloud storage within 100 MB per file and 500 MB per account.",
                  )}{" "}
              {uiText(
                "Delete EditAI data in Settings to remove your projects, stored sources and encrypted credentials. Manage your Publik account and plan on publikhq.com.",
              )}
            </p>
            <h3>{uiText("AI processing")}</h3>
            <p>
              {uiText(
                "With your permission, EditAI servers process transcripts and reference frames for AI editing and summaries using Publik or your own OpenAI account. Transcription sends extracted audio to your selected provider. AI results may be saved to recover interrupted edits. Your own key is used transiently by the AI service. Provider terms and retention apply. Review edits and captions before sharing.",
              )}
            </p>
            <h3>{uiText("Usage")}</h3>
            <p>
              {uiText(
                "Support messages are sent through Resend to EditAI support. Your video files and transcripts are not attached.",
              )}
            </p>
            <p>
              {uiText(
                "Official Publik telemetry records genuine app use and can be disabled. It includes no footage, transcripts or prompts. No advertising trackers are installed.",
              )}
            </p>
            <h3>{uiText("Service limits")}</h3>
            <p>
              {uiText(
                "Keep copies of important originals and exports. Browser codec support, memory and device performance vary. This service does not guarantee native iOS HDR fidelity. Contact editaiapp@gmail.com for support or data questions.",
              )}
            </p>
            <a
              href="https://publikhq.com/privacy"
              target="_blank"
              rel="noreferrer"
            >
              {uiText("Publik privacy policy ↗")}
            </a>
          </section>
        </div>
      )}
      {busyUI}
      <div className="notification-stack">
        {busy &&
          ((firstCut &&
            firstCutTarget.current?.project.firstCutTask?.status ===
              "pending" &&
            screen !== "review") ||
            backgroundAI ||
            (chatWorking &&
              (screen !== "editor" || editorPanel !== "chat"))) && (
            <div className="toast operation-status" role="status">
              <EditAIMascot working size={40} />
              <div className="operation-status-copy">
                <p>
                  {uiText(busy)}
                  {firstCut && (
                    <span className="upload-loading-dots" aria-hidden="true">
                      {" "}
                      •••
                    </span>
                  )}
                </p>
                {firstCut && upload && (
                  <Button secondary onClick={viewFirstCut}>
                    {uiText("View progress")}
                  </Button>
                )}
              </div>
              <IconButton
                label={uiText("Cancel current operation")}
                onClick={() => {
                  abort.current?.abort();
                  cancelFFmpeg();
                }}
              >
                <X size={14} />
              </IconButton>
            </div>
          )}
        {busy && !aiBusy && !firstCut && !chatWorking && (
          <div className="toast operation-status" role="status">
            <EditAIMascot working size={40} />
            <div>
              <p>
                {uiText(busy)}
                {progress > 0 ? ` · ${Math.round(progress * 100)}%` : ""}
              </p>
              {progress > 0 && (
                <progress value={progress} max={1} aria-label={uiText(busy)} />
              )}
            </div>
            <IconButton
              label={uiText("Cancel current operation")}
              onClick={() => {
                abort.current?.abort();
                cancelFFmpeg();
              }}
            >
              <X size={14} />
            </IconButton>
          </div>
        )}
        {error && screen !== "review" && (
          <div className="toast error" role="alert">
            <CircleAlert size={16} />
            <div>
              <p>{uiText(error)}</p>
              {errorURL && (
                <a href={errorURL} target="_blank" rel="noreferrer">
                  {uiText("Continue on publik ↗")}
                </a>
              )}
            </div>
            <IconButton
              label={uiText("Dismiss error")}
              onClick={() => setError("")}
            >
              <X size={17} />
            </IconButton>
          </div>
        )}
        {notice && (
          <div
            className={
              "toast" + (cutCompleteNotice ? " cut-complete-notice" : "")
            }
            role="status"
          >
            {cutCompleteNotice ? (
              <EditAIMascot size={44} greeting interactive={false} />
            ) : (
              <Check size={20} />
            )}
            <div className="notice-copy">
              <p>{uiText(notice)}</p>
              {cutCompleteNotice && screen !== "editor" && (
                <Button secondary onClick={viewFirstCut}>
                  {uiText("View edit")}
                </Button>
              )}
            </div>
            <IconButton
              label={uiText("Dismiss notification")}
              onClick={() => setNotice("")}
            >
              <X size={17} />
            </IconButton>
          </div>
        )}
      </div>
    </AppThemeContext.Provider>
  );
}
