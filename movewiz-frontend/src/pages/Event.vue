<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { router } from '../router.ts'
import { api } from '../api'
import Card from '../components/Card.vue'
import Map from '../components/Map.vue'
import RegisterParticipant from '../components/RegisterParticipant.vue'
import FormLayout from '../components/FormLayout.vue'
import ParticipantTable from '../components/ParticipantTable.vue'

const { locale, t } = useI18n()

interface EventData {
  id: number
  eventName: string
  firstName: string
  lastName: string
  email: string
  datePicker: string
  address: string
  latitude: number
  longitude: number
  comments?: string
}

interface ParticipantData {
  latitude?: number
  longitude?: number
  firstName: string
  lastName: string
  mode: string
  phoneNumber?: string
  email?: string
  showEmail?: boolean
  contactToken?: string
  address?: string
  comments?: string
}

const props = defineProps<{
  token?: string
}>()

const hasToken = ref(false)
const isErrored = ref(false)
const tokenValue = ref('')
const eventData = ref<EventData | null>(null)
const isLoading = ref(false)
const participants = ref<ParticipantData[]>([])
const filteredParticipants = ref<ParticipantData[]>([])
const eventPageUrl = window.location.origin + '/event'
const editParticipantPageUrl = window.location.origin + '/edit-participant'
const searchText = ref('')
const registerCardRef = ref<InstanceType<typeof Card> | null>(null)
const mapScrollRef = ref<HTMLDivElement | null>(null)

const participantMarkers = computed(() => {
  return filteredParticipants.value
    .filter(p => p.latitude !== undefined && p.longitude !== undefined)
    .map(p => ({
      lat: p.latitude!,
      lng: p.longitude!,
      tooltip: `${p.firstName} ${p.lastName}`,
      mode: p.mode,
      color: p.mode == 'driver' ? '--color-secondary-green' : '--color-primary-green',
      address: p.address,
      phone: p.phoneNumber,
      email: p.showEmail ? p.email : undefined,
      contactUrl: !p.showEmail && p.contactToken
        ? window.location.origin + '/sendMessage?token=' + p.contactToken
        : undefined,
      comments: p.comments,
    }))
})

const isMobile = computed(() =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
)

// Event pin popup: name, date and a "Y aller" link (native maps app on
// mobile via geo:, Google Maps in a new tab on desktop).
const mainMarkerPopup = computed(() => {
  const e = eventData.value
  if (!e) return undefined
  return {
    name: e.eventName,
    date: formatDate(e.datePicker),
    directions: isMobile.value
      ? { url: `geo:${e.latitude},${e.longitude}`, label: t('eventPage.directions'), newTab: false }
      : { url: `https://www.google.com/maps?q=${e.latitude},${e.longitude}`, label: t('eventPage.directions'), newTab: true },
  }
})

const directionsUrl = computed(() => mainMarkerPopup.value?.directions?.url ?? '#')
const directionsNewTab = computed(() => mainMarkerPopup.value?.directions?.newTab ?? false)

watch(hasToken, async (newVal) => {
  if (newVal) {
    isLoading.value = true
    isErrored.value = false
    eventData.value = null
    const result = await fetchEvent()
    isLoading.value = false
    if (result) {
      eventData.value = result
      await fetchParticipants()
    }
  }
})

if (props.token) {
  tokenValue.value = props.token as string
  hasToken.value = true
}

function redirectWithToken() {
  router.push({ path: '/event', query: { token: tokenValue.value } })
  hasToken.value = true
}

async function fetchEvent(): Promise<EventData | null> {
  try {
    const res = await api('/api/getEvent?token=' + tokenValue.value)
    const data = await res.json()
    if (!res.ok) {
      isErrored.value = true
      return null
    }
    return data.event
  } catch (err) {
    console.error(err)
    isErrored.value = true
    return null
  }
}

function goHome() {
  router.push('/')
}

async function fetchParticipants() {
  try {
    const res = await api('/api/getParticipants?token=' + tokenValue.value)
    const data = await res.json()
    if (res.ok && Array.isArray(data)) {
      // p.address is stored by the frontend at registration time — no
      // geocoding on the read path, the list renders instantly.
      participants.value = data
      filteredParticipants.value = data
    }
  } catch (err) {
    console.error('Failed to fetch participants:', err)
  }
}

function onFiltered(p: ParticipantData[]) {
  filteredParticipants.value = p
}

// OK on the registration success popup: collapse the registration card and
// bring the map (now including the new marker) into view.
function onRegisterConfirmed() {
  registerCardRef.value?.collapse()
  nextTick(() => {
    mapScrollRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function formatDate(dateStr: string): string {
  const dsLocale = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(dsLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="page event-page">
    <h1>{{ eventData?.eventName }}</h1>

    <Card v-if="!hasToken" variant="classic" :title="$t('eventPage.access.title')">
      <p class="event-page__token-desc">{{ $t('eventPage.access.desc') }}</p>
      <form @submit.prevent="redirectWithToken()" class="event-page__token-form">
        <input id="token-in" v-model="tokenValue" type="text" :placeholder="$t('eventPage.access.placeholder')" autocomplete="off" />
        <button type="submit" class="btn-primary">{{ $t('eventPage.access.btn') }}</button>
      </form>
    </Card>

    <div v-else>
      <FormLayout :noSubmitBtn="true">
        <div v-if="isLoading" class="event-page__loading">
          <p>{{ $t('eventPage.loading') }}</p>
        </div>

        <Card v-else-if="isErrored" :title="$t('eventPage.notFound.title')">
          <p class="text-secondary">{{ $t('eventPage.notFound.desc') }}</p>
          <button class="btn-primary event-page__btn" @click="goHome()">{{ $t('eventPage.goHome') }}</button>
        </Card>

        <Card v-else-if="eventData" variant="borderless">

          <div class="event-page__info">
            <p>{{ formatDate(eventData.datePicker) }}</p>
            <p>{{ eventData.firstName }} {{ eventData.lastName }}<span v-if="eventData.email" class="event-page__contact-email">{{ eventData.email }}</span></p>
            <div class="event-page__address-row">
              <p>{{ eventData.address }}</p>
              <a class="event-page__directions" :href="directionsUrl" :target="directionsNewTab ? '_blank' : undefined" rel="noopener noreferrer">
                <i class="fa-solid fa-route" aria-hidden="true"></i>
                {{ $t('eventPage.directions') }}
              </a>
            </div>
            <p v-if="eventData.comments" class="event-page__comments">{{ eventData.comments }}</p>
          </div>

          <div ref="mapScrollRef">
            <Map
              :lat="eventData.latitude"
              :lng="eventData.longitude"
              :zoom="10"
              :additional-markers="participantMarkers"
              :fit-markers="true"
              :displayMainMarker="true"
              :is_editable="false"
              :main-marker-popup="mainMarkerPopup"
              height="350px"
            />
          </div>
          <button v-if="searchText" @click="searchText = ''" class="event-page__clear">{{ $t('common.clear') }}</button>
        </Card>

        <Card v-if="!isErrored && eventData" collapsible default-expanded :title="$t('eventPage.participants.title')" variant="borderless">
          <ParticipantTable :name-filter="searchText" :participants="participants" @filtered="onFiltered" />
        </Card>
      </FormLayout>

      <Card v-if="!isErrored" ref="registerCardRef" collapsible :default-expanded="false" :title="$t('registerParticipant.toggle')">
        <RegisterParticipant
          v-if="!isErrored && eventData"
          :token="tokenValue"
          :event-page-url="eventPageUrl"
          :edit-participant-page-url="editParticipantPageUrl"
          @registered="fetchParticipants"
          @confirmed="onRegisterConfirmed"
        />
      </Card>
    </div>
  </div>
</template>

<style scoped>
/* .page class handles layout */

.event-page__token-desc {
  color: var(--color-text-medium);
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.event-page__token-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-page__content {
  margin-top: 1.5rem;
}

.event-page__loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-medium);
}

.event-page__btn {
  margin-top: 1rem;
}

.event-page__info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-bottom: 1.25rem;
}

.event-page__info p {
  margin: 0;
  color: var(--color-text-dark);
}

.event-page__info .event-page__comments {
  color: var(--color-text-medium);
}

.event-page__info .event-page__contact-email {
  font-style: italic;
  color: var(--color-text-medium);
  font-size: 0.95em;
  margin-left: 0.5em;
}

.event-page__address-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
}

.event-page__directions {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  background-color: var(--color-primary-green);
  color: #ffffff;
  border-radius: 50px;
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 0.8rem;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.event-page__directions:hover {
  background-color: #7CB342;
  box-shadow: 0 2px 8px rgba(139, 195, 74, 0.4);
}

@media (max-width: 600px) {
  .event-page__address-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

.event-page__clear {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--color-text-medium);
  color: white;
  border: none;
  border-radius: 50px;
  font-family: var(--font-heading);
  font-size: 0.85rem;
  cursor: pointer;
}

.event-page__clear:hover {
  background: var(--color-text-dark);
}

</style>
