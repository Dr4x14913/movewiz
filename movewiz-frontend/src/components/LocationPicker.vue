<script setup lang="ts">
import { ref } from 'vue'
import AddressInput from './AddressInput.vue'
import Map from './Map.vue'

const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  required?: boolean
  height?: string
  defaultLat?: number
  defaultLng?: number
  zoom?: number
  mainMarkerLabel?: string
}>(), {
  label: 'Address',
  placeholder: 'Start typing an address...',
  required: false,
  height: '300px',
  defaultLat: 46.603354,
  defaultLng: 1.888334,
  zoom: 6,
  mainMarkerLabel: null,
})

const emit = defineEmits<{
  'location-selected': [data: { address: string; lat: number; lng: number }]
}>()

const address = ref('')
const lat = ref(props.defaultLat)
const lng = ref(props.defaultLng)
const hasMarker = ref(false)

function onAddressSelected(data: { address: string; lat: number; lng: number }) {
  address.value = data.address
  lat.value = data.lat
  lng.value = data.lng
  hasMarker.value = true
  emit('location-selected', { address: data.address, lat: data.lat, lng: data.lng })
}

function onMapSelected(data: { lat: number; lng: number; address: string }) {
  lat.value = data.lat
  lng.value = data.lng
  address.value = data.address
  hasMarker.value = true
  emit('location-selected', { address: data.address, lat: data.lat, lng: data.lng })
}

function setAddress(addr: string, la: number, ln: number) {
  address.value = addr
  lat.value = la
  lng.value = ln
  hasMarker.value = true
}

function getLocation() {
  return {
    address: address.value,
    lat: lat.value,
    lng: lng.value
  }
}

function resetLocation() {
  address.value = ''
  lat.value = props.defaultLat
  lng.value = props.defaultLng
  hasMarker.value = false
}

function hasLocation() {
  return hasMarker.value
}

defineExpose({ getLocation, setAddress, resetLocation, hasLocation })
</script>

<template>
  <div class="location-picker">
    <AddressInput
      v-model="address"
      @location-selected="onAddressSelected"
      :label="label"
      :placeholder="placeholder"
      :required="props.required"
    />
    <Map
      :lat="lat"
      :lng="lng"
      :displayMainMarker="hasMarker"
      :height="height"
      :mainMarkerLabel="props.mainMarkerLabel"
      @location-selected="onMapSelected"
    />
  </div>
</template>


<style scoped>
.location-picker {
  display: flex;
  flex-direction: column;
}
</style>
