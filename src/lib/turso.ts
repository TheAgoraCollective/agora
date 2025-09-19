import { createClient } from "@libsql/client";

const dbUrl = import.meta.env.PUBLIC_TURSO_DB_URL;
const dbAuthToken = import.meta.env.PUBLIC_TURSO_DB_AUTH_TOKEN;

export const turso = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});
