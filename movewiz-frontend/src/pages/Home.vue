<script setup lang="ts">
import Card from '../components/Card.vue'
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="hero">
    <h1 class="hero__title">{{ $t('hero.title') }}</h1>
    <p class="hero__tagline">{{ $t('hero.tagline') }}</p>
    <p class="hero__description">{{ $t('hero.description') }}</p>
  </section>

  <section class="features">
    <Card :title="$t('features.create.title')">
      <p>{{ $t('features.create.desc') }}</p>
      <RouterLink to="/create" class="btn-primary">{{ $t('features.create.btn') }}</RouterLink>
    </Card>
  </section>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 4rem 2rem;
  background-color: var(--color-bg-cream);
}

.hero__title {
  font-family: var(--font-heading);
  font-size: 3rem;
  font-weight: 800;
  color: var(--color-primary-green);
  margin-bottom: 1rem;
}

.hero__tagline {
  font-family: var(--font-body);
  font-size: 1.25rem;
  color: var(--color-text-medium);
  margin-bottom: 1rem;
}

.hero__description {
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--color-text-dark);
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.features {
  display: flex;
  gap: 2rem;
  justify-content: center;
  padding: 2rem;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .hero {
    padding: 2.5rem 1.5rem;
  }

  .hero__title {
    font-size: 2rem;
  }

  .hero__tagline {
    font-size: 1rem;
  }

  .features {
    gap: 1rem;
    padding: 1rem;
  }
}


</style>
