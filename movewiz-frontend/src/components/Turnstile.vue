<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  sitekey: string
}>()

const emit = defineEmits<{
  (e: 'token', token: string): void
}>()

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

const container = ref<HTMLElement | null>(null)
const widgetId = ref<number | null>(null)

function loadTurnstile(): Promise<NonNullable<Window['turnstile']>> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile)
      return
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = TURNSTILE_SRC
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => {
      if (window.turnstile) resolve(window.turnstile)
      else reject(new Error('Turnstile API did not initialise'))
    }, { once: true })
    script.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')), { once: true })
  })
}

onMounted(async () => {
  if (!container.value || !props.sitekey) return
  try {
    const turnstile = await loadTurnstile()
    widgetId.value = turnstile.render(container.value, {
      sitekey: props.sitekey,
      callback: (token: string) => emit('token', token),
      'error': () => console.error('Turnstile widget error'),
      'expired': () => turnstile.reset(widgetId.value ?? undefined),
    })
  } catch (e) {
    console.error('Could not load Cloudflare Turnstile:', e)
  }
})

onBeforeUnmount(() => {
  if (widgetId.value !== null && window.turnstile) {
    window.turnstile.remove(widgetId.value)
  }
})

/** Token issued by the widget (empty until solved). */
function getResponse(): string {
  if (widgetId.value === null || !window.turnstile) return ''
  return window.turnstile.getResponse(widgetId.value)
}

/** Tokens are single-use: call this after every submit attempt. */
function reset() {
  if (widgetId.value !== null && window.turnstile) {
    window.turnstile.reset(widgetId.value)
  }
}

defineExpose({ getResponse, reset })
</script>

<template>
  <div ref="container" class="turnstile"></div>
</template>

<style scoped>
.turnstile {
  display: flex;
  justify-content: center;
  margin-top: 0.25rem;
}
</style>
