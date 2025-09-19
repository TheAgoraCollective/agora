<script lang="ts">
  type Article = {
    id: string;
    slug: string;
    title: string;
    author_display_name: string;
    upvotes: number;
    downvotes: number;
    created_at: string;
  };

  export let articles: Article[] = [];

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
</script>

<div class="space-y-4">
  {#if articles.length === 0}
    <div class="text-center py-10">
      <h2 class="text-2xl font-bold">No Articles Yet</h2>
      <p class="text-gray-400">Be the first to contribute to the conversation.</p>
    </div>
  {:else}
    {#each articles as article}
      <div class="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex gap-4">
        <div class="flex flex-col items-center justify-start pt-2">
          <button class="text-2xl hover:text-green-400">▲</button>
          <span class="text-xl font-bold">{article.upvotes - article.downvotes}</span>
          <button class="text-2xl hover:text-red-400">▼</button>
        </div>
        <div>
          <a href={`/article/${article.slug}`} class="text-2xl font-bold hover:underline">
            {article.title}
          </a>
          <p class="text-sm text-gray-400 mt-1">
            Posted by <span class="font-medium text-gray-300">{article.author_display_name}</span>
            on {formatDate(article.created_at)}
          </p>
        </div>
      </div>
    {/each}
  {/if}
</div>
