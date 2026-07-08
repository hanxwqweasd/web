// Instrumentation hook - runs when Next.js server starts
export async function register() {
  console.log("[INSTRUMENTATION] Server started, NEXT_RUNTIME =", process.env.NEXT_RUNTIME);
}