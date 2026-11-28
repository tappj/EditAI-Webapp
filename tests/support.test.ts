import test from "node:test";
import assert from "node:assert/strict";
import { sendSupport, supportReport } from "../lib/server/support.ts";
const draft = {
  id: crypto.randomUUID(),
  title: "",
  message: "Please improve the editor",
};
test("support validates bounded text and allows an empty title", () => {
  assert.deepEqual(supportReport(draft), draft);
  for (const patch of [
    { message: " " },
    { message: "x".repeat(5001) },
    { title: "x".repeat(141) },
    { title: "title\r\nBcc: attacker" },
    { id: "not-an-id" },
  ])
    assert.throws(() => supportReport({ ...draft, ...patch }));
});
test("support sends only to the fixed inbox, with server authentication and a stable idempotency key", async () => {
  let calls = 0;
  const sender: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(init!.body as string);
    assert.deepEqual(body.to, ["editaiapp@gmail.com"]);
    assert.equal(body.subject, "EditAI support request");
    assert.equal(body.from, "EditAI <support@example.com>");
    assert.equal(
      new Headers(init!.headers).get("Idempotency-Key"),
      `support/owner/${draft.id}`,
    );
    assert.equal(
      new Headers(init!.headers).get("Authorization"),
      "Bearer fixture-key",
    );
    assert.ok(body.text.includes(draft.message));
    return Response.json({ id: "email-fixture" });
  };
  assert.deepEqual(
    await sendSupport(
      {
        RESEND_API_KEY: "fixture-key",
        SUPPORT_FROM_EMAIL: "EditAI <support@example.com>",
      },
      draft,
      "owner",
      "Fixture",
      sender,
    ),
    { ok: true },
  );
  assert.equal(calls, 1);
});
test("support never reports success for missing configuration, provider rejection or a network timeout", async () => {
  await assert.rejects(
    sendSupport({}, draft, "owner", "Fixture"),
    /temporarily unavailable/,
  );
  const config = {
    RESEND_API_KEY: "fixture-key",
    SUPPORT_FROM_EMAIL: "support@example.com",
  };
  for (const send of [
    async () => Response.json({ error: "Rejected" }, { status: 403 }),
    async () => Response.json({ ok: true }),
    async () => {
      throw Error("timeout");
    },
  ])
    await assert.rejects(
      sendSupport(config, draft, "owner", "Fixture", send as typeof fetch),
      /could not be sent/,
    );
});

test("support attachments are bounded local image bytes, never URLs or arbitrary recipients", async () => {
  const { supportImages, SUPPORT_IMAGE_BYTES } =
    await import("../lib/support-attachments.ts");
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=";
  const image = { name: "error.png", type: "image/png", content: png };
  assert.deepEqual(supportImages([image]), [image]);
  for (const images of [
    [image, image, image, image],
    [{ ...image, name: "../error.png" }],
    [{ ...image, name: "error\r\nBcc.png" }],
    [{ ...image, type: "image/svg+xml" }],
    [{ ...image, type: "image/jpeg" }],
    [{ ...image, content: "https://example.com/error.png" }],
    [{ name: "error.png", path: "file:///etc/passwd" }],
    [
      {
        ...image,
        content: Buffer.alloc(SUPPORT_IMAGE_BYTES + 1).toString("base64"),
      },
    ],
  ])
    assert.throws(() => supportReport({ ...draft, images }));
  const bytes = Buffer.alloc(SUPPORT_IMAGE_BYTES);
  Buffer.from(png, "base64").copy(bytes);
  const large = { ...image, content: bytes.toString("base64") };
  assert.throws(() => supportImages([large, large, large]), /5 MB total/);
  let sent: any;
  await sendSupport(
    {
      RESEND_API_KEY: "fixture-key",
      SUPPORT_FROM_EMAIL: "support@example.com",
    },
    supportReport({
      ...draft,
      images: [
        {
          ...image,
          path: "https://attacker.example",
          to: "attacker@example.com",
        },
      ],
    }),
    "owner",
    "Fixture",
    async (_, init) => {
      sent = JSON.parse(init!.body as string);
      return Response.json({ id: "fixture-mail" });
    },
  );
  assert.deepEqual(sent.attachments, [{ filename: "error.png", content: png }]);
  assert.deepEqual(sent.to, ["editaiapp@gmail.com"]);
});

test("reply addresses reject header injection and reach Resend Reply-To with the fixed recipient", async () => {
  for (const email of [
    "",
    "missing-at",
    "a@example.com\r\nBcc: b@example.com",
    "a@example.com,b@example.com",
    "Name <a@example.com>",
  ])
    assert.throws(() => supportReport({ ...draft, email }));
  const report = supportReport({
    ...draft,
    email: "  reply@example.com  ",
    to: "other@example.com",
  });
  assert.equal(report.email, "reply@example.com");
  let sent: any;
  await sendSupport(
    { RESEND_API_KEY: "fixture", SUPPORT_FROM_EMAIL: "support@example.com" },
    { ...report, source: "website" },
    "contact-fixture",
    "",
    async (_, init) => {
      sent = JSON.parse(init!.body as string);
      return Response.json({ id: "fixture" });
    },
  );
  assert.equal(sent.reply_to, "reply@example.com");
  assert.deepEqual(sent.to, ["editaiapp@gmail.com"]);
  assert.equal(sent.subject, "Contact EditAI");
  assert.match(sent.text, /Reply email: reply@example.com/);
  assert.match(sent.text, /Sent from the EditAI website/);
  assert.equal(sent.attachments, undefined);
});
