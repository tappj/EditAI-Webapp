import { env } from "cloudflare:workers";
import { createApi } from "@/lib/server/api";
const api = createApi(env);
export const GET = api;
export const POST = api;
export const PUT = api;
export const DELETE = api;
