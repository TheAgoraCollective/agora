import type { Locals } from "astro";
import type { Client } from "@libsql/client";
import AI_SYSTEM_PROMPT from "./system_protector.md?raw";

const MIN_WORD_COUNT = 250;
const MAX_WORD_COUNT = 2500;
const ALLOWED_COUNTRY = "IN";
const AI_MODEL = "@cf/mistral/mistral-7b-instruct-v0.1";

export function generateRandomString(bytesLen = 4) {
  const bytes = new Uint8Array(bytesLen);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function validateRequest(formData: FormData, headers: Headers) {
  const country = headers.get("cf-ipcountry");
  if (country !== ALLOWED_COUNTRY) {
    return new Response(
      JSON.stringify({
        error: `This service is restricted to users in ${ALLOWED_COUNTRY}.`,
      }),
      { status: 403 },
    );
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  if (!title || !content) {
    return new Response(
      JSON.stringify({ error: "Title and content are required." }),
      { status: 400 },
    );
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORD_COUNT || wordCount > MAX_WORD_COUNT) {
    return new Response(
      JSON.stringify({
        error: `Your article must be between ${MIN_WORD_COUNT} and ${MAX_WORD_COUNT} words.`,
      }),
      { status: 400 },
    );
  }

  return null;
}

export async function performAiModeration(
  title: string,
  content: string,
  locals: Locals,
) {
  let aiExplanation = "AI content check was not performed.";

  if (!locals.runtime?.env?.AI) {
    return { errorResponse: null, aiExplanation };
  }

  try {
    const userText = `Title: ${title}. Content: ${content}`;
    const { response } = await locals.runtime.env.AI.run(AI_MODEL, {
      prompt: `${AI_SYSTEM_PROMPT}\n\n<user_text>\n${userText}\n</user_text>`,
    });

    if (!response) {
      return { errorResponse: null, aiExplanation };
    }

    const lines = response
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const decision = lines[0] || "";
    aiExplanation =
      lines[1] || "Your post was flagged as inappropriate by our AI moderator.";

    if (decision.toLowerCase() === "unsafe") {
      return {
        errorResponse: new Response(JSON.stringify({ error: aiExplanation }), {
          status: 400,
        }),
        aiExplanation,
      };
    }
  } catch (e) {
    console.error("AI Moderation Error:", e);
    aiExplanation = "AI check failed to complete; post was allowed.";
  }

  return { errorResponse: null, aiExplanation };
}

export async function insertArticle(turso: Client, article: any) {
  try {
    await turso.execute({
      sql: "INSERT INTO articles (id, slug, title, content, author_id, author_display_name) VALUES (?, ?, ?, ?, ?, ?)",
      args: [
        article.id,
        article.slug,
        article.title,
        article.content,
        article.author_id,
        article.author_display_name,
      ],
    });
  } catch (err: any) {
    if (
      String(err?.message || "").includes(
        "UNIQUE constraint failed: articles.slug",
      )
    ) {
      return new Response(
        JSON.stringify({ error: "An article with this title already exists." }),
        { status: 409 },
      );
    }
    console.error("Database Insertion Error:", err);
    return new Response(
      JSON.stringify({ error: "A database error occurred." }),
      { status: 500 },
    );
  }
  return null;
}
