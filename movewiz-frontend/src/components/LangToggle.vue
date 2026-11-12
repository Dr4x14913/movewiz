<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'

const { locale } = useI18n()

function switchLocale(l: string) {
  setLocale(l)
}
</script>

<template>
  <div class="lang-toggle">
    <button class="lang-toggle__btn" :class="{ 'lang-toggle__btn--active': locale === 'fr' }" @click="switchLocale('fr')">FR</button>
    <span class="lang-toggle__sep">|</span>
    <button class="lang-toggle__btn" :class="{ 'lang-toggle__btn--active': locale === 'en' }" @click="switchLocale('en')">EN</button>
  </div>
</template>

<style scoped>
.lang-toggle {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-left: 0.5rem;
}

.lang-toggle__btn {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.85rem;
  background: none;
  border: none;
  color: var(--color-text-medium);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.lang-toggle__btn:hover {
  background-color: var(--color-hover-bg);
  color: var(--color-primary-green);
}

.lang-toggle__btn--active {
  color: var(--color-primary-green);
}

.lang-toggle__sep {
  color: var(--color-text-medium);
  opacity: 0.4;
}
</style>
