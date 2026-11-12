<script setup lang="ts">
import { ref, computed } from 'vue'
import Spinner from './Spinner.vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  label?: string
  placeholder?: string
  required?: boolean
  inputId?: string
}>(), {
  modelValue: '',
  label: 'Address',
  placeholder: 'Start typing an address...',
  required: false,
  inputId: 'address'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'location-selected': [data: { address: string; lat: number; lng: number }]
}>()

const suggestions = ref<Array<{ display_name: string; lat: string; lon: string }>>([])
const showSuggestions = ref(false)
const searchLoading = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

async function fetchAddressSuggestions(query: string) {
  if (!query || query.length < 2) {
    suggestions.value = []
    return
  }

  searchLoading.value = true
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=fr&viewbox=-5,40,10,55&bounded=0`
    )
    const data = await res.json()
    suggestions.value = data
    showSuggestions.value = true
  } catch (e) {
    console.error('Error fetching suggestions:', e)
  } finally {
    searchLoading.value = false
  }
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit('update:modelValue', value)

  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  searchTimeout = setTimeout(() => {
    fetchAddressSuggestions(value)
  }, 300)
}

function onFocus() {
  if (suggestions.value.length > 0) {
    showSuggestions.value = true
  }
}

function selectSuggestion(item: { display_name: string; lat: string; lon: string }) {
  const address = item.display_name
  showSuggestions.value = false
  suggestions.value = []
  emit('update:modelValue', address)
  emit('location-selected', {
    address,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon)
  })
}

function closeSuggestions() {
  showSuggestions.value = false
}

defineExpose({ closeSuggestions })
</script>

<template>
  <div class="address-input">
    <label :for="inputId">
      {{ label }}<span v-if="props.required" class="form__required"> *</span>
    </label>
    <div class="address-input__wrapper">
      <input
        :id="inputId"
        type="text"
        :value="modelValue"
        @input="onInput"
        @focus="onFocus"
        @blur="showSuggestions = false"
        @click.stop
        :required="props.required"
        :placeholder="placeholder"
        style="min-width: 80%"
      />
      <div v-if="searchLoading" class="address-input__spinner">
        <Spinner :size="16" />
      </div>

      <ul
        v-if="showSuggestions && suggestions.length > 0"
        class="address-input__suggestions"
        @click.stop
      >
        <li
          v-for="(suggestion, index) in suggestions"
          :key="index"
          @mousedown="selectSuggestion(suggestion)"
        >
          {{ suggestion.display_name }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.address-input {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.address-input label {
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text-dark);
}

.address-input__wrapper {
  position: relative;
}

.address-input__spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.address-input__suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 9999;
  list-style: none;
  margin: 0.25rem 0 0 0;
  padding: 0;
  background: var(--color-card-bg);
  border: 2px solid var(--color-secondary-green);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.15);
  max-height: 250px;
  overflow-y: auto;
}

.address-input__suggestions li {
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-text-dark);
  border-bottom: 1px solid var(--color-input-border);
  transition: background-color 0.2s ease;
}

.address-input__suggestions li:last-child {
  border-bottom: none;
}

.address-input__suggestions li:hover {
  background-color: hsla(87, 47%, 56%, 0.15);
}
</style>
