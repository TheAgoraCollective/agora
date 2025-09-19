<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import EasyMDE from "easymde";
  import "easymde/dist/easymde.min.css";
  import { createClient, type User } from "@supabase/supabase-js";
  import { turso } from "../lib/turso";
  import { slugify } from "../lib/utils";
  import AnonymousPostModal from "./AnonymousPostModal.svelte";

  let articleTitle = "";
  let editor: EasyMDE;
  let isSubmitting = false;
  let feedbackMessage = "";
  let feedbackType: "success" | "error" = "error";

  let showAnonymousModal = false;
  let modalSteps = [];
  let modalFinalMessage = "";
  let modalHasError = false;

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let toolbarElement: Element | null = null;
  let onToolbarClick: EventListener | null = null;

  const applyPreviewClasses = (() => {
    let rafId = 0;
    return () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        document
          .querySelectorAll(".editor-preview, .editor-preview-side")
          .forEach((el) =>
            el.classList.add("prose", "prose-invert", "max-w-none")
          );
      });
    };
  })();

  onMount(() => {
    editor = new EasyMDE({
      element: document.getElementById("markdown-editor") as HTMLElement,
      spellChecker: true,
      placeholder: "Write your anonymous article here...",
      status: ["lines", "words"],
      minHeight: "420px",
      previewClass: ["prose", "prose-invert", "max-w-none"],
      sideBySideFullscreen: false,
      autoDownloadFontAwesome: true,
    });

    applyPreviewClasses();
    toolbarElement = document.querySelector(".editor-toolbar");
    onToolbarClick = () => applyPreviewClasses();
    toolbarElement?.addEventListener("click", onToolbarClick, {
      passive: true,
    });
  });

  onDestroy(() => {
    if (toolbarElement && onToolbarClick) {
      toolbarElement.removeEventListener("click", onToolbarClick);
    }
    editor?.toTextArea();
  });

  function generateRandomString(bytesLen = 12) {
    const bytes = new Uint8Array(bytesLen);
    (globalThis.crypto || {}).getRandomValues
      ? globalThis.crypto.getRandomValues(bytes)
      : bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  const publishArticle = async (
    user: User,
    title: string,
    content: string
  ) => {
    const newArticle = {
      id: crypto.randomUUID(),
      slug: slugify(title),
      title: title.trim(),
      content,
      author_id: user.id,
      author_display_name:
        user.user_metadata.username || `anonymous-${generateRandomString(4)}`,
    };

    try {
      await turso.execute({
        sql:
          "INSERT INTO articles (id, slug, title, content, author_id, author_display_name) VALUES (?, ?, ?, ?, ?, ?)",
        args: [
          newArticle.id,
          newArticle.slug,
          newArticle.title,
          newArticle.content,
          newArticle.author_id,
          newArticle.author_display_name,
        ],
      });
      return newArticle;
    } catch (err: any) {
      console.error("Database (Turso) Error:", err);
      if (String(err?.message || "").includes("UNIQUE constraint failed: articles.slug")) {
        throw new Error("slug-exists");
      }
      throw new Error("db-error");
    }
  };

  const handleAnonymousSubmit = async (title: string, content: string) => {
    showAnonymousModal = true;
    modalHasError = false;
    modalFinalMessage = "";

    const updateStep = (index: number, status: 'pending' | 'success' | 'error') => {
      modalSteps = modalSteps.map((step, i) =>
        i === index ? { ...step, status } : step
      );
    };

    modalSteps = [{ text: "Generating anonymous identity...", status: "pending" }];
    const randomUsername = `anonymous-${generateRandomString(6)}`;
    const randomPassword = generateRandomString(16);
    await new Promise((res) => setTimeout(res, 300));
    updateStep(0, "success");

    let user: User;
    modalSteps = [
      ...modalSteps,
      { text: "Creating secure session...", status: "pending" },
    ];
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: `${randomUsername}@agora.local`,
        password: randomPassword,
        options: { data: { username: randomUsername } },
      });

      console.log("Supabase signUp response:", { data, signUpError });

      if (signUpError || !data.user) throw signUpError;
      user = data.user;
      updateStep(1, "success");
    } catch (error) {
      console.error("Authentication (Supabase) Error:", error);
      updateStep(1, "error");
      modalHasError = true;
      modalFinalMessage = "Could not create a secure session. The server might be busy. Please try again in a moment.";
      isSubmitting = false;
      return;
    }

    modalSteps = [
      ...modalSteps,
      { text: "Publishing article...", status: "pending" },
    ];
    try {
      const newArticle = await publishArticle(user, title, content);
      updateStep(2, "success");
      modalFinalMessage =
        "You have posted anonymously. This account is temporary and cannot be recovered. To post under the same name, please sign up.";
      
      setTimeout(() => {
        window.location.href = `/article/${newArticle.slug}`;
      }, 4000);

    } catch (error: any) {
      updateStep(2, "error");
      modalHasError = true;
      if (error.message === "slug-exists") {
        modalFinalMessage = "An article with this title already exists. Please choose a different title.";
      } else {
        modalFinalMessage = "Could not save the article to the database. Please try again in a moment.";
      }
      isSubmitting = false;
    }
  };

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

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      handleAnonymousSubmit(title, content);
      return;
    }

    try {
      const newArticle = await publishArticle(session.user, title, content);
      feedbackMessage = "Article published successfully! Redirecting...";
      feedbackType = "success";

      setTimeout(() => {
        window.location.href = `/article/${newArticle.slug}`;
      }, 1500);
    } catch (err: any) {
      if (err.message === "slug-exists") {
        feedbackMessage = "An article with this title already exists. Please choose a different title.";
      } else {
        feedbackMessage = "An unexpected error occurred while publishing. Please try again.";
      }
      isSubmitting = false;
    }
  };
</script>

<div class="max-w-4xl mx-auto">
  <AnonymousPostModal bind:show={showAnonymousModal} bind:steps={modalSteps} bind:finalMessage={modalFinalMessage} bind:hasError={modalHasError} />

  <h1 class="text-4xl font-bold mb-4">Create New Article</h1>

  <form on:submit|preventDefault={handleSubmit}>
    <div class="mb-4">
      <label for="title" class="block text-xl font-medium mb-2">Title</label>
      <input
        id="title"
        type="text"
        class="w-full p-2 bg-gray-100 dark:bg-gray-800 border border-gray-600 rounded"
        bind:value={articleTitle}
        placeholder="A Catchy Title for Your Post"
      />
    </div>

    <textarea id="markdown-editor"></textarea>

    <button
      type="submit"
      class="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:bg-gray-500 text-lg"
      disabled={isSubmitting}
    >
      {isSubmitting ? "Publishing..." : "Publish Article"}
    </button>
  </form>

  {#if feedbackMessage}
    <p
      class="mt-4 text-center text-lg {feedbackType === 'success'
        ? 'text-green-400'
        : 'text-red-400'}"
    >
      {feedbackMessage}
    </p>
  {/if}
</div>

<style>
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
