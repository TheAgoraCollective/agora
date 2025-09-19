<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let show = false;
  export let steps: { text: string; status: 'pending' | 'success' | 'error' }[] = [];
  export let finalMessage = "";
  export let finalMessageTitle = "";
  export let isError = false;
  export let successSlug = "";

  const dispatch = createEventDispatcher();

  const getIcon = (status: string) => {
    if (status === "pending") return "⏳";
    if (status === "success") return "✅";
    if (status === "error") return "❌";
    return "";
  };

  function handleClose() {
    show = false;
    dispatch('close');
  }
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300">
    <div class="bg-gray-800 text-white rounded-lg shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 scale-100">
      <h2 class="text-2xl font-bold mb-6 text-center">Publication Status</h2>
      
      <ul class="space-y-4 mb-6">
        {#each steps as step}
          <li class="flex items-center text-lg">
            <span class="mr-4 text-xl">{getIcon(step.status)}</span>
            <span class:text-red-400={step.status === 'error'} class:text-green-400={step.status === 'success'}>{step.text}</span>
          </li>
        {/each}
      </ul>

      {#if finalMessage}
        <div class="mt-6 p-4 rounded-lg text-center" class:bg-red-900/50={isError} class:text-red-300={isError} class:bg-blue-900/50={!isError} class:text-blue-200={!isError}>
          <p class="font-bold text-lg">{finalMessageTitle}</p>
          <p>{finalMessage}</p>
          <div class="mt-4">
            {#if isError}
              <button on:click={handleClose} class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                Edit & Try Again
              </button>
            {:else if successSlug}
              <a href={`/article/${successSlug}`} class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                View Your Article
              </a>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
