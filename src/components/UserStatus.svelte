<script>
  import { createClient } from "@supabase/supabase-js";
  import { onMount } from "svelte";

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let user = null;
  let displayName = "";
  let menuOpen = false;
  let busy = false;
  let containerEl;
  let tursoClient = null;

  const getDisplayName = (u) =>
    u?.user_metadata?.username ||
    u?.user_metadata?.display_name ||
    (u?.email ? u.email.split("@")[0] : "Account");

  function initThemeFromStorage() {
    try {
      const t = localStorage.getItem("theme");
      const root = document.documentElement;
      if (t === "light") root.classList.remove("dark");
      else if (t === "dark") root.classList.add("dark");
    } catch {}
  }

  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
    menuOpen = false;
  }

  function handleOutside(e) {
    if (menuOpen && containerEl && !containerEl.contains(e.target)) {
      menuOpen = false;
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  async function ensureTurso() {
    if (tursoClient) return tursoClient;
    const mod = await import("../lib/turso");
    tursoClient = mod.turso;
    return tursoClient;
  }

  async function handleSignOut() {
    busy = true;
    await supabase.auth.signOut();
    busy = false;
    window.location.href = "/";
  }

  async function deleteAllPosts() {
    if (!user) return;
    if (
      !confirm(
        "Delete all your posts permanently? This cannot be undone."
      )
    )
      return;
    busy = true;
    try {
      const db = await ensureTurso();
      await db.execute({
        sql: "DELETE FROM articles WHERE author_id = ?",
        args: [user.id],
      });
      alert("All your posts have been deleted.");
    } catch (e) {
      console.error(e);
      alert("Failed to delete posts.");
    } finally {
      busy = false;
      menuOpen = false;
    }
  }

  function generateRandomString(bytesLen = 64) {
    const bytes = new Uint8Array(bytesLen);
    (globalThis.crypto || {}).getRandomValues
      ? globalThis.crypto.getRandomValues(bytes)
      : bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function deleteAccount() {
    if (!user) return;
    if (
      !confirm(
        "This will delete all your posts and revoke access to your account. Continue?"
      )
    )
      return;
    busy = true;
    try {
      const db = await ensureTurso();
      await db.execute({
        sql: "DELETE FROM articles WHERE author_id = ?",
        args: [user.id],
      });
      const newPassword = generateRandomString(20);
      const newEmail = `${getDisplayName()}@agora.deleted`;
      const response = await supabase.auth.updateUser({
        email: newEmail,
        password: newPassword,
        data: {
          account_deleted: true,
          deleted_at: new Date().toISOString(),
        },
      });
      console.log(response);
      await supabase.auth.signOut();
      alert("Account deleted and posts deleted.");
      // window.location.href = "/";
      return;
    } catch (e) {
      console.error(e);
      alert("Failed to delete account.");
    } finally {
      busy = false;
      menuOpen = false;
    }
  }

  onMount(() => {
    initThemeFromStorage();
    supabase.auth.getSession().then(({ data: { session } }) => {
      user = session?.user ?? null;
      if (user) displayName = getDisplayName(user);
    });
    supabase.auth.onAuthStateChange((_, session) => {
      user = session?.user ?? null;
      displayName = user ? getDisplayName(user) : "";
    });
    const clickHandler = handleOutside;
    document.addEventListener("click", clickHandler, true);
    return () => {
      document.removeEventListener("click", clickHandler, true);
    };
  });
</script>

<div class="flex items-center gap-4">
  <a href="/write" class="hover:underline text-blue-400">Write Article</a>
  {#if user}
    <div class="relative" bind:this={containerEl}>
      <button
        on:click={toggleMenu}
        class="flex items-center gap-2 rounded-full border border-gray-700 px-3 py-1 bg-gray-800 hover:bg-gray-700 focus:outline-none"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span
          class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold"
        >
          {displayName?.[0]?.toUpperCase() || "A"}
        </span>
        <span class="font-medium">{displayName}</span>
      </button>
      {#if menuOpen}
        <div
          class="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50"
          role="menu"
        >
          <ul class="py-1">
            <li>
              <button
                class="w-full text-left px-4 py-2 hover:bg-gray-700"
                on:click={toggleTheme}
              >
                Toggle Light/Dark Mode
              </button>
            </li>
            <li>
              <button
                class="w-full text-left px-4 py-2 hover:bg-gray-700"
                on:click={handleSignOut}
                disabled={busy}
              >
                Sign Out
              </button>
            </li>
            <li>
              <button
                class="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400"
                on:click={deleteAllPosts}
                disabled={busy}
              >
                Delete All Posts
              </button>
            </li>
            <li>
              <button
                class="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-500 font-semibold"
                on:click={deleteAccount}
                disabled={busy}
              >
                Delete Account
              </button>
            </li>
          </ul>
        </div>
      {/if}
    </div>
  {:else}
    <a href="/signin" class="hover:underline">Sign In</a>
    <a href="/signup" class="hover:underline">Sign Up</a>
  {/if}
</div>
