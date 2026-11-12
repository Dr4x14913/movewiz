<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

import { router } from '../router'

interface Participant {
  firstName: string
  lastName: string
  mode: string
  latitude?: number
  longitude?: number
  phoneNumber?: string
  email?: string
  showEmail?: boolean
  contactToken?: string
  address?: string
  comments?: string
}

const props = defineProps<{
  participants: Participant[],
  nameFilter?: string,
}>()

const emit = defineEmits<{
  filtered: [participants: Participant[]]
}>()

const modeFilter = ref('')
const colFilters = ref({ name: '', phone: '', email: '', address: '' })

// Tooltips for a participant's comments or address, teleported to <body>
// so they can overflow the card / table scroll area. Positioned with fixed
// coords. The comments tooltip is toggled on click; the address tooltip
// follows the cursor (shown on hover, hidden when the cursor leaves).
interface TooltipState {
  idx: number
  text: string
  top: number
  left: number
}

const TOOLTIP_MAX_WIDTH = 266 // 250px max-width + padding/border, for clamping before render

const descTooltip = ref<TooltipState | null>(null)
const descTooltipEl = ref<HTMLDivElement | null>(null)
const addrTooltip = ref<TooltipState | null>(null)
const addrTooltipEl = ref<HTMLDivElement | null>(null)

async function showCellTooltip(e: MouseEvent, text: string, idx: number, which: 'desc' | 'addr') {
  // Only one tooltip at a time
  if (which === 'desc') addrTooltip.value = null
  else descTooltip.value = null

  const state = which === 'desc' ? descTooltip : addrTooltip
  const elRef = which === 'desc' ? descTooltipEl : addrTooltipEl
  const anchor = (e.currentTarget as HTMLElement).getBoundingClientRect()
  let left = Math.min(anchor.left, window.innerWidth - TOOLTIP_MAX_WIDTH - 8)
  left = Math.max(8, left)
  state.value = { idx, text, top: anchor.bottom + 6, left }
  await nextTick()
  const el = elRef.value
  const current = state.value
  if (!el || !current || current.idx !== idx) return
  if (current.left + el.offsetWidth > window.innerWidth - 8)
    current.left = window.innerWidth - el.offsetWidth - 8
  if (current.top + el.offsetHeight > window.innerHeight - 8)
    current.top = anchor.top - el.offsetHeight - 6
}

function toggleDescTooltip(e: MouseEvent, text: string, idx: number) {
  if (descTooltip.value?.idx === idx) {
    descTooltip.value = null
    return
  }
  void showCellTooltip(e, text, idx, 'desc')
}

function openAddrTooltip(e: MouseEvent, text: string, idx: number) {
  void showCellTooltip(e, text, idx, 'addr')
}

function closeDescTooltip() {
  descTooltip.value = null
}

function closeAddrTooltip() {
  addrTooltip.value = null
}

function onViewportScrollOrResize() {
  closeDescTooltip()
  closeAddrTooltip()
}

// Clicking an address copies it to the clipboard. The green check marks the
// copied row briefly so the user gets feedback.
const copiedIdx = ref<number | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyAddress(text: string, idx: number) {
  const ok = await copyToClipboard(text)
  if (!ok) return
  copiedIdx.value = idx
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copiedIdx.value = null }, 1500)
  closeAddrTooltip()
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    throw new Error('Clipboard API unavailable')
  } catch {
    // Fallback for browsers / contexts without the async clipboard API
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, text.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

// When this table sits side by side with the event details card (event
// page), the details card acts as the height anchor: its height becomes the
// participants card's max-height, so the table fills the column or scrolls
// internally instead of making the section taller than the details card.
// Guarded to a no-op anywhere the expected sibling card is missing.
const rootEl = ref<HTMLDivElement | null>(null)
let anchorCard: HTMLElement | null = null
let anchorObserver: ResizeObserver | null = null

function syncAnchorHeight() {
  const ownCard = rootEl.value?.closest('.card')
  if (!ownCard || !anchorCard) return
  // Same flex row <=> top edges aligned (cards in different rows are
  // hundreds of px apart, a 50px tolerance also covers hover transforms)
  const sideBySide = Math.abs(ownCard.getBoundingClientRect().top - anchorCard.getBoundingClientRect().top) < 50
  ownCard.style.maxHeight = sideBySide ? `${anchorCard.offsetHeight}px` : ''
}

onMounted(() => {
  window.addEventListener('scroll', onViewportScrollOrResize, true)
  window.addEventListener('resize', onViewportScrollOrResize)

  const ownCard = rootEl.value?.closest('.card')
  anchorCard = (ownCard?.parentElement?.querySelector('.card') ?? null) as HTMLElement | null
  if (anchorCard === ownCard) anchorCard = null
  syncAnchorHeight()
  window.addEventListener('resize', syncAnchorHeight)
  if (anchorCard && typeof ResizeObserver !== 'undefined') {
    anchorObserver = new ResizeObserver(syncAnchorHeight)
    anchorObserver.observe(anchorCard)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', onViewportScrollOrResize, true)
  window.removeEventListener('resize', onViewportScrollOrResize)
  window.removeEventListener('resize', syncAnchorHeight)
  anchorObserver?.disconnect()
  anchorObserver = null
  clearTimeout(copiedTimer)
})

function matches(value: string | undefined, filter: string): boolean {
  const f = filter.trim().toLowerCase()
  if (!f) return true
  return (value ?? '').toLowerCase().includes(f)
}

const filteredParticipants = computed(() => {
  return props.participants.filter(p => {
    if (modeFilter.value !== '' && p.mode !== modeFilter.value) return false

    return matches(`${p.firstName} ${p.lastName}`, colFilters.value.name)
      && matches(p.phoneNumber, colFilters.value.phone)
      && matches(p.email, colFilters.value.email)
      && matches(p.address, colFilters.value.address)
  })
})

const hasActiveFilters = computed(() =>
  modeFilter.value !== '' ||
  Object.values(colFilters.value).some(v => v.trim() !== '')
)

function resetFilters() {
  modeFilter.value = ''
  colFilters.value = { name: '', phone: '', email: '', address: '' }
}

watch(filteredParticipants, (newval) => {
  descTooltip.value = null
  addrTooltip.value = null
  copiedIdx.value = null
  clearTimeout(copiedTimer)
  emit('filtered', newval)
}, { immediate: true })

// Marker clicks on the map (and the "Show all" button on the event page)
// are mapped onto the name column filter.
watch(() => props.nameFilter, (newVal) => colFilters.value.name = newVal ?? '')

function goSendMessage(token: string) {
  router.push({ path: '/sendMessage', query: { token } })
}
</script>

<template>
  <div ref="rootEl" class="participant-table">
    <div v-if="participants.length === 0" class="participant-table__empty">
      {{ $t('eventPage.participants.empty') }}
    </div>
    <div v-else>
      <div v-if="hasActiveFilters" class="participant-table__filters">
        <button @click="resetFilters" class="participant-table__reset" type="button">
          {{ $t('eventPage.participants.resetFilters') }}
        </button>
      </div>
      <div class="participant-table__scroll">
        <table class="participant-table__table">
        <thead>
          <tr>
            <th>{{ $t('eventPage.participants.table.name') }}</th>
            <th>{{ $t('eventPage.participants.table.mode') }}</th>
            <th>{{ $t('eventPage.participants.table.phone') }}</th>
            <th>{{ $t('eventPage.participants.table.email') }}</th>
            <th>{{ $t('eventPage.participants.table.address') }}</th>
          </tr>
          <tr class="participant-table__filter-row">
            <td><input v-model="colFilters.name" type="text" class="participant-table__col-filter" :placeholder="$t('eventPage.participants.filterPlaceholder')" :aria-label="$t('eventPage.participants.table.name')" /></td>
            <td>
              <select v-model="modeFilter" class="participant-table__col-filter" :aria-label="$t('eventPage.participants.table.mode')">
                <option value="">{{ $t('eventPage.participants.filterAll') }}</option>
                <option value="driver">{{ $t('eventPage.participants.driver') }}</option>
                <option value="passenger">{{ $t('eventPage.participants.passenger') }}</option>
              </select>
            </td>
            <td><input v-model="colFilters.phone" type="text" class="participant-table__col-filter" :placeholder="$t('eventPage.participants.filterPlaceholder')" :aria-label="$t('eventPage.participants.table.phone')" /></td>
            <td><input v-model="colFilters.email" type="text" class="participant-table__col-filter" :placeholder="$t('eventPage.participants.filterPlaceholder')" :aria-label="$t('eventPage.participants.table.email')" /></td>
            <td><input v-model="colFilters.address" type="text" class="participant-table__col-filter" :placeholder="$t('eventPage.participants.filterPlaceholder')" :aria-label="$t('eventPage.participants.table.address')" /></td>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, idx) in filteredParticipants" :key="idx">
          <td class="participant-table__name">
            <a href="#" @click.prevent="colFilters.name = `${p.firstName} ${p.lastName}`">{{ p.firstName }} {{ p.lastName }}</a>
            <span v-if="p.comments" class="participant-table__desc-wrap">
              <button
                class="participant-table__desc-btn"
                type="button"
                :title="$t('eventPage.participants.showComments')"
                :aria-label="$t('eventPage.participants.showComments')"
                :aria-expanded="descTooltip?.idx === idx"
                @click="toggleDescTooltip($event, p.comments, idx)"
                @blur="closeDescTooltip"
              >
                <i class="fa-regular fa-comment-dots" style="font-size: 1.1rem;"></i>
              </button>
            </span>
          </td>
          <td>
            <span :class="['participant-table__badge', p.mode === 'driver' ? 'participant-table__badge--driver' : 'participant-table__badge--passenger']">
              {{ p.mode === 'driver' ? $t('eventPage.participants.driver') : $t('eventPage.participants.passenger') }}
            </span>
          </td>
          <td class="participant-table__phone">
            <span v-if="p.phoneNumber">{{ p.phoneNumber }}</span>
            <span v-else class="participant-table__none">—</span>
          </td>
          <td class="participant-table__email">
            <span v-if="p.showEmail && p.email">{{ p.email }}</span>
            <span v-else>
              <button
                v-if="p.contactToken"
                @click="goSendMessage(p.contactToken)"
                class="participant-table__email-btn"
                :title="$t('sendMessage.hiddenEmailTooltip')"
                type="button"
              >{{ $t('sendMessage.buttonLabel') }}</button>
              <span v-else class="participant-table__none">—</span>
            </span>
          </td>
          <td class="participant-table__address">
            <div v-if="p.address" class="participant-table__addr-wrap">
              <span
                class="participant-table__addr-scroll"
                @mouseenter="openAddrTooltip($event, p.address, idx)"
                @mouseleave="closeAddrTooltip"
                @click="copyAddress(p.address, idx)"
              >{{ p.address }}</span>
              <i v-if="copiedIdx === idx" class="fa-solid fa-check participant-table__addr-copied" aria-hidden="true"></i>
            </div>
            <span v-else class="participant-table__none">—</span>
          </td>
        </tr>
      </tbody>
      </table>
    </div>
    </div>

    <Teleport to="body">
      <div
        v-if="descTooltip"
        ref="descTooltipEl"
        role="tooltip"
        class="participant-table__desc-tooltip"
        :style="{ top: descTooltip.top + 'px', left: descTooltip.left + 'px' }"
      >{{ descTooltip.text }}</div>
      <div
        v-if="addrTooltip"
        ref="addrTooltipEl"
        role="tooltip"
        class="participant-table__desc-tooltip"
        :style="{ top: addrTooltip.top + 'px', left: addrTooltip.left + 'px' }"
      >{{ addrTooltip.text }}</div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Fills the card's content area when the card is stretched (wide screen
   side-by-side layout), so this column matches the details column height.
   On auto-height cards (mobile) 100% resolves to content height. */
.participant-table {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
}

.participant-table__empty {
  text-align: center;
  padding: 1.5rem;
  color: var(--color-text-medium);
  font-style: italic;
}

.participant-table__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.participant-table__reset {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-primary-orange);
  border-radius: 50px;
  background: none;
  color: var(--color-primary-orange);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s, color 0.2s;
}

.participant-table__reset:hover {
  background-color: var(--color-primary-orange);
  color: white;
}

.participant-table__filter-row td {
  padding: 0.25rem 0.75rem 0.625rem;
  border-bottom: 1px solid var(--color-input-border);
}

.participant-table__col-filter {
  width: 100%;
  box-sizing: border-box;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 0.8rem;
  background-color: var(--color-bg-cream);
  color: var(--color-text-dark);
  outline: none;
  transition: border-color 0.2s;
}

.participant-table__col-filter:focus {
  border-color: var(--color-primary-green);
}

.participant-table__phone {
  white-space: nowrap;
}

/* Flex lives on a wrapper, not the <td>: a flex display on a table cell
   breaks row-height sync and border-collapse, offsetting the row lines. */
.participant-table__address {
  max-width: 240px;
}

.participant-table__addr-wrap {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.participant-table__addr-scroll {
  flex: 1;
  min-width: 0;
  display: block;
  overflow-x: auto;
  white-space: nowrap;
  cursor: copy;
}

.participant-table__addr-copied {
  flex-shrink: 0;
  color: var(--color-secondary-green);
  font-size: 0.9rem;
}

.participant-table__scroll {
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.participant-table__scroll::-webkit-scrollbar {
  height: 6px;
}

.participant-table__scroll::-webkit-scrollbar-track {
  background: var(--color-bg-cream);
}

.participant-table__scroll::-webkit-scrollbar-thumb {
  background: var(--color-secondary-green);
  border-radius: 3px;
}

.participant-table__table {
  min-width: 600px;
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.participant-table__table th {
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--color-text-medium);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 2px solid var(--color-input-border);
}

.participant-table__table td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--color-input-border);
  color: var(--color-text-dark);
  vertical-align: middle;
}

.participant-table__name {
  white-space: nowrap;
}

.participant-table__name a {
  font-weight: 600;
  color: var(--color-secondary-green);
  text-decoration: none;
  cursor: pointer;
}

.participant-table__name a:hover {
  text-decoration: underline;
}

.participant-table__desc-wrap {
  display: inline-block;
  margin-left: 0.25rem;
  vertical-align: top;
  transform: translateY(-50%);
}

.participant-table__desc-btn {
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
  transition: color 0.2s, transform 0.15s;
}

.participant-table__desc-btn:hover {
  transform: scale(1.15);
}

.participant-table__desc-btn:hover,
.participant-table__desc-btn[aria-expanded="true"] {
  color: var(--color-primary-green);
}

.participant-table__desc-tooltip {
  position: fixed;
  z-index: 3000;
  width: max-content;
  max-width: 250px;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-bg-cream);
  border: 1px solid var(--color-secondary-green);
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  font-family: var(--font-body);
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--color-text-dark);
  white-space: normal;
  word-break: break-word;
  text-align: left;
  pointer-events: none;
}

.participant-table__badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
}

.participant-table__badge--driver {
  background-color: var(--color-primary-green);
  color: white;
}

.participant-table__badge--passenger {
  background-color: var(--color-secondary-green);
  color: white;
}

.participant-table__none {
  color: var(--color-text-medium);
}

.participant-table__email-btn {
  background: none;
  border: 1px solid var(--color-primary-orange);
  border-radius: 50px;
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: var(--font-heading);
  font-weight: 600;
  color: var(--color-primary-orange);
  transition: background-color 0.2s, color 0.2s;
}

.participant-table__email-btn:hover {
  background-color: var(--color-primary-orange);
  color: white;
}

@media (max-width: 600px) {
  .participant-table__table {
    font-size: 0.8rem;
  }

  .participant-table__table th,
  .participant-table__table td {
    padding: 0.4rem 0.375rem;
  }
}
</style>
