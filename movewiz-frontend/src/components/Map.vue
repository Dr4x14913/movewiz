<template>
  <div ref="mapContainer" class="map-container">
    <div class="map-container__map-inner"></div>
    <button
      class="map-container__fullscreen-btn"
      :title="isFullscreen ? t('common.map.fullscreenExit') : t('common.map.fullscreenEnter')"
      @click="toggleFullscreen"
    >
      <!-- Expand icon (not fullscreen) -->
      <svg v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
      <!-- Compress icon (fullscreen) -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface AdditionalMarker {
  lat: number
  lng: number
  tooltip: string
  color: string
  mode?: string
  address?: string
  phone?: string
  email?: string
  contactUrl?: string
  comments?: string
}

const { t } = useI18n()

const props = withDefaults(defineProps<{
  lat?: number
  lng?: number
  zoom?: number
  height?: string
  displayMainMarker?: boolean
  additionalMarkers?: AdditionalMarker[]
  fitMarkers?: boolean
  is_editable?: boolean
  mainMarkerLabel?: string
  mainMarkerPopup?: {
    name?: string
    date?: string
    directions?: { url: string; label: string; newTab?: boolean }
  }
}>(), {
  lat: 46.603354,
  lng: 1.888334,
  zoom: 6,
  height: '300px',
  displayMainMarker: false,
  is_editable: true,
  mainMarkerLabel: undefined,
  mainMarkerPopup: undefined,
})

const emit = defineEmits<{
  'location-selected': [data: { lat: number; lng: number; address: string }]
  'marker-clicked': [name: string],
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const isFullscreen = ref(false)
let map: L.Map | null = null
let marker: L.Marker | null = null
let additionalMarkersLayer: L.LayerGroup | null = null
let legendControl: L.Control | null = null
// Folded by default on mobile (same 600px breakpoint as the CSS media
// queries); a manual toggle is kept across legend rebuilds.
let legendCollapsed = window.matchMedia('(max-width: 600px)').matches

// Custom icon for additional markers

function getIcon(m: AdditionalMarker) {
  return L.divIcon({
    className: '',
    html: `
      <div class="map-participant-marker">
        <div class="map-participant-marker__name">${escapeHtml(m.tooltip)}</div>
        <div class="map-participant-marker__dot" style="background-color:var(${m.color})"></div>
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Popup for the main event marker: event name, date and an optional
// directions link ("Y aller").
function buildMainMarkerPopupHtml(): string {
  const p = props.mainMarkerPopup
  const rows: string[] = []
  if (p?.name)
    rows.push(`<div class="map-marker-popup__name">${escapeHtml(p.name)}</div>`)
  if (p?.date)
    rows.push(`<div class="map-marker-popup__row">${escapeHtml(p.date)}</div>`)
  if (p?.directions) {
    const d = p.directions
    const targetAttrs = d.newTab ? ' target="_blank" rel="noopener noreferrer"' : ''
    rows.push(`<a class="map-marker-popup__contact" href="${escapeHtml(d.url)}"${targetAttrs}>${escapeHtml(d.label)}</a>`)
  }
  return rows.join('')
}

function buildMarkerHtml(m: AdditionalMarker): string {
  const rows = [`<div class="map-marker-popup__name">${escapeHtml(m.tooltip)}</div>`]
  if (m.mode) {
    const modeLabel = m.mode === 'driver' ? t('eventPage.participants.driver') : t('eventPage.participants.passenger')
    const modeClass = m.mode === 'driver' ? 'map-marker-popup__mode--driver' : 'map-marker-popup__mode--passenger'
    rows.push(`<div class="map-marker-popup__mode-row"><span class="map-marker-popup__mode ${modeClass}">${escapeHtml(modeLabel)}</span></div>`)
  }
  if (m.comments)
    rows.push(`<div class="map-marker-popup__comments">${escapeHtml(m.comments)}</div>`)
  if (m.address)
    rows.push(`<div class="map-marker-popup__row">${escapeHtml(m.address)}</div>`)
  if (m.phone)
    rows.push(`<div class="map-marker-popup__row">${escapeHtml(m.phone)}</div>`)
  if (m.email)
    rows.push(`<div class="map-marker-popup__row">${escapeHtml(m.email)}</div>`)
  else if (m.contactUrl)
    rows.push(`<div class="map-marker-popup__row"><a class="map-marker-popup__contact" href="${escapeHtml(m.contactUrl)}">${escapeHtml(t('sendMessage.buttonLabel'))}</a></div>`)
  return rows.join('')
}

// Orange icon for main event marker
const orangeIcon = L.divIcon({
  className: '',
  html: '<div style="background-color:var(--color-primary-orange);width:20px;height:20px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function updateMarker(latitude: number, longitude: number) {
  if (!map) return

  if (!props.fitMarkers)
    map.setView([latitude, longitude], 13)

  if (marker) {
    marker.setLatLng([latitude, longitude])
  } else {
    marker = L.marker([latitude, longitude], { draggable: props.is_editable, icon: orangeIcon }).addTo(map)

    if (props.mainMarkerPopup)
      marker.bindPopup(buildMainMarkerPopupHtml(), { className: 'map-marker-popup' })

    marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng()
      reverseGeocode(pos.lat, pos.lng)
    })
  }
}

async function reverseGeocode(latitude: number, longitude: number) {
  let address = ''
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
    )
    if (res.ok) {
      const data = await res.json()
      address = data.display_name || ''
    }
  } catch (e) {
    console.error('Error reverse geocoding:', e)
  }
  // Always emit (empty address on geocoding failure) so the parent updates
  // lat/lng and the user can type the address manually.
  emit('location-selected', { lat: latitude, lng: longitude, address })
}

function updateLegend() {
  if (!map) return

  if (legendControl) {
    map.removeControl(legendControl)
    legendControl = null
  }

  const hasEvent = props.displayMainMarker
  const hasParticipants = props.additionalMarkers && props.additionalMarkers.length > 0

  if (!hasEvent && !hasParticipants) return

  const content = L.DomUtil.create('div', 'map-legend')
  if (legendCollapsed) content.classList.add('map-legend--collapsed')

  const header = L.DomUtil.create('div', 'map-legend__header', content)
  const title = L.DomUtil.create('span', 'map-legend__title', header)
  title.textContent = t('common.map.legend')
  const toggle = L.DomUtil.create('button', 'map-legend__toggle', header)
  toggle.type = 'button'
  toggle.setAttribute('aria-expanded', String(!legendCollapsed))
  toggle.setAttribute('aria-label', t('common.map.legendToggle'))
  toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
  toggle.addEventListener('click', () => {
    legendCollapsed = !legendCollapsed
    content.classList.toggle('map-legend--collapsed', legendCollapsed)
    toggle.setAttribute('aria-expanded', String(!legendCollapsed))
  })

  const body = L.DomUtil.create('div', 'map-legend__body', content)

  if (hasEvent) {
    const item = L.DomUtil.create('div', 'map-legend__item', body)
    const dot = L.DomUtil.create('span', 'map-legend__dot map-legend__dot--orange', item)
    item.appendChild(document.createTextNode(props.mainMarkerLabel || t('eventPage.legend.event')))
  }

  if (hasParticipants) {
    const itemDriver = L.DomUtil.create('div', 'map-legend__item', body)
    L.DomUtil.create('span', 'map-legend__dot map-legend__dot--secondary-green', itemDriver)
    itemDriver.appendChild(document.createTextNode(t('eventPage.participants.driver')))

    const itemPassenger = L.DomUtil.create('div', 'map-legend__item', body)
    L.DomUtil.create('span', 'map-legend__dot map-legend__dot--primary-green', itemPassenger)
    itemPassenger.appendChild(document.createTextNode(t('eventPage.participants.passenger')))

    const hint = L.DomUtil.create('div', 'map-legend__hint', body)
    hint.textContent = t('eventPage.participants.legendHint')
  }

  legendControl = new L.Control({ position: 'bottomright' })
  ;(legendControl as any).onAdd = () => content
  legendControl.addTo(map)
}

function updateAdditionalMarkers() {
  if (!map) return

  if (additionalMarkersLayer) {
    additionalMarkersLayer.clearLayers()
  } else {
    additionalMarkersLayer = L.layerGroup().addTo(map)
  }

  const allPoints: L.LatLngTuple[] = []

  // Include main event marker in fit bounds
  if (props.fitMarkers && props.displayMainMarker) {
    allPoints.push([props.lat, props.lng])
  }

  if (!props.additionalMarkers || props.additionalMarkers.length === 0) {
    if (props.fitMarkers && allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints)
      map.fitBounds(bounds.pad(0.1))
    }
    return
  }

  const markerLayer: L.Marker[] = []
  props.additionalMarkers.forEach((m) => {
    allPoints.push([m.lat, m.lng])
    const mk = L.marker([m.lat, m.lng], { icon: getIcon(m) })
      .bindTooltip(buildMarkerHtml(m), {
        direction: 'top',
        offset: [0, -10],
        className: 'map-marker-tooltip',
        opacity: 1,
      })
      .bindPopup(buildMarkerHtml(m), { className: 'map-marker-popup' })
      .on('click', () => {
        emit('marker-clicked', m.tooltip)
      })
    additionalMarkersLayer?.addLayer(mk)
    markerLayer.push(mk)
  })

  if (props.fitMarkers && allPoints.length > 0) {
    const bounds = L.latLngBounds(allPoints)
    map.whenReady(() => {
      map?.fitBounds(bounds.pad(0.1))
    })
  }
}

function onMapClick(e: L.LeafletMouseEvent) {
  if (props.is_editable) {
    const { lat: latitude, lng: longitude } = e.latlng
    reverseGeocode(latitude, longitude)
    updateMarker(latitude, longitude)
  }
}

function initializeMap() {
  if (!mapContainer.value) return

  const innerEl = mapContainer.value.querySelector('.map-container__map-inner') as HTMLDivElement
  if (!innerEl) return

  map = L.map(innerEl).setView([props.lat, props.lng], props.zoom)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map)
  map.on('click', onMapClick)

  if (props.displayMainMarker)
    updateMarker(props.lat, props.lng)

  updateAdditionalMarkers()
  updateLegend()
}

function cleanupMap() {
  if (map) {
    if (additionalMarkersLayer) {
      additionalMarkersLayer.clearLayers()
      additionalMarkersLayer = null
    }
    if (legendControl) {
      map.removeControl(legendControl)
      legendControl = null
    }
    map.remove()
    map = null
    marker = null
  }
}

function handleFullscreenChange() {
  const wasFullscreen = isFullscreen.value
  isFullscreen.value = !!document.fullscreenElement
  // Only trigger invalidateSize if the state actually changed
  if (wasFullscreen !== isFullscreen.value && map) {
    // Small delay to let the DOM finish transitioning
    setTimeout(() => map?.invalidateSize(), 100)
  }
}

function toggleFullscreen() {
  if (!mapContainer.value) return

  if (!document.fullscreenElement) {
    mapContainer.value.requestFullscreen().catch((err) => {
      console.error('Failed to enter fullscreen:', err)
    })
  } else {
    document.exitFullscreen().catch((err) => {
      console.error('Failed to exit fullscreen:', err)
    })
  }
}

onMounted(() => {
  initializeMap()
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  cleanupMap()
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})

watch(props, (new_val) => {
  if (new_val.displayMainMarker)
    updateMarker(props.lat, props.lng)
  updateAdditionalMarkers()
  updateLegend()
})
</script>

<style scoped>
.map-container {
  position: relative;
  margin-top: 1rem;
  border: 2px solid var(--color-secondary-green);
  border-radius: 16px;
  overflow: hidden;
}

.map-container__map-inner {
  height: v-bind(height);
  width: 100%;
}

.map-container__fullscreen-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  background-color: var(--color-bg-cream);
  border: 1px solid var(--color-secondary-green);
  border-radius: 8px;
  color: var(--color-text-dark);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.map-container__fullscreen-btn:hover {
  background-color: var(--color-primary-green);
  color: #ffffff;
  border-color: var(--color-primary-green);
  box-shadow: 0 4px 10px rgba(139, 195, 74, 0.4);
}

.map-container__fullscreen-btn:active {
  transform: scale(0.95);
}

/* Fullscreen mode: full viewport */
.map-container:fullscreen {
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  margin: 0;
  border: none;
  border-radius: 0;
}

.map-container:fullscreen .map-container__map-inner {
  height: 100%;
}

/* Firefox fullscreen vendor prefix */
.map-container:-moz-full-screen {
  width: 100vw;
  height: 100vh;
  max-height: 100vh;
  margin: 0;
  border: none;
  border-radius: 0;
}

.map-container:-moz-full-screen .map-container__map-inner {
  height: 100%;
}
</style>

<style>
.map-legend {
  background: var(--color-bg-cream);
  max-width: 200px;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
  font-family: var(--font-body);
  font-size: 0.85rem;
  color: var(--color-text-dark);
}

.map-legend__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.map-legend__title {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-medium);
}

.map-legend__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-medium);
  cursor: pointer;
  transition: color 0.2s;
}

.map-legend__toggle:hover {
  color: var(--color-text-dark);
}

.map-legend__toggle svg {
  transition: transform 0.2s ease;
}

.map-legend__toggle:hover svg {
  transform: scale(1.15);
}

.map-legend--collapsed .map-legend__toggle svg {
  transform: rotate(-90deg);
}

.map-legend--collapsed .map-legend__toggle:hover svg {
  transform: rotate(-90deg) scale(1.15);
}

.map-legend__body {
  margin-top: 0.375rem;
}

.map-legend--collapsed .map-legend__body {
  display: none;
}

.map-legend__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.map-legend__item:not(:last-child) {
  margin-bottom: 0.25rem;
}

.map-legend__dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.map-legend__dot--orange {
  background-color: var(--color-primary-orange);
}

.map-legend__dot--secondary-green {
  background-color: var(--color-secondary-green);
}

.map-legend__dot--primary-green {
  background-color: var(--color-primary-green);
}

.map-legend__hint {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-input-border);
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-text-medium);
}

.map-marker-tooltip {
  background: var(--color-bg-cream);

  border: 1px solid var(--color-secondary-green);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  color: var(--color-text-dark);
  font-family: var(--font-body);
  font-size: 0.85rem;
  line-height: 1.45;
  padding: 0.5rem 0.75rem;
  max-width: 250px;
}

.map-marker-tooltip.leaflet-tooltip-top::before {
  border-top-color: var(--color-secondary-green);
}

.map-marker-tooltip.leaflet-tooltip-bottom::before {
  border-bottom-color: var(--color-secondary-green);
}

.map-marker-popup .leaflet-popup-content-wrapper {
  background: var(--color-bg-cream);
  border: 2px solid var(--color-secondary-green);
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  color: var(--color-text-dark);
}

.map-marker-popup .leaflet-popup-content {
  margin: 0.75rem 1rem;
  font-family: var(--font-body);
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 260px;
}

.map-marker-popup .leaflet-popup-tip {
  background: var(--color-bg-cream);
  border: 1px solid var(--color-secondary-green);
}

.map-marker-popup .leaflet-popup-close-button {
  color: var(--color-text-medium);
}

.map-marker-popup__name {
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.3rem;
  color: var(--color-text-dark);
}

.map-marker-popup__mode-row {
  margin-bottom: 0.3rem;
}

.map-marker-popup__mode {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 50px;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  color: #fff;
}

.map-marker-popup__mode--driver {
  background-color: var(--color-secondary-green);
}

.map-marker-popup__mode--passenger {
  background-color: var(--color-primary-green);
}

/* Participant marker: name pill anchored above a centered dot */
.map-participant-marker {
  position: relative;
  width: 0;
  height: 0;
}

.map-participant-marker__dot {
  position: absolute;
  top: -9px;
  left: -9px;
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.4);
}

.map-participant-marker__name {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 0 8px;
  border: 1px solid var(--color-secondary-green);
  border-radius: 50px;
  background-color: var(--color-bg-cream);
  color: var(--color-text-dark);
  font-family: var(--font-heading);
  font-weight: 700;
  font-size: 0.7rem;
  line-height: 1.5;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}

.map-marker-popup__row {
  color: var(--color-text-dark);
  word-break: break-word;
}

.map-marker-popup__comments {
  color: var(--color-text-medium);
  font-style: italic;
  word-break: break-word;
  margin-bottom: 0.25rem;
}

.map-marker-popup__contact {
  display: inline-block;
  margin-top: 0.375rem;
  border: 1px solid var(--color-primary-orange);
  border-radius: 50px;
  padding: 0.15rem 0.6rem;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--color-primary-orange);
  text-decoration: none;
  transition: background-color 0.2s, color 0.2s;
}

.map-marker-popup__contact:hover {
  background-color: var(--color-primary-orange);
  color: #ffffff;
}
</style>
