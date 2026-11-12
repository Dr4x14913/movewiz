<script setup lang="ts">
import { ref, computed } from 'vue'
import { api } from '../api'
import Card from '../components/Card.vue'
import CardRow from '../components/CardRow.vue'
import LocationPicker from '../components/LocationPicker.vue'
import Turnstile from '../components/Turnstile.vue'
import PopUp from '../components/PopUp.vue'
import FormLayout from '../components/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { router } from '../router'

enum FormResponse {
  Error,
  Success,
  None,
}
const { t, locale } = useI18n()
const first_name = ref('')
const last_name = ref('')
const email = ref('')
const event_name = ref('')
const date = ref(new Date().toISOString().split('T')[0])
const address = ref('')
const lat = ref(46.603354)
const long_ = ref(1.888334)
const comments = ref('')
const turnstileSiteKey: string = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''
const turnstileWidget = ref<InstanceType<typeof Turnstile> | null>(null)
const turnstileToken = ref('')
const locationPickerRef = ref<{
  getLocation: () => { address: string; lat: number; lng: number }
  resetLocation: () => void
  hasLocation: () => boolean
} | null>(null)
const form_resp = ref(FormResponse.None)
const form_resp_msg = ref('')
const isSubmitting = ref(false)
const showConfirm = ref(false)
const successReadUrl = ref('')
const successWriteUrl = ref('')

function onLocationSelected(data: { address: string; lat: number; lng: number }) {
  address.value = data.address
  lat.value = data.lat
  long_.value = data.lng
}

function resetForm() {
  first_name.value = ''
  last_name.value = ''
  email.value = ''
  event_name.value = ''
  address.value = ''
  comments.value = ''
  lat.value = 46.603354
  long_.value = 1.888334
  locationPickerRef.value?.resetLocation()
}


function formatDate(dateStr: string): string {
  const dsLocale = locale.value === 'fr' ? 'fr-FR' : 'en-US'
  return new Date(dateStr).toLocaleDateString(dsLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const contactName = computed(() => `${first_name.value} ${last_name.value}`.trim())

// Contact line of the confirmation summary: name and email merged
// (whichever is filled in), e.g. "Jean Dupont · jean@example.com".
const contactLine = computed(() => [contactName.value, email.value].filter(Boolean).join(' · '))

// Value the API will receive (the picker's current address, which the
// user may have edited after the reverse geocode).
const summaryAddress = computed(
  () => locationPickerRef.value?.getLocation()?.address ?? address.value
)

// First step: validate the location, then show the confirmation popup.
// The API call itself only happens on "Valider" (createEvent).
function onFormSubmit() {
  // A typed address only has coordinates once the user picked it from the
  // suggestions or clicked the map — without that, the default map center
  // would be silently stored, so ask for a location selection instead.
  if (!locationPickerRef.value?.hasLocation()) {
    form_resp.value = FormResponse.Error
    form_resp_msg.value = t('createEvent.popup.errorMissingLocation')
    return
  }
  showConfirm.value = true
}

async function createEvent() {
  isSubmitting.value = true
  try {
    // The address sent to the backend is the text currently in the address
    // field (the user may have edited it after the reverse geocode).
    const pickerLocation = locationPickerRef.value?.getLocation()
    const effectiveAddress = pickerLocation ? pickerLocation.address : address.value
    const response = await api('/api/createEvent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: first_name.value,
        lastName: last_name.value,
        email: email.value,
        address: effectiveAddress,
        latitude: lat.value,
        longitude: long_.value,
        eventPageUrl: window.location.origin + '/event',
        editPageUrl: window.location.origin + '/edit',
        datePicker: date.value,
        comments: comments.value,
        turnstileToken: turnstileToken.value || turnstileWidget.value?.getResponse() || '',
        eventName: event_name.value,
        language: locale.value,
      }),
    })
    if (!response.ok) {
      showConfirm.value = false
      form_resp.value = FormResponse.Error
      if (response.status === 429) {
        form_resp_msg.value = t('createEvent.popup.tooManyRequests')
      } else {
        try {
          const resp = await response.json()
          form_resp_msg.value = resp.error || t('createEvent.popup.errorDefault')
        } catch {
          form_resp_msg.value = t('createEvent.popup.errorDefault')
        }
      }
    } else {
      showConfirm.value = false
      resetForm()
      const resp = await response.json()
      successReadUrl.value = resp.readUrl
      successWriteUrl.value = resp.writeUrl
      form_resp.value = FormResponse.Success
    }
  } finally {
    isSubmitting.value = false
    // Turnstile tokens are single-use: reset the widget for the next attempt
    turnstileToken.value = ''
    turnstileWidget.value?.reset()
  }
}

function onPopupClose() {
    form_resp.value = FormResponse.None
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div v-if="form_resp == FormResponse.Error">
    <PopUp :title="t('createEvent.popup.errorTitle')" :message="form_resp_msg" type='error' @close='onPopupClose' />
  </div>
  <div v-if="form_resp == FormResponse.Success">
    <PopUp :title="t('createEvent.popup.successTitle')" type='success' @close='onPopupClose'>
      <div class="create-event__success-btns">
        <a class="btn-primary" :href="successReadUrl" target="_blank" rel="noopener noreferrer">{{ $t('createEvent.popup.viewBtn') }}</a>
        <a class="btn-secondary" :href="successWriteUrl" target="_blank" rel="noopener noreferrer">{{ $t('createEvent.popup.editBtn') }}</a>
      </div>
      <div class="create-event__success-links">
        <p class="create-event__links-title">{{ $t('createEvent.popup.linksTitle') }}</p>
        <p class="create-event__link-row">
          <span class="create-event__link-name">{{ $t('createEvent.popup.readLink') }}</span>
          <span class="create-event__link-url">{{ successReadUrl }}</span>
        </p>
        <p class="create-event__link-row">
          <span class="create-event__link-name">{{ $t('createEvent.popup.writeLink') }}</span>
          <span class="create-event__link-url">{{ successWriteUrl }}</span>
        </p>
      </div>
      <p class="create-event__disclaimer">{{ $t('createEvent.popup.linksDisclaimer') }}</p>
      <template #actions>
        <button class="btn-primary" type="button" @click="goHome()">{{ $t('eventPage.goHome') }}</button>
      </template>
    </PopUp>
  </div>
  <PopUp v-if="showConfirm" :title="t('createEvent.confirm.title')" @close="showConfirm = false">
    <div class="create-event__summary">
      <div class="create-event__summary-item">
        <span class="create-event__summary-label">{{ $t('createEvent.details.eventName') }}</span>
        <span>{{ event_name }} · {{ formatDate(date) }}</span>
      </div>
      <div v-if="contactLine" class="create-event__summary-item">
        <span class="create-event__summary-label">{{ $t('eventPage.fields.contact') }}</span>
        <span>{{ contactLine }}</span>
      </div>
      <div class="create-event__summary-item">
        <span class="create-event__summary-label">{{ $t('common.address.label') }}</span>
        <span>{{ summaryAddress }}</span>
      </div>
      <div v-if="comments" class="create-event__summary-item">
        <span class="create-event__summary-label">{{ $t('createEvent.details.comments') }}</span>
        <span>{{ comments }}</span>
      </div>
    </div>
    <template #actions>
      <button class="btn-secondary" type="button" @click="showConfirm = false">{{ $t('createEvent.confirm.cancel') }}</button>
      <button class="btn-primary" type="button" :disabled="isSubmitting" @click="createEvent">{{ $t('createEvent.confirm.validate') }}</button>
    </template>
  </PopUp>
  <div class="page create-event">
    <h1>{{ $t('createEvent.title') }}</h1>
    <p class="form__required-legend">{{ $t('createEvent.required') }}</p>

    <FormLayout :submitting="isSubmitting" @submit="onFormSubmit" :submitLabel="t('createEvent.submit')" >
      <CardRow>
      <Card variant="borderless">
        <div class="form__row">
          <div class="form__field">
            <label for="event-name">{{ $t('createEvent.details.eventName') }} <span class="form__required">*</span></label>
            <input id="event-name" type="text" v-model="event_name" required />
          </div>

          <div class="form__field">
            <label for="date">{{ $t('createEvent.details.date') }} <span class="form__required">*</span></label>
            <input id="date" type="date" v-model="date" required />
          </div>

          <div class="form__field">
            <label for="first-name">{{ $t('createEvent.contact.firstName') }}</label>
            <input id="first-name" type="text" v-model="first_name" />
          </div>

          <div class="form__field">
            <label for="last-name">{{ $t('createEvent.contact.lastName') }}</label>
            <input id="last-name" type="text" v-model="last_name" />
          </div>

          <div class="form__field">
            <label for="email">{{ $t('createEvent.contact.email') }}</label>
            <input id="email" type="email" v-model="email"/>
          </div>

          <div class="form__field">
            <label for="comments">{{ $t('createEvent.details.comments') }}</label>
            <textarea id="comments" v-model="comments" rows="4" :placeholder="$t('createEvent.details.commentsPlaceholder')"></textarea>
          </div>

          <div v-if="turnstileSiteKey" class="form__field form__field--full">
            <Turnstile
              ref="turnstileWidget"
              :sitekey="turnstileSiteKey"
              @token="turnstileToken = $event"
            />
          </div>
        </div>
      </Card>

      <Card variant="borderless">
        <LocationPicker
          ref="locationPickerRef"
          :label="t('common.address.label')"
          :placeholder="t('common.address.placeholder')"
          :required=true
          :height="'350px'"
          @location-selected="onLocationSelected"
        />

        <input type="hidden" name="lat" :value="lat" />
        <input type="hidden" name="long" :value="long_" />

      </Card>
      </CardRow>

    </FormLayout>
  </div>
</template>

<style scoped>
/* row/field/label styles live in assets/main.css (.form__row, .form__field) */
.create-event h1 {
  color: var(--color-primary-green);
  margin-bottom: 0.25rem;
}

/* Confirmation popup summary (slot content rendered inside PopUp) */
.create-event__summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  text-align: left;
}

.create-event__summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.create-event__summary-label {
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-medium);
}

.create-event__summary-item > span:last-child {
  color: var(--color-text-dark);
  font-size: 0.95rem;
  word-break: break-word;
}

/* Success popup content: slot content is compiled in this component's
   scope, so PopUp's scoped styles can't reach it — mirror what's needed. */
.create-event__success-btns {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.create-event__success-btns .btn-primary,
.create-event__success-btns .btn-secondary {
  padding: 0.625rem 1.5rem;
  font-size: 0.9rem;
}

.create-event__success-links {
  margin-bottom: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-cream);
  border-radius: 8px;
}

.create-event__links-title {
  margin: 0 0 0.375rem;
  font-family: var(--font-heading);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-medium);
}

.create-event__link-row {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  line-height: 1.4;
}

.create-event__link-name {
  display: block;
  font-weight: 600;
  color: var(--color-text-dark);
}

.create-event__link-url {
  color: var(--color-text-medium);
  word-break: break-all;
  user-select: all;
  cursor: text;
}

.create-event__disclaimer {
  margin: 0;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--color-text-medium);
  text-align: center;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
