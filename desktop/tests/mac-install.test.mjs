import test from "node:test";
import assert from "node:assert/strict";
import { prepareMacInstallation } from "../mac-install.mjs";

function fixture() {
  const calls = [];
  return {
    calls,
    platform: "darwin",
    app: {
      isPackaged: true,
      isInApplicationsFolder: () => true,
      moveToApplicationsFolder: () => {
        calls.push("move");
        return true;
      },
    },
    dialog: {
      showMessageBox: async (options) => {
        calls.push(options.message);
        return { response: 0 };
      },
      showMessageBoxSync: () => 0,
    },
  };
}

test("first and subsequent installed launches proceed without any installer prompt", async () => {
  const deps = fixture();
  // No version marker, disk discovery, shell or filesystem access is needed.
  for (let launch = 0; launch < 2; launch++)
    assert.equal(await prepareMacInstallation(deps), true);
  assert.deepEqual(deps.calls, []);
});

test("successful Applications move relaunches without a cleanup dialog", async () => {
  const deps = fixture();
  deps.app.isInApplicationsFolder = () => false;
  assert.equal(await prepareMacInstallation(deps), false);
  assert.deepEqual(deps.calls, ["Install and open EditAI?", "move"]);
});

test("declining installation opens the current app without touching the installer", async () => {
  const deps = fixture();
  deps.app.isInApplicationsFolder = () => false;
  deps.dialog.showMessageBox = async () => ({ response: 1 });
  assert.equal(await prepareMacInstallation(deps), true);
  assert.deepEqual(deps.calls, []);
});

test("failed or refused Applications moves retain manual installation guidance", async () => {
  for (const throws of [false, true]) {
    const deps = fixture();
    deps.app.isInApplicationsFolder = () => false;
    deps.app.moveToApplicationsFolder = () => {
      if (throws) throw Error("Copy failed");
      return false;
    };
    assert.equal(await prepareMacInstallation(deps), true);
    assert.deepEqual(deps.calls, [
      "Install and open EditAI?",
      "EditAI wasn’t moved to Applications.",
    ]);
  }
});

test("replacing an existing app still requires the selected confirmation", async () => {
  for (const kind of ["existsAndRunning", "exists"]) {
    for (const response of [0, 1]) {
      const deps = fixture();
      deps.app.isInApplicationsFolder = () => false;
      deps.dialog.showMessageBoxSync = (options) => {
        assert.match(options.message, /installed/);
        return response;
      };
      deps.app.moveToApplicationsFolder = ({ conflictHandler }) => {
        assert.equal(conflictHandler(kind), response === 1);
        return response === 1;
      };
      assert.equal(await prepareMacInstallation(deps), response === 0);
    }
  }
});

test("development and other platforms proceed without installation prompts", async () => {
  for (const platform of ["linux", "win32", "darwin"]) {
    const deps = fixture();
    deps.platform = platform;
    if (platform === "darwin") deps.app.isPackaged = false;
    deps.app.isInApplicationsFolder = () => {
      throw Error("No installation work expected");
    };
    assert.equal(await prepareMacInstallation(deps), true);
    assert.deepEqual(deps.calls, []);
  }
});
