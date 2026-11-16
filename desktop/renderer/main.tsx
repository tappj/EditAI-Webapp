import { createRoot } from "react-dom/client";
import App from "../../app/page";
import "../../app/globals.css";
createRoot(document.getElementById("root")!).render(<App />);
for (const event of ["pointerdown", "keydown"])
  window.addEventListener(
    event,
    (e) => {
      if (e.isTrusted) window.editaiDesktop?.activity();
    },
    { passive: true },
  );
