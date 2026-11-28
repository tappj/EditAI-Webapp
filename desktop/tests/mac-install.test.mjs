import test from "node:test";
import assert from "node:assert/strict";
import {
  installerCandidates,
  prepareMacInstallation,
} from "../mac-install.mjs";

const image = {
  path: "/Users/test/Downloads/EditAI-0.2.3-mac-arm64.dmg",
  mount: "/Volumes/EditAI 0.2.3-arm64",
};
function fixture(overrides = {}) {
  const calls = [];
  const app = {
    isPackaged: true,
    isInApplicationsFolder: () => true,
    getVersion: () => "0.2.3",
    getPath: () => "/tmp/editai-install-test",
    moveToApplicationsFolder: () => {
      calls.push("move");
      return true;
    },
  };
  return {
    calls,
    app,
    platform: "darwin",
    dialog: {
      showMessageBox: async () => ({ response: 0, checkboxChecked: false }),
      showMessageBoxSync: () => 0,
    },
    shell: { trashItem: async (path) => calls.push(["trash", path]) },
    discover: async () => image,
    run: async (...args) => calls.push(args),
    read: async () => {
      throw Error("No marker");
    },
    write: async () => calls.push("marker"),
    ensureDirectory: async () => {},
    ...overrides,
  };
}

test("installer cleanup candidates exclude other apps, URLs and invalid mounts", () => {
  const source = (path, mount) => ({
    "image-path": path,
    "system-entities": [{ "mount-point": mount }],
  });
  assert.deepEqual(
    installerCandidates({
      images: [
        source(image.path, image.mount),
        source("/tmp/Other.dmg", "/Volumes/Other"),
        source("https://example.com/EditAI.dmg", image.mount),
        source(image.path, "/Applications"),
        source(image.path, "/Volumes/../Applications"),
      ],
    }),
    [image],
  );
});

test("successful Applications move relaunches before provider/editor startup", async () => {
  const deps = fixture();
  deps.app.isInApplicationsFolder = () => false;
  deps.discover = async () => {
    throw Error("Must not clean up running disk image");
  };
  assert.equal(await prepareMacInstallation(deps), false);
  assert.deepEqual(deps.calls, ["move"]);
});

test("cancelled installation leaves files alone and allows the current app", async () => {
  const deps = fixture();
  deps.app.isInApplicationsFolder = () => false;
  deps.dialog.showMessageBox = async () => ({ response: 1 });
  assert.equal(await prepareMacInstallation(deps), true);
  assert.deepEqual(deps.calls, []);
});

test("cleanup ejects the matched image and trashes only on explicit selection", async () => {
  for (const trash of [false, true]) {
    const deps = fixture();
    deps.dialog.showMessageBox = async () => ({
      response: 0,
      checkboxChecked: trash,
    });
    assert.equal(await prepareMacInstallation(deps), true);
    assert.deepEqual(deps.calls, [
      ["/usr/bin/hdiutil", ["detach", image.mount]],
      ...(trash ? [["trash", image.path]] : []),
      "marker",
    ]);
  }
});

test("busy or changed disk never causes the download to be trashed", async () => {
  for (const changed of [false, true]) {
    const deps = fixture();
    let attempts = 0;
    deps.discover = async () => (++attempts > 1 && changed ? null : image);
    deps.run = async () => {
      throw Error("Disk in use");
    };
    deps.dialog.showMessageBox = async () => ({
      response: 0,
      checkboxChecked: true,
    });
    assert.equal(await prepareMacInstallation(deps), true);
    assert.deepEqual(deps.calls, ["marker"]);
  }
});

test("declining cleanup, completed installs and development builds leave disks alone", async () => {
  const declined = fixture();
  declined.dialog.showMessageBox = async () => ({
    response: 1,
    checkboxChecked: true,
  });
  await prepareMacInstallation(declined);
  assert.deepEqual(declined.calls, ["marker"]);
  const completed = fixture({ read: async () => '{"version":"0.2.3"}' });
  completed.discover = async () => {
    throw Error("Unexpected discovery");
  };
  await prepareMacInstallation(completed);
  assert.deepEqual(completed.calls, []);
  for (const platform of ["linux", "win32"]) {
    const deps = fixture({ platform });
    await prepareMacInstallation(deps);
    assert.deepEqual(deps.calls, []);
  }
  const dev = fixture();
  dev.app.isPackaged = false;
  await prepareMacInstallation(dev);
  assert.deepEqual(dev.calls, []);
});
