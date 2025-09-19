import type { APIRoute } from 'astro';
import { createClient } from "@supabase/supabase-js";
import { turso } from "../../lib/turso";
import { slugify } from "../../lib/utils";

function generateRandomString(bytesLen = 12) {
  const bytes = new Uint8Array(bytesLen);
  (globalThis.crypto || {}).getRandomValues
    ? globalThis.crypto.getRandomValues(bytes)
    : bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!title || !content) {
    return new Response(JSON.stringify({ error: 'Title and content are required.' }), { status: 400 });
  }

  if (locals.AI) {
    try {
      const { results } = await locals.AI.run('@cf/huggingface/bert-base-multilingual-cased-finetuned-toxic-comment-classification', {
        text: `${title}. ${content}`
      });

      console.log('AI Scores:', results.map(r => `${r.label}: ${r.score.toFixed(3)}`).join(', '));
      
      const scores = results.reduce((acc, { label, score }) => ({ ...acc, [label]: score }), {});

      if (
        scores.identity_hate > 0.75 ||
        scores.threat > 0.8 ||
        scores.severe_toxic > 0.8 ||
        scores.insult > 0.85 ||
        scores.obscene > 0.9 ||
        scores.toxic > 0.95
      ) {
        return new Response(JSON.stringify({ error: 'Your post was flagged as inappropriate and could not be published.' }), { status: 400 });
      }
    } catch (e) {
      console.error("AI Moderation Error:", e);
    }
  }

  const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const randomUsername = `anonymous-${generateRandomString(4)}`;
  const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: `${randomUsername}@agora.local`,
    password: generateRandomString(16),
    user_metadata: { username: randomUsername },
  });

  if (userError || !user) {
    console.error("Anonymous user creation error:", userError);
    return new Response(JSON.stringify({ error: 'Could not create a temporary user.' }), { status: 500 });
  }

  const newArticle = {
    id: crypto.randomUUID(),
    slug: slugify(title),
    title: title.trim(),
    content,
    author_id: user.id,
    author_display_name: user.user_metadata.username,
  };

  try {
    await turso.execute({
      sql: "INSERT INTO articles (id, slug, title, content, author_id, author_display_name) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        newArticle.id,
        newArticle.slug,
        newArticle.title,
        newArticle.content,
        newArticle.author_id,
        newArticle.author_display_name,
      ],
    });
  } catch (err: any) {
    console.error(err);
    if (String(err?.message || "").includes("UNIQUE constraint failed: articles.slug")) {
      return new Response(JSON.stringify({ error: 'An article with this title already exists.' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: 'A database error occurred.' }), { status: 500 });
  }

  return new Response(JSON.stringify({ slug: newArticle.slug }), { status: 200 });
};
