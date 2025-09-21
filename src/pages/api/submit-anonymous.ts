import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createTursoClient } from "../../lib/turso";
import { slugify } from "../../lib/utils";
import {
  generateRandomString,
  validateRequest,
  performAiModeration,
  insertArticle,
} from "../../lib/submit_helpers";

const MIN_FORM_SUBMIT_TIME_MS = 3000;

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();

  const honeypot = formData.get("user_nickname") as string;
  if (honeypot) {
    return new Response(null, { status: 204 });
  }

  const formLoadTime = formData.get("form_load_time") as string;
  if (
    formLoadTime &&
    Date.now() - parseInt(formLoadTime, 10) < MIN_FORM_SUBMIT_TIME_MS
  ) {
    return new Response(null, { status: 204 });
  }

  const validationError = validateRequest(formData, request.headers);
  if (validationError) {
    return validationError;
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

  const supabaseAdmin = createClient(
    locals.runtime.env.PUBLIC_SUPABASE_URL,
    locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const randomUsername = `anonymous-${generateRandomString(4)}`;
  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.admin.createUser({
    email: `${randomUsername}@agora.local`,
    password: generateRandomString(16),
    user_metadata: { username: randomUsername },
  });

  if (userError || !user) {
    console.error("Anonymous user creation failed:", userError);
    return new Response(
      JSON.stringify({ error: "Could not create a temporary user." }),
      { status: 500 },
    );
  }

  const newArticle = {
    id: crypto.randomUUID(),
    slug: slugify(title),
    title: title.trim(),
    content,
    author_id: user.id,
    author_display_name: user.user_metadata.username,
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
