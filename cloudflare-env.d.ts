declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PUBLIK_APP_TOKEN?: string;
    SESSION_ENCRYPTION_KEY?: string;
  }
}
