const { contextBridge, ipcRenderer, webUtils } = require("electron");
const call = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld("editaiDesktop", {
  platform: process.platform,
  importFile: (id, file) => {
    const path = webUtils.getPathForFile(file);
    return path
      ? call("media:retain", id, path, file.type)
      : Promise.resolve(null);
  },
  writeMedia: (id, bytes, type) => call("media:write", id, bytes, type),
  getMedia: (id) => call("media:get", id),
  deleteMedia: (ids) => call("media:delete", ids),
  extractAudio: (id, start, length) => call("video:audio", id, start, length),
  beginExport: (document, w, h, fps) =>
    call("video:begin", document, w, h, fps),
  exportFrame: (id, bytes) => call("video:frame", id, bytes),
  finishExport: (id) => call("video:finish", id),
  cancelExport: (id) => call("video:cancel", id),
  activity: () => ipcRenderer.send("activity"),
});
contextBridge.exposeInMainWorld("publikGate", {
  ready: () => call("gate:ready"),
  action: (action) => call("gate:action", action),
  onScreen: (listener) => {
    const fn = (_, screen) => listener(screen);
    ipcRenderer.on("gate:screen", fn);
    return () => ipcRenderer.removeListener("gate:screen", fn);
  },
});
