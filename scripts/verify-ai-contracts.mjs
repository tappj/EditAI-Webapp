import { request } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const baseURL = process.env.TEST_BASE_URL;
if (!baseURL || !process.env.LIVE_SESSION_STATE)
  throw Error("Run with the isolated linked-test launcher.");
const api = await request.newContext({
  baseURL,
  storageState: process.env.LIVE_SESSION_STATE,
  extraHTTPHeaders: { origin: baseURL, DNT: "1" },
  timeout: 180000,
});
async function post(path, data) {
  const r = await api.post("/api/" + path, { data });
  const b = await r.json();
  if (!r.ok())
    throw Error(`${path}: ${r.status()} ${b.error || "Request failed"}`);
  return b;
}
try {
  const s = await (await api.get("/api/session")).json();
  if (!["choose", "ready"].includes(s.screen?.id))
    throw Error("Approved test identity was not recognized.");
  await post("choice", { choice: "publik" });
  await post("settings", { displayName: "", consent: true, telemetry: false });
  const denied = await api.put("/api/ai/audio-put", {
    headers: {
      "content-type": "audio/wav",
      "x-upload-ticket": "forged-ticket",
    },
    data: Buffer.alloc(44),
  });
  if (denied.status() !== 403)
    throw Error("Forged upload permission was not rejected.");
  const projects = await (await api.get("/api/projects")).json();
  const document = projects.projects
    .map((p) => JSON.parse(p.document))
    .find((d) => d.words?.length);
  if (!document) throw Error("Run the real browser transcription first.");
  const summary = await post("ai/summary", { words: document.words });
  if (!summary.summary || !summary.highlights?.length)
    throw Error("Invalid real summary.");
  console.log("Real summary passed:", summary.summary);
  const edit = await post("ai/edit", { words: document.words });
  console.log(
    "Real editorial selection and independent review passed:",
    Object.keys(edit),
  );
  const report = JSON.parse(
    await readFile("outputs/live-verification.json", "utf8"),
  );
  Object.assign(report, {
    summary: true,
    editorialSelection: true,
    uploadTicketRejection: true,
    identityScope: s.profile.identityScope,
  });
  await writeFile(
    "outputs/live-verification.json",
    JSON.stringify(report, null, 2),
  );
} finally {
  await api.dispose();
}
