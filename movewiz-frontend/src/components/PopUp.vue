<template>
  <!-- Render at the document root: a position: fixed overlay inserted deep in a
       scrolled page can be mis-anchored on mobile browsers; a direct child of
       <body> is immune to any ancestor stacking/containing-block quirks. -->
  <Teleport to="body">
    <Transition name="popup">
      <div v-if="show" class="popup-overlay" @click.self="onClose">
        <div class="popup" :class="`popup--${type}`">
          <div class="popup__icon">
            <i v-if="type === 'success'" class="fa-solid fa-circle-check" style="font-size: 2.5rem"></i>
            <i v-else-if="type === 'error'" class="fa-solid fa-circle-xmark" style="font-size: 2.5rem"></i>
            <i v-else class="fa-solid fa-info" style="font-size: 2.5rem"></i>
          </div>
          <h3 v-if="title" class="popup__title">{{ title }}</h3>
          <div class="popup__body">
            <slot>
              <p class="popup__message">{{ message }}</p>
            </slot>
          </div>
          <div v-if="$slots.actions" class="popup__actions">
            <slot name="actions" />
          </div>
          <button class="popup__close" @click="onClose" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from "vue"
const props = withDefaults(defineProps<{
  message?: string
  title?: string
  type?: 'success' | 'error' | 'info'
  show?: boolean
}>(), {
  type: 'info',
  show: true,
  message: '',
  title: ''
})

const show = ref(props.show)

function onClose(){
  show.value = false
  emit('close')
}

const emit = defineEmits<{
  'close': []
}>()
</script>

<style scoped>
/* inset (not width/height: 100%) so the edges stay pinned to the viewport on
   mobile, where the layout viewport changes size with the URL bar */
.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  /* above the sticky navbar (z-index 1100) so it gets dimmed too */
  z-index: 2000;
}

.popup {
  background: var(--color-bg-surface);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  position: relative;
  border-top: 4px solid var(--color-text-medium);
}

/* Only the content scrolls: title and action buttons stay visible */
.popup__body {
  overflow-y: auto;
  min-height: 0;
}

.popup__actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.25rem;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .popup {
    padding: 1.25rem;
    max-height: 70vh;
  }

  .popup__actions {
    flex-direction: column;
  }

  .popup__actions .btn-primary,
  .popup__actions .btn-secondary {
    width: 100%;
  }
}

.popup--success {
  border-top-color: var(--color-primary-green);
}

.popup--error {
  border-top-color: var(--color-primary-orange);
}

.popup--info {
  border-top-color: var(--color-text-medium);
}

.popup__icon {
  width: 70px;
  height: 70px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.popup--success .popup__icon {
  color: var(--color-primary-green);
  background: var(--color-hover-bg);
}

.popup--error .popup__icon {
  color: var(--color-primary-orange);
  background: var(--color-hover-bg);
}

.popup--info .popup__icon {
  color: var(--color-text-medium);
  background: var(--color-hover-bg);
}

.popup__title {
  text-align: center;
  color: var(--color-text-dark);
  font-family: var(--font-heading);
  font-size: 1.25rem;
  margin-bottom: 0.75rem;
}

.popup__message {
  text-align: center;
  color: var(--color-text-dark);
  font-family: var(--font-body);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.popup__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-medium);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.popup__close:hover {
  background: var(--color-hover-bg);
  color: var(--color-text-dark);
}

.popup__close svg {
  width: 18px;
  height: 18px;
}

.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.3s ease;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
}

.popup-enter-active .popup,
.popup-leave-active .popup {
  transition: transform 0.3s ease;
}

.popup-enter-from .popup {
  transform: scale(0.9);
}

.popup-leave-to .popup {
  transform: scale(0.95);
}
</style>
