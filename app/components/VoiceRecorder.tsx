"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { IconButton } from "./ui";
import { wavFile } from "@/lib/editor/voice";
export function VoiceRecorder({
  maxDuration,
  onStart,
  onRecorded,
  onError,
}: {
  maxDuration: number;
  onStart: () => void;
  onRecorded: (file: File) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [state, setState] = useState<
    "idle" | "requesting" | "recording" | "saving"
  >("idle");
  const callbacks = useRef({ onRecorded, onError });
  useLayoutEffect(() => {
    callbacks.current = { onRecorded, onError };
  }, [onRecorded, onError]);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  async function start() {
    setState("requesting");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw Error("Microphone recording is unavailable on this device.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (m) => MediaRecorder.isTypeSupported(m),
      );
      const r = new MediaRecorder(media, mime ? { mimeType: mime } : undefined);
      recorder.current = r;
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      r.onstop = async () => {
        if (timer.current) clearTimeout(timer.current);
        media.getTracks().forEach((t) => t.stop());
        if (!mounted.current) return;
        setState("saving");
        let context: AudioContext | undefined;
        try {
          context = new AudioContext();
          const decoded = await context.decodeAudioData(
            await new Blob(chunks, { type: r.mimeType }).arrayBuffer(),
          );
          if (decoded.duration < 0.1)
            throw Error("Record a little longer before stopping.");
          const samples = decoded.getChannelData(0);
          const file = wavFile(
            samples,
            decoded.sampleRate,
            `Voice recording ${new Date().toLocaleTimeString().replaceAll(":", "-")}.wav`,
          );
          if (mounted.current) await callbacks.current.onRecorded(file);
        } catch (error) {
          if (mounted.current) callbacks.current.onError(error);
        } finally {
          await context?.close();
          if (mounted.current) setState("idle");
        }
      };
      r.onerror = () => {
        if (mounted.current)
          onError(
            Error(
              "Microphone recording stopped unexpectedly. Please try again.",
            ),
          );
        if (r.state === "recording") r.stop();
      };
      onStart();
      r.start();
      setState("recording");
      timer.current = setTimeout(
        () => {
          if (r.state === "recording") r.stop();
        },
        Math.min(600, Math.max(0.1, maxDuration)) * 1000,
      );
    } catch (error) {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (mounted.current) {
        setState("idle");
        onError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? Error(
                "Microphone access was denied. Allow microphone access in your device or browser settings to record audio.",
              )
            : error,
        );
      }
    }
  }
  const recording = state === "recording";
  return (
    <div className={`voice-recorder ${recording ? "is-recording" : ""}`}>
      <IconButton
        label={
          recording
            ? "Stop recording"
            : state === "saving"
              ? "Saving recording"
              : "Record voice"
        }
        disabled={state === "saving" || state === "requesting"}
        onClick={() => {
          if (recording) recorder.current?.stop();
          else void start();
        }}
      >
        {recording ? <Square size={15} /> : <Mic size={17} />}
      </IconButton>
      <span className="mic-recording-dot" aria-hidden="true" />
      <span className="sr-only" role={recording ? "status" : undefined}>
        {recording ? "Recording microphone audio" : ""}
      </span>
    </div>
  );
}
