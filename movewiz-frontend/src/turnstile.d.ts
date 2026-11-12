export {}

declare global {
  /** Cloudflare Turnstile API, injected by challenges.cloudflare.com/turnstile/v0/api.js */
  interface Window {
    turnstile?: {
      render(container: HTMLElement, options: Record<string, unknown>): number
      remove(id: number): void
      reset(id?: number): void
      getResponse(id?: number): string
    }
  }
}
