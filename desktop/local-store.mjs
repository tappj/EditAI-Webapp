import { DatabaseSync } from "node:sqlite";
import {
  mkdirSync,
  readFileSync,
  statSync,
  realpathSync,
  createReadStream,
  existsSync,
  unlinkSync,
} from "node:fs";
import { constants } from "node:fs";
import { copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { join, basename } from "node:path";
import { Readable } from "node:stream";
const uuid = (value) =>
  typeof value === "string" && /^[a-f0-9-]{36}$/.test(value);
export class LocalStore {
  constructor(directory, migrations) {
    this.directory = directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.database = new DatabaseSync(join(directory, "projects.sqlite"));
    this.database.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    for (const sql of migrations)
      this.database.exec(
        sql.replaceAll("CREATE TABLE `", "CREATE TABLE IF NOT EXISTS `"),
      );
    this.database.exec(
      "CREATE TABLE IF NOT EXISTS native_media (id TEXT PRIMARY KEY,path TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,managed INTEGER NOT NULL);",
    );
  }
  prepare(sql) {
    const db = this.database;
    const statement = {
      values: [],
      bind(...values) {
        this.values = values;
        return this;
      },
      run() {
        const r = db.prepare(sql).run(...this.values);
        return {
          success: true,
          meta: {
            changes: Number(r.changes),
            last_row_id: Number(r.lastInsertRowid),
          },
        };
      },
      first(column) {
        const r = db.prepare(sql).get(...this.values);
        return r ? (column ? r[column] : { ...r }) : null;
      },
      all() {
        return {
          success: true,
          results: db
            .prepare(sql)
            .all(...this.values)
            .map((r) => ({ ...r })),
        };
      },
    };
    return statement;
  }
  batch(statements) {
    this.database.exec("BEGIN");
    try {
      const result = statements.map((s) => s.run());
      this.database.exec("COMMIT");
      return result;
    } catch (e) {
      this.database.exec("ROLLBACK");
      throw e;
    }
  }
  retain(id, path, mime, managed = false) {
    if (!uuid(id) || typeof path !== "string")
      throw Error("Invalid media request.");
    const resolved = realpathSync(path),
      stat = statSync(resolved);
    if (
      !stat.isFile() ||
      stat.size > 1024 ** 3 ||
      !/^(video|audio|image)\//.test(mime)
    )
      throw Error("Choose a supported media file under 1 GB.");
    this.database
      .prepare(
        "INSERT INTO native_media VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET path=excluded.path,name=excluded.name,mime=excluded.mime,managed=excluded.managed",
      )
      .run(id, resolved, basename(resolved), mime, managed ? 1 : 0);
    return this.media(id);
  }
  async importFile(id, path, mime) {
    if (
      !uuid(id) ||
      typeof path !== "string" ||
      !/^(video|audio|image)\//.test(mime)
    )
      throw Error("Invalid media request.");
    const input = realpathSync(path);
    const stat = statSync(input);
    if (!stat.isFile() || stat.size > 1024 ** 3)
      throw Error("Choose a supported media file under 1 GB.");
    const directory = join(this.directory, "media");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const destination = join(directory, id);
    const temporary = destination + "." + crypto.randomUUID();
    try {
      await copyFile(input, temporary, constants.COPYFILE_FICLONE);
      await rename(temporary, destination);
      return this.retain(id, destination, mime, true);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  media(id) {
    if (!uuid(id)) throw Error("Invalid media ID.");
    const r = this.database
      .prepare("SELECT * FROM native_media WHERE id=?")
      .get(id);
    if (!r || !existsSync(r.path)) return null;
    return {
      native: true,
      id,
      url: "editai://app/media/" + id,
      name: r.name,
      size: statSync(r.path).size,
      type: r.mime,
    };
  }
  path(id) {
    if (!uuid(id)) throw Error("Invalid media ID.");
    const r = this.database
      .prepare("SELECT path FROM native_media WHERE id=?")
      .get(id);
    if (!r || !existsSync(r.path))
      throw Error(
        "The original file moved or is unavailable. Restore it before opening this project.",
      );
    return r.path;
  }
  async save(id, bytes, mime) {
    if (!uuid(id) || bytes.byteLength > 1024 ** 3)
      throw Error("Invalid media.");
    const directory = join(this.directory, "media");
    await mkdir(directory, { recursive: true });
    const file = join(directory, id);
    await writeFile(file, Buffer.from(bytes), { mode: 0o600 });
    return this.retain(id, file, mime, true);
  }
  remove(ids) {
    for (const id of ids) {
      if (!uuid(id)) throw Error("Invalid media ID.");
      const r = this.database
        .prepare("SELECT * FROM native_media WHERE id=?")
        .get(id);
      if (r?.managed && existsSync(r.path)) unlinkSync(r.path);
      this.database.prepare("DELETE FROM native_media WHERE id=?").run(id);
    }
  }
  response(id, request) {
    const file = this.path(id),
      info = this.media(id),
      size = info.size;
    let start = 0,
      end = size - 1,
      status = 200;
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match)
        return new Response(null, {
          status: 416,
          headers: { "content-range": `bytes */${size}` },
        });
      if (match[1]) {
        start = Number(match[1]);
        end = match[2] ? Number(match[2]) : end;
      } else {
        start = Math.max(0, size - Number(match[2]));
      }
      if (start > end || start >= size)
        return new Response(null, {
          status: 416,
          headers: { "content-range": `bytes */${size}` },
        });
      end = Math.min(end, size - 1);
      status = 206;
    }
    const headers = {
      "content-type": info.type,
      "content-length": String(end - start + 1),
      "accept-ranges": "bytes",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "sandbox; default-src 'none'",
      ...(status === 206
        ? { "content-range": `bytes ${start}-${end}/${size}` }
        : {}),
    };
    return new Response(
      request.method === "HEAD"
        ? null
        : Readable.toWeb(createReadStream(file, { start, end })),
      { status, headers },
    );
  }
}
// Local optional backup copies; this is labelled local storage in the desktop UI.
export class LocalBucket {
  constructor(directory) {
    this.directory = directory;
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  file(key) {
    if (!/^[a-f0-9]{64}\/[a-f0-9-]{36}$/.test(key))
      throw Error("Invalid backup ID.");
    return join(this.directory, key.replace("/", "-"));
  }
  async put(key, body) {
    const file = this.file(key);
    const response = new Response(body);
    await writeFile(file, Buffer.from(await response.arrayBuffer()), {
      mode: 0o600,
    });
  }
  async get(key) {
    const file = this.file(key);
    return existsSync(file)
      ? { body: Readable.toWeb(createReadStream(file)) }
      : null;
  }
  async delete(key) {
    const file = this.file(key);
    if (existsSync(file)) unlinkSync(file);
  }
}
