"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { useEffect, useRef, useState } from "react";
import {
  SUPPORT_IMAGE_BYTES,
  SUPPORT_IMAGE_TYPES,
  SUPPORT_MAX_IMAGES,
  SUPPORT_IMAGE_LIMIT_MESSAGE,
  supportImages,
  type SupportImage,
} from "@/lib/support-attachments";
import { MessageCircle, Paperclip, X } from "lucide-react";

export function SupportDialog({
  send,
  onClose,
  variant = "support",
}: {
  send: (body: unknown) => Promise<unknown>;
  onClose: () => void;
  variant?: "support" | "contact";
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    first = useRef<HTMLInputElement>(null);
  const id = useRef(crypto.randomUUID());
  const imageInput = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<SupportImage[]>([]);
  const [reading, setReading] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  async function addImages(files: File[]) {
    if (!files.length) return;
    setError("");
    setReading(true);
    try {
      if (
        images.length + files.length > SUPPORT_MAX_IMAGES ||
        files.some((file) => file.size > SUPPORT_IMAGE_BYTES)
      )
        throw Error(SUPPORT_IMAGE_LIMIT_MESSAGE);
      const added = await Promise.all(
        files.map(async (file): Promise<SupportImage> => {
          if (!SUPPORT_IMAGE_TYPES.includes(file.type as SupportImage["type"]))
            throw Error("Choose a PNG, JPEG, WebP or GIF image.");
          const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () =>
              reject(
                Error(
                  "This image could not be read. Choose a PNG, JPEG, WebP or GIF image.",
                ),
              );
            reader.readAsDataURL(file);
          });
          return {
            name: file.name,
            type: file.type as SupportImage["type"],
            content,
          };
        }),
      );
      const next = supportImages([...images, ...added]);
      setImages(next);
      id.current = crypto.randomUUID();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setReading(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  }
  const [title, setTitle] = useState(""),
    [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    first.current?.focus();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal support-dialog"
      aria-labelledby="support-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy && !reading) onClose();
      }}
    >
      <div className="support-heading">
        <h2 id="support-title">
          <MessageCircle size={20} />
          {uiText(variant === "contact" ? "Contact EditAI" : "Contact support")}
        </h2>
        <button
          className="icon-button"
          aria-label={uiText("Close support")}
          disabled={busy || reading}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {sent ? (
        <>
          <p role="status">
            {uiText("Your message has been sent to EditAI support.")}
          </p>
          <button className="button" onClick={onClose}>
            {uiText("Done")}
          </button>
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || reading || !message.trim()) return;
            setBusy(true);
            setError("");
            try {
              await send({
                id: id.current,
                title,
                message,
                ...(email.trim() ? { email: email.trim() } : {}),
                ...(variant === "contact" ? { website } : {}),
                ...(images.length ? { images } : {}),
              });
              setSent(true);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {uiText("Your email (Optional, if you want us to get back to you)")}
            <input
              ref={first}
              type="email"
              autoComplete="email"
              value={email}
              maxLength={254}
              disabled={busy || reading}
              onChange={(e) => {
                setEmail(e.target.value);
                id.current = crypto.randomUUID();
              }}
            />
          </label>
          {variant === "contact" && (
            <label className="contact-honeypot" aria-hidden="true">
              Website
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          )}
          <label>
            {uiText("Title")}
            <input
              aria-label={uiText("Title")}
              value={title}
              maxLength={140}
              disabled={busy || reading}
              onChange={(e) => {
                id.current = crypto.randomUUID();
                setTitle(e.target.value);
              }}
            />
          </label>
          <label>
            {uiText("Message")}
            <textarea
              aria-label={uiText("Message")}
              value={message}
              maxLength={5000}
              rows={6}
              disabled={busy || reading}
              placeholder={uiText(
                variant === "contact"
                  ? "Tell us what you’d like to know or share."
                  : "Tell us about a bug, issue, or request",
              )}
              onChange={(e) => {
                id.current = crypto.randomUUID();
                setMessage(e.target.value);
              }}
            />
          </label>
          {variant === "support" && (
            <div className="support-attachments">
              <input
                ref={imageInput}
                className="support-image-input"
                type="file"
                multiple
                accept={SUPPORT_IMAGE_TYPES.join(",")}
                aria-label={uiText("Attach screenshots or images")}
                disabled={busy || reading}
                onChange={(e) =>
                  void addImages(Array.from(e.target.files || []))
                }
              />
              <button
                className="button secondary support-attach-button"
                type="button"
                disabled={
                  busy || reading || images.length >= SUPPORT_MAX_IMAGES
                }
                onClick={() => imageInput.current?.click()}
              >
                <Paperclip size={15} />{" "}
                {reading ? uiText("Adding images…") : uiText("Attach images")}
              </button>
              {images.length > 0 && (
                <ul className="support-image-list">
                  {images.map((image, index) => (
                    <li key={index}>
                      <img
                        src={`data:${image.type};base64,${image.content}`}
                        alt={uiText("Attached image: {0}", { 0: image.name })}
                      />
                      <span title={image.name}>{image.name}</span>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={busy || reading}
                        aria-label={uiText("Remove image {0}", {
                          0: image.name,
                        })}
                        onClick={() => {
                          setImages((current) =>
                            current.filter((_, i) => i !== index),
                          );
                          id.current = crypto.randomUUID();
                        }}
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {error && <p role="alert">{uiText(error)}</p>}
          <button
            className="button"
            type="submit"
            disabled={busy || reading || !message.trim()}
          >
            {busy ? uiText("Sending…") : uiText("Send message")}
          </button>
        </form>
      )}
    </dialog>
  );
}
