import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../../app/components/ui";
import {
  StudioAccount,
  StudioOnboarding,
} from "../../app/components/StudioOnboarding";
import type { GateScreen } from "../publik";
import "../../app/globals.css";

declare global {
  interface Window {
    publikGate: {
      ready(): Promise<GateScreen | null>;
      action(action: string): Promise<void>;
      onScreen(listener: (screen: GateScreen) => void): () => void;
    };
  }
}

function DesktopGate() {
  const [screen, setScreen] = useState<GateScreen | null>(null);
  const [error, setError] = useState("");
  const [dark] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("editai-preferences") || "{}").theme ===
        "dark"
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let disposed = false;
    let received = false;
    const unsubscribe = window.publikGate.onScreen((next) => {
      received = true;
      setError("");
      setScreen(next);
    });
    window.publikGate.ready().then(
      (initial) => {
        if (!received && !disposed) setScreen(initial);
      },
      () => {
        if (!disposed) setError("EditAI couldn’t load the sign-in screen.");
      },
    );
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  function act(action: string) {
    setError("");
    void window.publikGate.action(action).catch(() => {
      setError("Couldn’t open Publik. Try again.");
    });
  }

  const account = (
    <StudioAccount
      title={screen?.title || "Opening your studio…"}
      signIn={screen?.id === "sign_in"}
      onGoogle={() => act("sign_in")}
    >
      {screen && screen.id !== "sign_in" && <p>{screen.body}</p>}
      {screen?.note && <p role="status">{screen.note}</p>}
      {error && <p role="alert">{error}</p>}
      {screen?.buttons.map((button, index) => (
        <Button
          key={button.action}
          secondary={screen.id === "sign_in" || index > 0}
          onClick={() => act(button.action)}
        >
          {button.label}
        </Button>
      ))}
    </StudioAccount>
  );

  return (
    <main
      className="onboarding-theme desktop-onboarding"
      data-onboarding-theme={dark ? "dark" : "light"}
    >
      {!screen || screen.id === "choose" ? (
        account
      ) : (
        <StudioOnboarding>{account}</StudioOnboarding>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<DesktopGate />);
