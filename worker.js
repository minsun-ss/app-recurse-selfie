import { createRequestHandler } from "@react-router/cloudflare";
import * as build from "./build/server/index.js";

export default {
  async fetch(request, env, ctx) {
    const handler = createRequestHandler(build);
    return handler(request, { env, ctx });
  },
};
