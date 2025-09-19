
<script>
  export let steps = [];
  export let finalMessage = "";
  export let show = false;
  export let hasError = false;

  const getIcon = (status) => {
    if (status === "pending") return "⏳";
    if (status === "success") return "✅";
    if (status === "error") return "❌";
    return "";
  };
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-gray-800 text-white rounded-lg shadow-lg p-8 w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6 text-center">Publishing Anonymously</h2>
      
      <ul class="space-y-4 mb-6">
        {#each steps as step}
          <li class="flex items-center">
            <span class="mr-4 text-xl">{getIcon(step.status)}</span>
            <span class:text-red-400={step.status === 'error'} class:text-green-400={step.status === 'success'}>{step.text}</span>
          </li>
        {/each}
      </ul>

      {#if finalMessage}
        <div class="mt-6 p-4 rounded-lg text-center" class:bg-yellow-900_50={!hasError} class:text-yellow-300={!hasError} class:bg-red-900_50={hasError} class:text-red-300={hasError}>
          <p class="font-bold">{hasError ? 'Error' : 'Important'}</p>
          <p>{finalMessage}</p>
          <div class="mt-4">
            {#if hasError}
              <button on:click={() => show = false} class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                Close
              </button>
            {:else}
              <a href="/signup" class="text-blue-400 hover:underline">
                Create a permanent account
              </a>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .bg-yellow-900_50 {
    background-color: rgba(113, 63, 18, 0.5);
  }
  .text-yellow-300 {
    color: #fde047;
  }
  .bg-red-900_50 {
    background-color: rgba(127, 29, 29, 0.5);
  }
  .text-red-300 {
    color: #fca5a5;
  }
  .text-red-400 {
    color: #f87171;
  }
  .text-green-400 {
    color: #4ade80;
  }
</style>
