<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import EasyMDE from "easymde";
  import "easymde/dist/easymde.min.css";
  import { createClient } from "@supabase/supabase-js";
  import SubmissionStatusModal from "./SubmissionStatusModal.svelte";

  let articleTitle = "";
  let editor: EasyMDE;
  let isSubmitting = false;
  let formLoadTime = Date.now();
  let formElement: HTMLFormElement;

  let showModal = false;
  let modalSteps: { text: string; status: 'pending' | 'success' | 'error' }[] = [];
  let modalFinalMessage = "";
  let modalFinalMessageTitle = "";
  let modalIsError = false;
  let modalSuccessSlug = "";

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

  function resetModal() {
    showModal = false;
    modalSteps = [];
    modalFinalMessage = "";
    modalFinalMessageTitle = "";
    modalIsError = false;
    modalSuccessSlug = "";
  }

  const handleSubmit = async () => {
    isSubmitting = true;
    resetModal();
    showModal = true;
    modalSteps = [{ text: "Validating post...", status: "pending" }];

    const content = editor.value();
    const title = articleTitle.trim();

    if (!title || !content.trim()) {
      modalSteps = [{ text: "Validation failed", status: "error" }];
      modalFinalMessageTitle = "Error";
      modalFinalMessage = "Title and content cannot be empty.";
      modalIsError = true;
      isSubmitting = false;
      return;
    }

    const wordCount = getWordCount(editor);
    if (wordCount < 250 || wordCount > 2500) {
      modalSteps = [{ text: "Validation failed", status: "error" }];
      modalFinalMessageTitle = "Error";
      modalFinalMessage = `Your article must be between 250 and 2500 words. You currently have ${wordCount} words.`;
      modalIsError = true;
      isSubmitting = false;
      return;
    }

    modalSteps = [
      { text: "Validation complete", status: "success" },
      { text: "AI content check in progress (this may take a moment)...", status: "pending" }
    ];

    const { data: { session } } = await supabase.auth.getSession();
    
    let endpoint = '/api/submit-anonymous';
    let headers: Record<string, string> = {};
    if (session) {
      endpoint = '/api/submit';
      headers['Authorization'] = `Bearer ${session.accessToken}`;
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
      modalSteps = [
        { text: "Validation complete", status: "success" },
        { text: "AI content check passed", status: "success" },
        { text: "Article published successfully!", status: "success" }
      ];
      modalFinalMessageTitle = "Success!";
      if (!session) {
        modalFinalMessage = "You have posted anonymously. This temporary identity cannot be recovered.";
      } else {
        modalFinalMessage = "Your article is now live.";
      }
      modalSuccessSlug = result.slug;
      
      setTimeout(() => {
        if (modalSuccessSlug) {
          window.location.href = `/article/${modalSuccessSlug}`;
        }
      }, 4000);

    } else {
      modalSteps = [
        { text: "Validation complete", status: "success" },
        { text: "AI content check failed", status: "error" }
      ];
      modalFinalMessageTitle = "Submission Blocked";
      modalFinalMessage = result.error || "An unexpected error occurred while publishing.";
      modalIsError = true;
      isSubmitting = false;
    }
  };
</script>

<div class="max-w-4xl mx-auto">
  <SubmissionStatusModal 
    bind:show={showModal} 
    steps={modalSteps} 
    finalMessage={modalFinalMessage}
    finalMessageTitle={modalFinalMessageTitle}
    isError={modalIsError}
    successSlug={modalSuccessSlug}
    on:close={() => { isSubmitting = false; }}
  />
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

    <div class="mt-4 p-3 rounded-lg bg-blue-900/50 text-blue-200 text-sm text-center">
      <strong>Note:</strong> All submissions are checked by an AI for harmful content. This may add a few seconds to the publishing time.
    </div>

    <button
      type="submit"
      class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:bg-gray-500 text-lg"
      disabled={isSubmitting}
    >
      {isSubmitting ? "Processing..." : "Publish Article"}
    </button>
  </form>
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
