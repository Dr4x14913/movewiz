<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { api } from '../api'
import Card from '../components/Card.vue'
import CardRow from '../components/CardRow.vue'
import LocationPicker from '../components/LocationPicker.vue'
import PopUp from '../components/PopUp.vue'
import FormLayout from '../components/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { router } from '../router'

enum FormResponse {
  Error,
  Success,
  None,
}

const { t } = useI18n()

const props = defineProps<{
  token?: string
}>()

const isLoading = ref(true)
const isErrored = ref(false)
const form_resp = ref(FormResponse.None)
const form_resp_msg = ref('')
const isSubmitting = ref(false)

const picker = ref<{
  getLocation: () => { address: string; lat: number; lng: number }
  setAddress: (address: string, lat: number, lng: number) => void
} | null>(null)
const first_name = ref('')
const last_name = ref('')
const email = ref('')
const event_name = ref('')
const date = ref('')
const address = ref('')
const lat = ref(0)
const long_ = ref(0)
const comments = ref('')
const readUrl = ref('')

onMounted(async () => {
  if (!props.token) {
    isErrored.value = true
    isLoading.value = false
    return
  }
  await fetchEvent()
})

async function fetchEvent() {
  try {
    const res = await api('/api/getEvent?token=' + props.token + '&isEdit=true')
    const data = await res.json()
    if (!res.ok) {
      isErrored.value = true
      isLoading.value = false
      return
    }
    const event = data.event
    first_name.value = event.firstName
    last_name.value = event.lastName
    email.value = event.email
    event_name.value = event.eventName
    date.value = event.datePicker
    address.value = event.address
    lat.value = event.latitude
    long_.value = event.longitude
    comments.value = event.comments || ''
    readUrl.value = event.readUrl || ''
    isLoading.value = false
    await nextTick()
    picker.value?.setAddress(address.value, lat.value, long_.value)
  } catch (err) {
    console.error(err)
    isErrored.value = true
    isLoading.value = false
  }
}

function onLocationSelected(data: { address: string; lat: number; lng: number }) {
  address.value = data.address
  lat.value = data.lat
  long_.value = data.lng
}

async function submitForm() {
  isSubmitting.value = true
  try {
    // The address sent to the backend is the text currently in the address
    // field (the user may have edited it after the reverse geocode).
    const pickerLocation = picker.value?.getLocation()
    const effectiveAddress = pickerLocation ? pickerLocation.address : address.value
    const response = await api('/api/editEvent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        editToken: props.token,
        firstName: first_name.value,
        lastName: last_name.value,
        email: email.value,
        eventName: event_name.value,
        datePicker: date.value,
        address: effectiveAddress,
        latitude: lat.value,
        longitude: long_.value,
        comments: comments.value,
      }),
    })

    if (!response.ok) {
      form_resp.value = FormResponse.Error
      try {
        const resp = await response.json()
        form_resp_msg.value = resp.error || t('editEvent.popup.errorDefault')
      } catch {
        form_resp_msg.value = t('editEvent.popup.errorDefault')
      }
    } else {
      form_resp.value = FormResponse.Success
      form_resp_msg.value = t('editEvent.popup.successDesc')
    }
  } finally {
    isSubmitting.value = false
  }
}

function onPopupClose() {
  form_resp.value = FormResponse.None
}

function goHome() {
  router.push('/')
}

function goToEvent() {
  // The edit token can't be used on the event page, so the read URL comes
  // from the API (same convention as createEvent's readUrl). If it carries a
  // token for this app, navigate in-app instead of reloading the page.
  const readToken = new URL(readUrl.value, window.location.origin).searchParams.get('token')
  if (readToken) {
    router.push({ path: '/event', query: { token: readToken } })
  } else {
    window.location.href = readUrl.value
  }
}
</script>

<template>
  <div v-if="form_resp == FormResponse.Error">
    <PopUp :title="t('editEvent.popup.errorTitle')" :message="form_resp_msg" type="error" @close="onPopupClose" />
  </div>
  <div v-if="form_resp == FormResponse.Success">
    <PopUp :title="t('editEvent.popup.successTitle')" :message="form_resp_msg" type="success" @close="onPopupClose">
      <template #actions>
        <button v-if="readUrl" class="btn-primary" type="button" @click="goToEvent()">{{ $t('eventPage.access.btn') }}</button>
        <button v-else class="btn-primary" type="button" @click="goHome()">{{ $t('eventPage.goHome') }}</button>
      </template>
    </PopUp>
  </div>
  <div class="page edit-event">
    <h1>{{ $t('editEvent.title') }}</h1>

    <div v-if="isLoading" class="edit-event__loading">
      <p>{{ $t('editEvent.loading') }}</p>
    </div>

    <div v-else-if="isErrored" class="edit-event__error">
      <Card :title="$t('editEvent.notFound.title')">
        <p class="text-secondary">{{ $t('editEvent.notFound.desc') }}</p>
        <button class="btn-primary edit-event__btn" @click="goHome()">{{ $t('eventPage.goHome') }}</button>
      </Card>
    </div>

    <FormLayout v-else :submitting="isSubmitting" @submit="submitForm">
      <CardRow>
        <Card variant="borderless">
          <div class="form__row">
            <div class="form__field">
              <label for="event-name">{{ $t('createEvent.details.eventName') }} <span class="edit-event__required">*</span></label>
              <input id="event-name" type="text" v-model="event_name" required />
            </div>

            <div class="form__field">
              <label for="date">{{ $t('createEvent.details.date') }} <span class="edit-event__required">*</span></label>
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
              <input id="email" type="email" v-model="email" />
            </div>

            <div class="form__field">
              <label for="comments">{{ $t('createEvent.details.comments') }}</label>
              <textarea id="comments" v-model="comments" rows="4" :placeholder="$t('createEvent.details.commentsPlaceholder')"></textarea>
            </div>
          </div>
        </Card>

        <Card variant="borderless">
          <LocationPicker
            ref="picker"
            :label="t('common.address.label')"
            :placeholder="t('common.address.placeholder')"
            :required="true"
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
.edit-event h1 {
  color: var(--color-primary-green);
  margin-bottom: 0.25rem;
}

.edit-event__required {
  color: #e53935;
}

/* row/field styles live in assets/main.css (.form__row, .form__field) */
.edit-event :deep(.address-input label)::after {
  content: ' *';
  color: #e53935;
}

.edit-event__loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-medium);
}

.edit-event__error {
  margin-top: 1.5rem;
}

.edit-event__btn {
  margin-top: 1rem;
}
</style>
