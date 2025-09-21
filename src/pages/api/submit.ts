import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createTursoClient } from "../../lib/turso";
import { slugify } from "../../lib/utils";
import {
  generateRandomString,
  validateRequest,
  performAiModeration,
  insertArticle,
} from "../../lib/submit_helpers.ts";

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const validationError = validateRequest(formData, request.headers);
  if (validationError) {
    return validationError;
  }

  const token = request.headers.get("Authorization")?.split(" ")[1];
  const supabase = createClient(
    locals.runtime.env.PUBLIC_SUPABASE_URL,
    locals.runtime.env.PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Authentication failed. Please sign in again." }),
      { status: 401 },
    );
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  const { errorResponse, aiExplanation } = await performAiModeration(
    title,
    content,
    locals,
  );
  if (errorResponse) {
    return errorResponse;
  }

  const newArticle = {
    id: crypto.randomUUID(),
    slug: slugify(title),
    title: title.trim(),
    content,
    author_id: user.id,
    author_display_name:
      user.user_metadata.username || `anonymous-${generateRandomString()}`,
  };

  const turso = createTursoClient(locals);
  const dbError = await insertArticle(turso, newArticle);
  if (dbError) {
    return dbError;
  }

  return new Response(
    JSON.stringify({ slug: newArticle.slug, aiExplanation }),
    { status: 200 },
  );
};
