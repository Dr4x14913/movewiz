<script setup lang="ts">
import { onUnmounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import ThemeToggle from './components/ThemeToggle.vue'
import LangToggle from './components/LangToggle.vue'

function applyTheme() {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = saved || (prefersDark ? 'dark' : 'light')
  document.documentElement.dataset.theme = theme
}
applyTheme()

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
function onSystemThemeChange() {
  if (!localStorage.getItem('theme')) applyTheme()
}
mediaQuery.addEventListener('change', onSystemThemeChange)

onUnmounted(() => {
  mediaQuery.removeEventListener('change', onSystemThemeChange)
})
</script>

<template>
  <nav class="navbar">
    <RouterLink to="/" class="navbar__brand">
      <span class="navbar__brand-move">Move</span>
      <span class="navbar__brand-wiz">Wiz</span>
    </RouterLink>
    <div class="navbar__links">
      <RouterLink to="/" exact-active-class="active">{{ $t('nav.home') }}</RouterLink>
      <RouterLink to="/about" exact-active-class="active">{{ $t('nav.about') }}</RouterLink>
      <RouterLink to="/create" exact-active-class="active">{{ $t('nav.createEvent') }}</RouterLink>
      <LangToggle />
      <ThemeToggle />
    </div>
  </nav>
  <main>
    <RouterView />
  </main>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--color-navbar-bg);
  border-bottom: 2px solid var(--color-secondary-green);
  position: sticky;
  top: 0;
  z-index: 1100;
}

.navbar__brand {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  font-weight: 800;
  text-decoration: none;
  transition: opacity 0.2s ease;
  display: flex;
  align-items: center;
}

.navbar__brand:hover {
  opacity: 0.8;
}

.navbar__brand-move {
  color: var(--color-primary-orange);
}

.navbar__brand-wiz {
  color: var(--color-primary-green);
}

.navbar__links {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.navbar__links a {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text-dark);
  text-decoration: none;
  padding: 0.5rem 1.25rem;
  border-radius: 50px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.navbar__links a:hover {
  background-color: hsla(87, 47%, 56%, 0.15);
  color: var(--color-primary-green);
}

.navbar__links a.active {
  background-color: var(--color-primary-green);
  color: #ffffff;
}

@media (max-width: 600px) {
  .navbar {
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
  }

  .navbar__brand {
    font-size: 1.4rem;
  }

  .navbar__links {
    flex-wrap: wrap;
    justify-content: center;
  }

  .navbar__links a {
    font-size: 0.85rem;
    padding: 0.35rem 0.8rem;
  }
}
</style>
