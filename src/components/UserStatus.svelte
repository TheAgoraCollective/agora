html
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

  async function handleSignOut() {
    busy = true;
    await supabase.auth.signOut();
    busy = false;
    window.location.href = "/";
  }

  async function deleteAccount() {
    if (!user) return;
    if (
      !confirm(
        "This will permanently delete your account and all of your posts. This action cannot be undone. Continue?"
      )
    )
      return;
    
    busy = true;
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Could not get user session. Please sign in again.");
      }

      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'An unknown error occurred.');
      }

      alert("Your account has been successfully deleted.");
      await supabase.auth.signOut();
      window.location.href = "/";

    } catch (e) {
      console.error(e);
      alert(`Failed to delete account: ${e.message}`);
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
                class="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-500 font-semibold"
                on:click={deleteAccount}
                disabled={busy}
              >
                Delete Account Permanently
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
