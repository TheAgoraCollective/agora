<script>
  import { createClient } from "@supabase/supabase-js";
  import { onMount } from "svelte";

  export let mode = "signup";

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let username = "";
  let password = "";
  let loading = false;
  let message = "";

  // Start as true to prevent interaction before the check completes
  let isBlocked = true;
  let blockMessage = "Verifying location...";
  onMount(async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error('Could not verify location.');
      }
      const data = await response.json();
      
      if (data.country_code === 'IN') {
        isBlocked = false;
        blockMessage = "";
      } else {
        blockMessage = "Access is restricted to users within India.";
      }
    } catch (error) {
      blockMessage = "Could not verify your location. Please disable ad-blockers or try again.";
    }
  });

  const handleSignUp = async () => {
    if (!username || !password) {
      message = "Username and password are required.";
      return;
    }
    loading = true;
    message = "";

    const fakeEmail = `${username}@agora.local`;

    const { data, error } = await supabase.auth.signUp({
      email: fakeEmail,
      password: password,
      options: {
        data: {
          username: username,
        }
      }
    });

    if (error) {
      message = error.message;
    } else {
      message = "Account created successfully! Redirecting...";
      
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  };

  const handleSignIn = async () => {
    if (!username || !password) {
      message = "Username and password are required.";
      return;
    }
    loading = true;
    message = "";

    // We use the fake email trick to sign in
    const fakeEmail = `${username}@agora.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: fakeEmail,
      password: password,
      options: {
        data: {
          username: username,
        }
      }
    });

    if (error) {
      message = error.message;
    } else {
      message = "Signed in successfully! Redirecting...";
      window.location.href = "/";
    }
    loading = false;
  };

  const handleSubmit = () => {
    if (mode === 'signup') {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };
</script>

<div class="max-w-md mx-auto mt-10 p-8 border border-gray-300 dark:border-gray-700 rounded-lg">
  {#if isBlocked}
    <div class="text-center p-4 bg-red-900/50 rounded-lg">
      <h1 class="text-2xl font-bold mb-2">Access Restricted</h1>
      <p>{blockMessage}</p>
    </div>
  {:else}
    <h1 class="text-3xl font-bold mb-6 text-center">
      {#if mode === 'signup'}
        Create Your Anonymous Account
      {:else}
        Sign In to Agora
      {/if}
    </h1>
    <form on:submit|preventDefault={handleSubmit}>
      <div class="mb-4">
        <label for="username" class="block mb-2">Username</label>
        <input 
          type="text" 
          id="username" 
          class="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded" 
          bind:value={username}
        />
      </div>
      <div class="mb-6">
        <label for="password" class="block mb-2">Password</label>
        <input 
          type="password" 
          id="password" 
          class="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded" 
          bind:value={password}
        />
      </div>
      {#if mode === 'signup'}
          <div class="mb-4 p-3 rounded-lg bg-yellow-900/50 text-yellow-300 text-sm text-center">
            <strong>Warning:</strong> There is no password recovery. If you forget your password, you will permanently lose access to this account.
          </div>
      {/if}
      <button 
        type="submit" 
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
        disabled={loading}
      >
        {loading ? 'Processing...' : (mode === 'signup' ? 'Sign Up' : 'Sign In')}
      </button>
    </form>
  
    {#if message}
      <p class="mt-4 text-center text-red-400">{message}</p>
    {/if}
  
    <p class="mt-6 text-center text-sm">
      {#if mode === 'signup'}
        Already have an account? <a href="/signin" class="text-blue-400 hover:underline">Sign In</a>
      {:else}
        Need an account? <a href="/signup" class="text-blue-400 hover:underline">Sign Up</a>
      {/if}
    </p>
  {/if}
</div>
