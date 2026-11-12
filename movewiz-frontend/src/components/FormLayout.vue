import Spinner from './Spinner.vue'

<script setup lang="ts">
const props = withDefaults(defineProps<{
  submitting?: boolean
  noSubmitBtn?: boolean
  submitLabel?: string
}>(), {
  submitting: false,
  noSubmitBtn: false,
  submitLabel: undefined
})

defineEmits<{
  submit: []
}>()
</script>

<template>
  <div class="form-layout__wrapper">
    <div v-if="submitting" class="form-layout__spinner-overlay">
      <slot name="spinner">
        <Spinner :size="48" />
      </slot>
    </div>
    <form
      @submit.prevent="$emit('submit')"
      class="form-layout__form"
      :class="{ 'form-layout__form--disabled': submitting }"
    >
      <slot />
      <div class="form-layout__actions">
        <slot name="actions">
          <button v-if="!noSubmitBtn" type="submit" class="btn-primary" :disabled="submitting">
            {{ submitLabel ?? $t('registerParticipant.submit') }}
          </button>
        </slot>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form-layout__wrapper {
  position: relative;
}

.form-layout__spinner-overlay {
  position: absolute;
  inset: 0;
  background: rgba(253, 252, 245, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: inherit;
}

/* stretch (not flex-start) so cards sharing a row (e.g. event page
   details + participants) get the same height */
.form-layout__form {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: stretch;
}

.form-layout__form--disabled {
  pointer-events: none;
  opacity: 0.5;
}

.form-layout__actions {
  text-align: center;
  padding-top: 0.5rem;
  animation: formLayoutFadeIn 0.6s ease-out 0.2s both;
}

.form-layout__actions .btn-primary {
  min-width: 400px;
  position: relative;
  overflow: hidden;
}

.form-layout__actions .btn-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.2) 50%, transparent 70%);
  transform: translateX(-100%);
  transition: transform 0.5s ease;
}

.form-layout__actions .btn-primary:hover::after {
  transform: translateX(100%);
}

@keyframes formLayoutFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 600px) {
  .form-layout__actions .btn-primary {
    min-width: auto;
    width: 100%;
  }
}
</style>
