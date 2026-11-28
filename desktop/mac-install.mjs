// Installation may move/relaunch the app, but downloaded installers and mounted
// images are left alone so the installed app can open without a cleanup prompt.
export async function prepareMacInstallation({
  app,
  dialog,
  platform = process.platform,
}) {
  if (platform !== "darwin" || !app.isPackaged) return true;
  if (!app.isInApplicationsFolder()) {
    const { response } = await dialog.showMessageBox({
      type: "question",
      title: "Install EditAI",
      message: "Install and open EditAI?",
      detail:
        "EditAI will move to Applications and open automatically. Your existing projects and settings stay in place.",
      buttons: ["Install and Open", "Not Now"],
      defaultId: 0,
      cancelId: 1,
    });
    if (response !== 0) return true;
    try {
      const moved = app.moveToApplicationsFolder({
        conflictHandler: (kind) =>
          dialog.showMessageBoxSync({
            type: "question",
            title: "EditAI is already installed",
            message:
              kind === "existsAndRunning"
                ? "Open your installed EditAI?"
                : "Replace the installed copy of EditAI?",
            detail: "Your projects and account settings will be kept.",
            buttons: [
              "Cancel",
              kind === "existsAndRunning" ? "Open EditAI" : "Replace and Open",
            ],
            defaultId: 1,
            cancelId: 0,
          }) === 1,
      });
      if (moved) return false; // Electron quits and relaunches the installed app.
    } catch {
      /* Permission/copy failures keep the existing install untouched. */
    }
    await dialog.showMessageBox({
      type: "info",
      title: "Finish installing EditAI",
      message: "EditAI wasn’t moved to Applications.",
      detail:
        "You can drag EditAI into Applications, then open it from there. Your projects are safe.",
      buttons: ["OK"],
    });
    return true;
  }

  return true;
}
