import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { turso } from "../../lib/turso";

export const POST: APIRoute = async ({ request, locals }) => {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  if (!token) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
    });
  }

  const supabase = createClient(
    locals.runtime.env.PUBLIC_SUPABASE_URL,
    locals.runtime.env.PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Authentication failed. Invalid token." }),
      { status: 401 },
    );
  }

  try {
    await turso.execute({
      sql: "DELETE FROM articles WHERE author_id = ?",
      args: [user.id],
    });
  } catch (e: any) {
    console.error("Failed to delete user's posts from Turso:", e);
    return new Response(
      JSON.stringify({
        error: "Could not delete user posts. Please try again.",
      }),
      { status: 500 },
    );
  }

  try {
    const supabaseAdmin = createClient(
      locals.runtime.env.PUBLIC_SUPABASE_URL,
      locals.runtime.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteError) {
      throw deleteError;
    }
  } catch (e: any) {
    console.error("Failed to delete user from Supabase Auth:", e);
    return new Response(
      JSON.stringify({
        error: "Could not permanently delete your account. Please try again.",
      }),
      { status: 500 },
    );
  }

  return new Response(
    JSON.stringify({
      message:
        "Account and all associated posts have been permanently deleted.",
    }),
    { status: 200 },
  );
};
