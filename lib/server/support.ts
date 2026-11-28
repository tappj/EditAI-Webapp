import { supportImages, type SupportImage } from "../support-attachments.ts";
import { ApiError } from "./publik.ts";

export type SupportReport = {
  id: string;
  title: string;
  message: string;
  email?: string;
  source?: "website";
  images?: SupportImage[];
};
export function supportReport(value: unknown): SupportReport {
  const b = value as Partial<SupportReport> | null;
  if (
    !b ||
    typeof b.id !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(b.id) ||
    typeof b.title !== "string" ||
    b.title.length > 140 ||
    /[\r\n\x00-\x1f\x7f]/.test(b.title) ||
    typeof b.message !== "string" ||
    !b.message.trim() ||
    b.message.length > 5000
  )
    throw new ApiError(
      400,
      "Enter a message up to 5,000 characters and a title up to 140 characters.",
    );
  let images: SupportImage[];
  const email = typeof b.email === "string" ? b.email.trim() : "";
  if (b.email !== undefined && !validReplyEmail(email))
    throw new ApiError(400, "Please enter a valid email address.");
  try {
    images = supportImages(b.images);
  } catch (error) {
    throw new ApiError(400, (error as Error).message);
  }
  return {
    id: b.id,
    title: b.title.trim(),
    message: b.message.trim(),
    ...(email ? { email } : {}),
    ...(images.length ? { images } : {}),
  };
}
export function validReplyEmail(email: string) {
  return (
    email.length <= 254 &&
    /^[^\s<>@,;"\\]+@[^\s<>@,;"\\]+\.[^\s<>@,;"\\]+$/.test(email)
  );
}

/** Called only after authentication/rate limits. Never accept a recipient from the client. */
export async function sendSupport(
  config: { RESEND_API_KEY?: string; SUPPORT_FROM_EMAIL?: string },
  report: SupportReport,
  owner: string,
  name: string,
  send: typeof fetch = fetch,
) {
  if (!config.RESEND_API_KEY || !config.SUPPORT_FROM_EMAIL)
    throw new ApiError(
      503,
      "Support email is temporarily unavailable. Your message is still here.",
    );
  let response: Response;
  try {
    response = await send("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `support/${owner}/${report.id}`,
      },
      body: JSON.stringify({
        from: config.SUPPORT_FROM_EMAIL,
        to: ["editaiapp@gmail.com"],
        ...(report.email ? { reply_to: report.email } : {}),
        subject:
          report.title ||
          (report.source === "website"
            ? "Contact EditAI"
            : "EditAI support request"),
        ...(report.images?.length
          ? {
              attachments: report.images.map((image) => ({
                filename: image.name,
                content: image.content,
              })),
            }
          : {}),
        text: `${report.message}\n\nReply email: ${report.email || "Not provided"}\nSent from ${report.source === "website" ? "the EditAI website" : "EditAI"}${report.source === "website" ? "" : `\nProfile: ${name || "EditAI user"}`}\nReport: ${report.id}`,
      }),
    });
  } catch {
    throw new ApiError(
      502,
      "Your report could not be sent. Your message is still here; please try again.",
    );
  }
  const body = (await response.json().catch(() => null)) as {
    id?: string;
  } | null;
  if (!response.ok || typeof body?.id !== "string" || !body.id)
    throw new ApiError(
      502,
      "Your report could not be sent. Your message is still here; please try again.",
    );
  return { ok: true };
}
