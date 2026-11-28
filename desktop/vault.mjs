import { safeStorage } from "electron";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
export async function readVault(file) {
  try {
    const encoded = JSON.parse(await readFile(file, "utf8"));
    if (encoded.format !== "editai-vault-v1")
      throw Error("Unsupported credential storage.");
    if (!(await safeStorage.isAsyncEncryptionAvailable()))
      throw Error("OS credential storage is unavailable.");
    const decrypted = await safeStorage.decryptStringAsync(
      Buffer.from(encoded.payload, "base64"),
    );
    return JSON.parse(decrypted.result);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw Error(
      "Secure credentials could not be unlocked. Check Keychain access and restart EditAI.",
    );
  }
}
export async function writeVault(file, value) {
  if (
    !(await safeStorage.isAsyncEncryptionAvailable()) ||
    (process.platform === "linux" &&
      safeStorage.getSelectedStorageBackend() === "basic_text")
  )
    throw Error("OS-protected credential storage is unavailable.");
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const bytes = await safeStorage.encryptStringAsync(JSON.stringify(value));
  const temporary = file + ".tmp";
  await writeFile(
    temporary,
    JSON.stringify({
      format: "editai-vault-v1",
      payload: bytes.toString("base64"),
    }),
    { mode: 0o600 },
  );
  await rename(temporary, file);
}
