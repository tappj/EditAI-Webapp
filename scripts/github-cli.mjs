import { execFileSync } from "node:child_process";
// Reuse the user's authorized Git credential helper when gh has no login.
// Never log helper output or persist a token in a file or repository config.
export function github(args) {
  const env = { ...process.env };
  if (!env.GH_TOKEN && !env.GITHUB_TOKEN) {
    try {
      const response = execFileSync("git", ["credential", "fill"], {
        input: "protocol=https\nhost=github.com\n\n",
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const password = response
        .split("\n")
        .find((line) => line.startsWith("password="))
        ?.slice(9);
      if (password) env.GH_TOKEN = password;
    } catch {
      throw Error(
        "GitHub authorization is unavailable in the local credential helper.",
      );
    }
  }
  return execFileSync("gh", args, {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
