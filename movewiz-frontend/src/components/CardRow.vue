<template>
  <div class="card-row">
    <slot />
  </div>
</template>

<style scoped>
/* Horizontal card group: cards share a row and wrap on small screens.
   flex: 0 0 100% makes the group take the whole row so the cards stretch
   to full page width and the submit button always wraps below. */
.card-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
  flex: 0 0 100%;
}
</style>
