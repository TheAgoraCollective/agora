<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import EasyMDE from "easymde";
  import "easymde/dist/easymde.min.css";
  import { createClient } from "@supabase/supabase-js";
  import AnonymousPostModal from "./AnonymousPostModal.svelte";

  let articleTitle = "";
  let editor: EasyMDE;
  let isSubmitting = false;
  let feedbackMessage = "";
  let feedbackType: "success" | "error" = "error";
  let formLoadTime = Date.now();
  let formElement: HTMLFormElement;

  let showAnonymousModal = false;
  let modalSteps = [];
  let modalFinalMessage = "";
  let modalHasError = false;

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  onMount(() => {
    editor = new EasyMDE({
      element: document.getElementById("markdown-editor") as HTMLElement,
      spellChecker: true,
      placeholder: "Write your article here...",
      status: ["lines", "words"],
      minHeight: "420px",
    });
  });

  onDestroy(() => {
    editor?.toTextArea();
  });

  function getWordCount(mde: EasyMDE): number {
    const content = mde.value();
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(Boolean).length;
  }

  const handleSubmit = async () => {
    isSubmitting = true;
    feedbackMessage = "";
    feedbackType = "error";

    const content = editor.value();
    const title = articleTitle.trim();

    if (!title || !content.trim()) {
      feedbackMessage = "Title and content cannot be empty.";
      isSubmitting = false;
      return;
    }

    const wordCount = getWordCount(editor);
    if (wordCount < 250 || wordCount > 2500) {
      feedbackMessage = `Your article must be between 250 and 2500 words. You currently have ${wordCount} words.`;
      isSubmitting = false;
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    let endpoint = '/api/submit-anonymous';
    let headers: Record<string, string> = {};

    if (session) {
      endpoint = '/api/submit';
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    } else {
      showAnonymousModal = true;
      modalHasError = false;
      modalFinalMessage = "";
      modalSteps = [{ text: "Submitting anonymously...", status: "pending" }];
    }
    
    const formData = new FormData(formElement);
    formData.set('content', content);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: formData
    });

    const result = await response.json();

    if (response.ok) {
      if (!session) {
        modalSteps = [{ text: "Submitting anonymously...", status: "success" }];
        modalFinalMessage = "You have posted anonymously. This temporary identity cannot be recovered.";
        setTimeout(() => {
            window.location.href = `/article/${result.slug}`;
        }, 4000);
      } else {
        feedbackMessage = "Article published successfully! Redirecting...";
        feedbackType = "success";
        setTimeout(() => {
          window.location.href = `/article/${result.slug}`;
        }, 1500);
      }
    } else {
      if (!session) {
        modalSteps = [{ text: "Submitting anonymously...", status: "error" }];
        modalHasError = true;
        modalFinalMessage = result.error || "An unexpected error occurred.";
      } else {
        feedbackMessage = result.error || "An unexpected error occurred while publishing.";
      }
      isSubmitting = false;
    }
  };
</script>

<div class="max-w-4xl mx-auto">
  <AnonymousPostModal bind:show={showAnonymousModal} bind:steps={modalSteps} bind:finalMessage={modalFinalMessage} bind:hasError={modalHasError} />
  <h1 class="text-4xl font-bold mb-4">Create New Article</h1>

  <form on:submit|preventDefault={handleSubmit} bind:this={formElement}>
    <div class="hidden-field" aria-hidden="true">
      <label for="user_nickname">Nickname</label>
      <input type="text" id="user_nickname" name="user_nickname" tabindex="-1" autocomplete="off">
    </div>

    <input type="hidden" name="form_load_time" bind:value={formLoadTime} />
    
    <div class="mb-4">
      <label for="title" class="block text-xl font-medium mb-2">Title</label>
      <input
        id="title"
        name="title"
        type="text"
        class="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-gray-600 rounded"
        bind:value={articleTitle}
        placeholder="A Catchy Title for Your Post"
      />
    </div>
    
    <textarea id="markdown-editor" name="content"></textarea>

    <button
      type="submit"
      class="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:bg-gray-500 text-lg"
      disabled={isSubmitting}
    >
      {isSubmitting ? "Publishing..." : "Publish Article"}
    </button>
  </form>

  {#if feedbackMessage}
    <p class="mt-4 text-center text-lg {feedbackType === 'success' ? 'text-green-400' : 'text-red-400'}">
      {feedbackMessage}
    </p>
  {/if}
</div>

<style>
  .hidden-field {
    display: none;
  }
  :global(.EasyMDEContainer .CodeMirror) {
    position: relative;
    background-color: #111827;
    color: #d1d5db;
    border: 1px solid #4b5563;
    border-radius: 0.5rem;
    font-size: 0.95rem;
    line-height: 1.6;
  }
  :global(.EasyMDEContainer .CodeMirror-scroll) {
    background-color: #111827;
  }
  :global(.EasyMDEContainer .CodeMirror-cursor) {
    border-left-color: #d1d5db;
  }
  :global(.EasyMDEContainer .CodeMirror-selected) {
    background-color: #374151;
  }
  :global(.EasyMDEContainer .CodeMirror-focused) {
    outline: 2px solid #2563eb;
    outline-offset: 0;
  }
  :global(.editor-toolbar) {
    background-color: #1f2937;
    border-color: #4b5563 !important;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
  }
  :global(.editor-toolbar a) {
    color: #ffffff !important;
    background-color: #7f1d1d;
    border-color: #4b5563;
  }
  :global(.editor-toolbar a:hover) {
    background-color: #991b1b;
  }
  :global(.editor-toolbar a.active) {
    background-color: #064e3b;
  }
  :global(.editor-toolbar a.active:hover) {
    background-color: #065f46;
  }
  :global(.editor-toolbar i.separator) {
    border-left: 1px solid #374151;
  }
  :global(.editor-toolbar .preview) {
    display: none;
  }
  :global(.editor-preview),
  :global(.editor-preview-side) {
    background-color: #111827;
    color: #d1d5db;
  }
  :global(.EasyMDEContainer .editor-preview) {
    position: absolute;
    inset: 0;
    box-sizing: border-box;
    padding: 1rem;
    z-index: 20;
    overflow: auto;
  }
  :global(.editor-preview h1),
  :global(.editor-preview-side h1),
  :global(.editor-preview-full h1) {
    margin: 1rem 0 0.75rem;
    font-weight: 800;
    font-size: 2.25rem;
    line-height: 2.5rem;
    color: #e5e7eb;
  }
  :global(.editor-preview h2),
  :global(.editor-preview-side h2) {
    margin: 0.875rem 0 0.5rem;
    font-weight: 700;
    font-size: 1.875rem;
    line-height: 2.25rem;
    color: #e5e7eb;
  }
  :global(.editor-preview h3),
  :global(.editor-preview-side h3) {
    margin: 0.75rem 0 0.5rem;
    font-weight: 700;
    font-size: 1.5rem;
    line-height: 2rem;
    color: #e5e7eb;
  }
  :global(.editor-preview h4),
  :global(.editor-preview-side h4) {
    margin: 0.75rem 0 0.5rem;
    font-weight: 600;
    font-size: 1.25rem;
    line-height: 1.75rem;
    color: #e5e7eb;
  }
  :global(.editor-preview p),
  :global(.editor-preview-side p) {
    margin: 0.75rem 0;
  }
  :global(.EasyMDEContainer .editor-preview-side) {
    box-sizing: border-box;
    padding: 1rem;
  }
  :global(.editor-statusbar),
  :global(.editor-toolbar.fullscreen) {
    color: #9ca3af;
    background-color: #1f2937;
    border-color: #4b5563;
    border-bottom-left-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
  }
</style>
