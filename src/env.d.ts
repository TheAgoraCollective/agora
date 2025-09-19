/// <reference types="astro/client" />

type Runtime = import("@cloudflare/workers-types").Runtime;

declare namespace App {
  interface Locals extends Runtime {
    // Add other properties to locals if needed
  }
}
