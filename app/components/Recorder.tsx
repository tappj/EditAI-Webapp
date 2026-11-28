"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Square, Video, SwitchCamera, Trash2 } from "lucide-react";
import { Button, Range } from "./ui";
import { formatTime as time } from "@/lib/editor/time";
function TakePreview({
  file,
  onRemove,
  disabled,
}: {
  file: File;
  onRemove: () => void;
  disabled: boolean;
}) {
  const target = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    const node = target.current;
    if (node) node.src = next;
    return () => {
      if (node) {
        node.removeAttribute("src");
        node.load();
      }
      URL.revokeObjectURL(next);
    };
  }, [file]);
  return (
    <div className="recorded-take">
      <video
        ref={target}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          e.currentTarget.currentTime = 0.1;
        }}
      />
      <span>{file.name}</span>
      <button
        className="icon-button"
        aria-label={uiText("Remove {0}", { 0: file.name })}
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
export function Recorder({
  onDone,
  onError,
  onDirty,
}: {
  onDone: (files: File[]) => void;
  onError: (e: unknown) => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null),
    [recording, setRecording] = useState(false),
    [cameraReady, setCameraReady] = useState(false),
    [takes, setTakes] = useState<
      { id: string; file: File; duration: number }[]
    >([]),
    [mobile, setMobile] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [cap, setCap] = useState(60),
    [facing, setFacing] = useState("user"),
    [shape, setShape] = useState("9:16"),
    [script, setScript] = useState(""),
    [scrolling, setScrolling] = useState(false),
    [speed, setSpeed] = useState(30);
  const video = useRef<HTMLVideoElement>(null),
    recorder = useRef<MediaRecorder | null>(null),
    chunks = useRef<Blob[]>([]),
    prompter = useRef<HTMLDivElement>(null),
    start = useRef(0),
    total = useRef(0),
    takeNumber = useRef(0);
  const mounted = useRef(true);
  const renderFrame = useRef(0);
  const capture = useRef<MediaStream | null>(null);
  useEffect(() => {
    mounted.current = true;
    setMobile(
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );
    return () => {
      mounted.current = false;
      if (recorder.current?.state === "recording") recorder.current.stop();
      cancelAnimationFrame(renderFrame.current);
      capture.current?.getVideoTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    onDirty(recording || takes.length > 0);
  }, [recording, takes.length, onDirty]);
  useEffect(
    () => () => {
      stream?.getTracks().forEach((t) => t.stop());
    },
    [stream],
  );
  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      const n = total.current + (performance.now() - start.current) / 1000;
      setElapsed(n);
      if (n >= cap && recorder.current?.state === "recording")
        recorder.current.stop();
    }, 100);
    return () => clearInterval(id);
  }, [recording, cap]);
  useEffect(() => {
    if (!scrolling) return;
    const id = setInterval(() => {
      if (prompter.current) prompter.current.scrollTop += speed / 20;
    }, 50);
    return () => clearInterval(id);
  }, [scrolling, speed]);
  async function camera(next = facing) {
    try {
      setCameraReady(false);
      stream?.getTracks().forEach((t) => t.stop());
      let timedOut = false;
      const request = navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: next,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: true,
        })
        .then((s) => {
          if (timedOut || !mounted.current) {
            s.getTracks().forEach((t) => t.stop());
            throw Error("Camera request was cancelled.");
          }
          return s;
        });
      const s = await Promise.race([
        request,
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            timedOut = true;
            return reject(
              Error(
                "Camera permission is still pending. Allow camera and microphone in your browser, then try again.",
              ),
            );
          }, 20000),
        ),
      ]);
      setStream(s);
      setFacing(next);
    } catch (e) {
      onError(e);
    }
  }
  function record() {
    if (!stream) return;
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (elapsed >= cap) return;
    const mime = ["video/webm;codecs=vp8,opus", "video/mp4"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    const source = video.current;
    if (!source || !source.videoWidth || !source.videoHeight) {
      onError(Error("Wait for the camera preview before recording."));
      return;
    }
    const [w, h] = shape.split(":").map(Number);
    const surface = document.createElement("canvas");
    surface.width = w === h ? 1080 : w > h ? 1280 : 720;
    surface.height = Math.round((surface.width * h) / w);
    const context = surface.getContext("2d")!;
    const draw = () => {
      const scale = Math.max(
        surface.width / source.videoWidth,
        surface.height / source.videoHeight,
      );
      const sw = surface.width / scale,
        sh = surface.height / scale;
      context.drawImage(
        source,
        (source.videoWidth - sw) / 2,
        (source.videoHeight - sh) / 2,
        sw,
        sh,
        0,
        0,
        surface.width,
        surface.height,
      );
      renderFrame.current = requestAnimationFrame(draw);
    };
    draw();
    const framed = surface.captureStream(24);
    stream.getAudioTracks().forEach((track) => framed.addTrack(track));
    capture.current = framed;
    const r = new MediaRecorder(framed, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    r.ondataavailable = (e) => chunks.current.push(e.data);
    r.onstop = () => {
      cancelAnimationFrame(renderFrame.current);
      framed.getVideoTracks().forEach((track) => track.stop());
      if (!mounted.current) return;
      const duration = Math.min(
        cap - total.current,
        (performance.now() - start.current) / 1000,
      );
      total.current += duration;
      setElapsed(total.current);
      setRecording(false);
      setScrolling(false);
      const ext = r.mimeType.startsWith("video/mp4") ? "mp4" : "webm";
      const take = {
        id: crypto.randomUUID(),
        duration,
        file: new File(chunks.current, `Take ${++takeNumber.current}.${ext}`, {
          type: r.mimeType,
        }),
      };
      setTakes((current) => [...current, take]);
    };
    start.current = performance.now();
    r.start();
    recorder.current = r;
    setRecording(true);
    setScrolling(true);
  }
  return (
    <main className="dashboard recorder-page">
      <div className="page-heading">
        <div>
          <h1>{uiText("Record")}</h1>
        </div>
      </div>
      <div className="recorder-grid">
        <section
          className="camera-card"
          style={
            {
              aspectRatio: shape.replace(":", " / "),
              "--record-ratio":
                Number(shape.split(":")[0]) / Number(shape.split(":")[1]),
            } as React.CSSProperties
          }
        >
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            onLoadedData={() => setCameraReady(true)}
          />
          {script && (
            <div ref={prompter} className="teleprompter">
              {script}
            </div>
          )}
          {!stream && (
            <div className="camera-empty">
              <Video size={44} />
              <Button onClick={() => void camera()}>
                {uiText("Enable camera & microphone")}
              </Button>
            </div>
          )}
          <div className="record-controls">
            <span>
              {time(elapsed)} / {time(cap)}
            </span>
            <button
              className={"record-button " + (recording ? "recording" : "")}
              disabled={
                !stream || !cameraReady || (elapsed >= cap && !recording)
              }
              onClick={record}
              aria-label={
                recording ? uiText("Stop recording") : uiText("Start recording")
              }
            >
              <svg
                className="record-timer"
                viewBox="0 0 64 64"
                aria-hidden="true"
              >
                <circle cx="32" cy="32" r="29" pathLength="1" />
                <circle
                  className="record-timer-progress"
                  cx="32"
                  cy="32"
                  r="29"
                  pathLength="1"
                  strokeDasharray={`${Math.min(1, elapsed / cap)} 1`}
                />
              </svg>
              {recording ? <Square fill="white" size={20} /> : <span />}
            </button>
            {mobile ? (
              <button
                className="flip-camera"
                aria-label={uiText("Flip camera")}
                disabled={recording}
                onClick={() =>
                  void camera(facing === "user" ? "environment" : "user")
                }
              >
                <SwitchCamera size={24} />
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
          </div>
        </section>
        <section className="settings-card">
          <label>
            {uiText("Recording shape")}
            <select
              aria-label={uiText("Recording shape")}
              value={shape}
              disabled={recording}
              onChange={(e) => setShape(e.target.value)}
            >
              <option value="9:16">{uiText("9:16 Portrait")}</option>
              <option value="1:1">{uiText("1:1 Square")}</option>
              <option value="16:9">{uiText("16:9 Landscape")}</option>
              <option value="4:5">{uiText("4:5 Portrait")}</option>
            </select>
          </label>
          <h2>{uiText("Teleprompter")}</h2>
          <textarea
            maxLength={100000}
            rows={9}
            value={script}
            onChange={(e) => setScript(e.target.value.replace(/\r\n?/g, "\n"))}
            placeholder={uiText(
              "Paste your script. It stays out of the recording.",
            )}
          />
          <Range
            label="Scroll speed"
            value={speed}
            min={5}
            max={100}
            step={1}
            resetValue={30}
            onChange={(value) => setSpeed(Math.round(value))}
          />
          <div className="button-row">
            <button onClick={() => setScrolling(!scrolling)}>
              {scrolling ? uiText("Pause") : uiText("Scroll")}
            </button>
            <button
              onClick={() => {
                if (prompter.current) prompter.current.scrollTop = 0;
              }}
            >
              {uiText("Restart")}
            </button>
          </div>
          <fieldset className="record-limits">
            <legend>{uiText("Recording limit")}</legend>
            <div role="group" aria-label={uiText("Recording limit")}>
              {[30, 60, 180, 600].map((n) => (
                <button
                  key={n}
                  disabled={recording || total.current > n}
                  aria-pressed={cap === n}
                  onClick={() => setCap(n)}
                >
                  {time(n)}
                </button>
              ))}
            </div>
          </fieldset>
          <h3>
            {takes.length} {uiText(" recorded takes")}
          </h3>
          {takes.map((take) => (
            <TakePreview
              key={take.id}
              file={take.file}
              disabled={recording}
              onRemove={() => {
                if (recording) return;
                total.current = Math.max(0, total.current - take.duration);
                setElapsed(total.current);
                setTakes((current) =>
                  current.filter((item) => item.id !== take.id),
                );
              }}
            />
          ))}
          <Button
            disabled={!takes.length || recording}
            onClick={() => {
              stream?.getTracks().forEach((t) => t.stop());
              onDone(takes.map((take) => take.file));
            }}
          >
            {uiText("Use these takes ")}
            <ArrowRight size={16} />
          </Button>
        </section>
      </div>
    </main>
  );
}
