<script lang="ts">
  import { onMount } from "svelte";
  import { turso } from "../lib/turso";

  type Article = {
    id: string;
    slug: string;
    title: string;
    author_display_name: string;
    upvotes: number;
    downvotes: number;
    created_at: string;
  };

  let articles: Article[] = [];
  let isLoading = true;
  let errorMessage = "";

  onMount(async () => {
    try {
      const result = await turso.execute({
        sql: "SELECT id, slug, title, author_display_name, upvotes, downvotes, created_at FROM articles ORDER BY created_at DESC",
        args: [],
      });

      articles = result.rows.map((row) => ({
        id: row.id as string,
        slug: row.slug as string,
        title: row.title as string,
        author_display_name: row.author_display_name as string,
        upvotes: row.upvotes as number,
        downvotes: row.downvotes as number,
        created_at: row.created_at as string,
      }));

    } catch (error) {
      console.error(error);
      errorMessage = "Failed to load articles. Please try again later.";
    } finally {
      isLoading = false;
    }
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }
</script>

<div class="space-y-4">
  {#if isLoading}
    <p class="text-center text-gray-400">Loading articles...</p>
  {:else if errorMessage}
    <p class="text-center text-red-400">{errorMessage}</p>
  {:else if articles.length === 0}
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
