<template>
  <span class="spinner" :style="spinnerStyle"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  size?: number
  color?: string
}>(), {
  size: 18,
  color: ''
})

const spinnerStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderColor: props.color || 'var(--color-secondary-green)',
  borderTopColor: 'transparent'
}))
</script>

<style scoped>
.spinner {
  display: inline-block;
  border: 2px solid;
  border-radius: 50%;
  animation: spinner-spin 0.6s linear infinite;
}

@keyframes spinner-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
