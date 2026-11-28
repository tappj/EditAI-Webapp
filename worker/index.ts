import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const worker = {
  fetch(
    request: Request,
    env: Cloudflare.Env,
    ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>,
  ) {
    // Local development never contributes owner/test engagement telemetry.
    if (import.meta.env.DEV) {
      const headers = new Headers(request.headers);
      headers.set("dnt", "1");
      request = new Request(request, { headers });
    }
    const url = new URL(request.url);
    if (url.hostname === "editai-web.givingarmadillo8.chatgpt.site") {
      url.hostname = "editai.it.com";
      return Response.redirect(url, 308);
    }

    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt)
            return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return {
              status: "request_context_expired",
              message: "This request has expired. Please try again.",
            };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const pending = runWithConnectorBinding(binding, () =>
      handler.fetch(request, env, ctx),
    );
    if (url.pathname.startsWith("/api/ai/"))
      ctx.waitUntil(
        Promise.resolve(pending).then(
          () => {},
          () => {},
        ),
      );
    return pending;
  },
};

export default worker;
