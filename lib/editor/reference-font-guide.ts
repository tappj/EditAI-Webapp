/** A local comparison chart prevents outline weight being mistaken for font
 * weight. It is never a frame of the user's reference or a visible editor card. */
export async function referenceFontGuide() {
  await Promise.all(
    [400, 500, 600, 700].map((weight) =>
      document.fonts.load(`${weight} 48px "TikTok Sans"`),
    ),
  );
  const canvas = document.createElement("canvas");
  canvas.width = 840;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#737373";
  ctx.fillRect(0, 0, 840, 360);
  ctx.font = "15px sans-serif";
  ctx.fillStyle = "white";
  ctx.fillText("FONT WEIGHT COMPARISON — not reference footage", 18, 24);
  for (const [i, weight] of [400, 500, 600, 700].entries()) {
    const y = 72 + i * 80;
    ctx.font = "17px sans-serif";
    ctx.fillStyle = "white";
    ctx.fillText(`TikTok Sans ${weight}`, 18, y);
    ctx.font = `${weight} 48px "TikTok Sans"`;
    ctx.lineJoin = "round";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.strokeText("Aa Bright story", 265, y + 8);
    ctx.fillText("Aa Bright story", 265, y + 8);
  }
  return {
    base64JPEG: canvas.toDataURL("image/jpeg", 0.85).split(",")[1],
    timeSeconds: null,
    role: "fontGuide" as const,
  };
}
