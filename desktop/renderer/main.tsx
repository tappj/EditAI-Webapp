import { createRoot } from "react-dom/client";
import App from "../../app/page";
import "../../app/globals.css";
createRoot(document.getElementById("root")!).render(
  <App
    signedOut={new URLSearchParams(location.search).get("signed-out") === "1"}
  />,
);
for (const event of ["pointerdown", "keydown"])
  window.addEventListener(
    event,
    (e) => {
      if (e.isTrusted) window.editaiDesktop?.activity();
    },
    { passive: true },
  );
