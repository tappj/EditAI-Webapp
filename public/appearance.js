// Apply saved appearance before any application surface is painted.
try {
  const preference = JSON.parse(localStorage.getItem("editai-preferences") || "{}");
  document.documentElement.dataset.theme =
    preference.theme === "dark" ||
    (preference.theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark" : "light";
} catch {
  document.documentElement.dataset.theme =
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
