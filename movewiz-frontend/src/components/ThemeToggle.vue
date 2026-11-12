<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isDark = ref(false)

function syncTheme() {
  isDark.value = document.documentElement.dataset.theme === 'dark'
}

function toggleTheme() {
  const theme = isDark.value ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme
  localStorage.setItem('theme', theme)
  isDark.value = theme === 'dark'
}

function onMutation() {
  syncTheme()
}

onMounted(() => {
  syncTheme()
  document.documentElement.addEventListener('dataset.theme', onMutation)
})

onUnmounted(() => {
  document.documentElement.removeEventListener('dataset.theme', onMutation)
})
</script>

<template>
  <button class="theme-toggle" :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'" @click="toggleTheme">
    <svg v-if="!isDark" class="theme-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
    <svg v-else class="theme-toggle__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50px;
  background: transparent;
  color: var(--color-text-dark);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  margin-left: 0.5rem;
}

.theme-toggle:hover {
  background-color: var(--color-hover-bg);
  color: var(--color-primary-green);
}

.theme-toggle__icon {
  width: 22px;
  height: 22px;
}
</style>
