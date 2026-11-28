import { ApiError } from "./publik";
const table =
  "CREATE TABLE IF NOT EXISTS edit_checkpoints (owner TEXT NOT NULL, job TEXT NOT NULL, step TEXT NOT NULL, input TEXT NOT NULL, state TEXT NOT NULL, result TEXT, updated INTEGER NOT NULL, PRIMARY KEY(owner,job,step))";
export async function editJobStatus(
  db: D1Database,
  owner: string,
  job: string,
) {
  await db.prepare(table).run();
  const row = await db
    .prepare(
      "SELECT state,result,updated FROM edit_checkpoints WHERE owner=? AND job=? AND step='final'",
    )
    .bind(owner, job)
    .first<{ state: string; result: string; updated: number }>();
  if (!row) return { state: "missing" };
  if (row.state === "complete")
    return { state: "complete", result: JSON.parse(row.result) };
  return {
    state:
      row.state === "running" && Date.now() - row.updated > 240000
        ? "interrupted"
        : row.state,
  };
}
/** Every reply is scoped to its account, stable task, and exact input. Checkpoint
 * polling never initiates an inference. Only an explicit retry releases failed
 * or expired leases; completed stages are always reused. */
export async function editCheckpoint(
  db: D1Database,
  owner: string,
  job: string,
  step: string,
  input: string,
  execute: () => Promise<any>,
  retry = false,
) {
  await db.prepare(table).run();
  if (retry)
    await db
      .prepare(
        "DELETE FROM edit_checkpoints WHERE owner=? AND job=? AND step=? AND input=? AND (state='failed' OR (state='running' AND updated<?))",
      )
      .bind(owner, job, step, input, Date.now() - 240000)
      .run();
  const known = await db
    .prepare(
      "SELECT * FROM edit_checkpoints WHERE owner=? AND job=? AND step=?",
    )
    .bind(owner, job, step)
    .first<any>();
  if (known) {
    if (known.input !== input)
      throw new ApiError(
        409,
        "This saved edit belongs to a different transcript or provider.",
      );
    if (known.state === "complete") return JSON.parse(known.result);
    if (known.state === "running")
      throw new ApiError(
        409,
        "This edit is still running. Reopen this project to recover the result.",
      );
    throw new ApiError(
      504,
      "The provider did not finish this stage. Your transcript and completed stages are saved; retry explicitly.",
    );
  }
  const inserted = await db
    .prepare(
      "INSERT OR IGNORE INTO edit_checkpoints(owner,job,step,input,state,updated) VALUES(?,?,?,?,?,?)",
    )
    .bind(owner, job, step, input, "running", Date.now())
    .run();
  if (!inserted.meta.changes)
    throw new ApiError(409, "This edit is already running.");
  try {
    const result = await execute();
    await db
      .prepare(
        "UPDATE edit_checkpoints SET state='complete',result=?,updated=? WHERE owner=? AND job=? AND step=?",
      )
      .bind(JSON.stringify(result), Date.now(), owner, job, step)
      .run();
    if (step !== "final")
      await db
        .prepare(
          "UPDATE edit_checkpoints SET updated=? WHERE owner=? AND job=? AND step='final' AND state='running'",
        )
        .bind(Date.now(), owner, job)
        .run();
    return result;
  } catch (error) {
    await db
      .prepare(
        "UPDATE edit_checkpoints SET state='failed',updated=? WHERE owner=? AND job=? AND step=?",
      )
      .bind(Date.now(), owner, job, step)
      .run();
    throw error;
  }
}

export async function deleteEditJobs(db: D1Database, owner: string) {
  await db.prepare(table).run();
  await db
    .prepare("DELETE FROM edit_checkpoints WHERE owner=?")
    .bind(owner)
    .run();
}
