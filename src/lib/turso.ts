import { createClient, type Client } from "@libsql/client";
import type { Locals } from "astro";

export function createTursoClient(locals: Locals): Client {
  const url = locals.runtime.env.PUBLIC_TURSO_DB_URL;
  const authToken = locals.runtime.env.PUBLIC_TURSO_DB_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DB_URL is not defined in environment variables");
  }
  if (!authToken) {
    throw new Error("TURSO_DB_AUTH_TOKEN is not defined in environment variables");
  }

  return createClient({
    url,
    authToken,
  });
}
