import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button, Wordmark } from "../../app/components/ui";
import { EditAIMascot } from "../../app/components/EditAIMascot";
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

  if (!screen && !error)
    return (
      <main className="native-studio-opening">
        <section className="studio-loading" role="status" aria-live="polite">
          <EditAIMascot size={124} greeting interactive={false} />
          <h2>Opening your studio…</h2>
        </section>
      </main>
    );

  const account = (
    <StudioAccount
      title={screen?.title || "Opening your studio…"}
      signIn={screen?.id === "sign_in"}
    >
      {!screen && !error && (
        <span role="status" aria-label="Loading">
          <EditAIMascot working size={100} />
        </span>
      )}
      {screen && screen.id !== "sign_in" && <p>{screen.body}</p>}
      {screen?.note && <p role="status">{screen.note}</p>}
      {error && <p role="alert">{error}</p>}
      {screen?.buttons.map((button, index) => (
        <Button
          key={button.action}
          secondary={index > 0}
          onClick={() => act(button.action)}
        >
          {button.label}
        </Button>
      ))}
    </StudioAccount>
  );

  return (
    <main className="desktop-onboarding">
      <div className="desktop-onboarding-content">
        <Wordmark />
        {!screen || screen.id === "choose" ? (
          account
        ) : (
          <StudioOnboarding>{account}</StudioOnboarding>
        )}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<DesktopGate />);
