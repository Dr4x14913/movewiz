<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  title?: string
  variant?: 'default' | 'borderless' | 'classic'
  collapsible?: boolean
  defaultExpanded?: boolean
}>(), {
  variant: 'default',
  collapsible: false,
  defaultExpanded: true,
})

const isExpanded = ref(props.defaultExpanded)
const contentRef = ref<HTMLDivElement | null>(null)
let contentHeight = 'auto'

const variantClass = computed(() => ({
  'card--borderless': props.variant === 'borderless',
  'card--classic': props.variant === 'classic',
  'card--default': props.variant === 'default',
  'card--collapsible': props.collapsible,
}))

async function setExpanded(expanded: boolean) {
  if (expanded === isExpanded.value) return

  if (!isExpanded.value && contentRef.value) {
    contentHeight = contentRef.value.scrollHeight + 'px'
    await nextTick()
  }
  isExpanded.value = expanded

  if (expanded) {
    contentHeight = 'auto'
    await nextTick()
    contentRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  } else {
    if (contentRef.value) {
      contentHeight = contentRef.value.scrollHeight + 'px'
      await nextTick()
      contentHeight = '0px'
    }
  }
}

function toggle() {
  setExpanded(!isExpanded.value)
}

watch(() => props.defaultExpanded, (val) => {
  isExpanded.value = val
})

defineExpose({ collapse: () => setExpanded(false), expand: () => setExpanded(true) })
</script>

<template>
  <div class="card" :class="variantClass">
    <h2 v-if="title" class="card__title" :class="{ 'card__title--clickable': collapsible }" @click="collapsible && toggle()">
      <span>{{ title }}</span>
      <span v-if="collapsible" class="card__toggle-icon" :class="{ 'card__toggle-icon--expanded': isExpanded }">▼</span>
    </h2>
    <div v-if="isExpanded" ref="contentRef" class="card__content" :style="collapsible ? { maxHeight: contentHeight, overflow: 'hidden' } : {}">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 500px;
  overflow: visible;
  margin-top: 0;
  position: relative;
  background-color: var(--color-card-bg);
  border: 2px solid var(--color-secondary-green);
  border-radius: 16px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.1);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  animation: cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(46, 125, 50, 0.15);
}

.card--default {
  padding: 1.5rem;
}

.card--borderless:hover {
  box-shadow: none;
}

.card--borderless {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  animation: cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.card--classic {
  border: 2px solid var(--color-secondary-green);
  border-radius: 8px;
  background-color: var(--color-card-bg);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  padding: 1.5rem;
}

.card--classic:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.12);
  border-color: var(--color-primary-green);
}

.card__title {
  font-size: 1.25rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-primary-orange);
  color: var(--color-text-dark);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card__title--clickable {
  cursor: pointer;
  user-select: none;
  transition: color 0.2s ease;
}

.card__title--clickable:hover {
  color: var(--color-primary-green);
}

.card__toggle-icon {
  display: inline-block;
  font-size: 0.7rem;
  transition: transform 0.3s ease;
  margin-left: 0.5rem;
}

.card__toggle-icon--expanded {
  transform: rotate(180deg);
}

/* flex: 1 lets the content area fill a stretched card (side-by-side
   layout); in auto-height cards it simply resolves to content height */
.card__content {
  flex: 1;
  transition: max-height 0.35s ease;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateX(-40vw);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 600px) {
  .card {
    min-width: 100%;
  }

  .card--default,
  .card--classic {
    padding: 1rem;
  }

  .card__title {
    font-size: 1.1rem;
  }

  @keyframes cardEnter {
    from {
      opacity: 0;
      transform: translateX(-20vw);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
}


</style>
