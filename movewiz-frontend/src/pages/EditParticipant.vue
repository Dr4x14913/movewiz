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
import { sanitizePhone } from '../phone'

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
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const mode = ref('passenger')
const phoneNumber = ref('')
const comments = ref('')
const lat = ref(0)
const long_ = ref(0)
const address = ref('')
const notifyMe = ref(false)
const hideEmail = ref(false)

onMounted(async () => {
  if (!props.token) {
    isErrored.value = true
    isLoading.value = false
    return
  }
  await fetchParticipant()
})

async function fetchParticipant() {
  try {
    const res = await api('/api/getParticipant?token=' + props.token)
    const data = await res.json()
    if (!res.ok) {
      isErrored.value = true
      isLoading.value = false
      return
    }
    const participant = data.participant
    firstName.value = participant.firstName
    lastName.value = participant.lastName
    email.value = participant.email
    mode.value = participant.mode || 'passenger'
    phoneNumber.value = sanitizePhone(participant.phoneNumber || '')
    comments.value = participant.comments || ''
    lat.value = participant.latitude || 0
    long_.value = participant.longitude || 0
    notifyMe.value = participant.notifyMe || false
    hideEmail.value = !participant.showEmail
    isLoading.value = false
    await nextTick()
    if (participant.latitude && participant.longitude) {
      // Prefill from the address stored by the frontend at registration /
      // previous edit time — no geocoding on the read path.
      address.value = participant.address || ''
      picker.value?.setAddress(participant.address || '', participant.latitude, participant.longitude)
    }
  } catch (err) {
    console.error(err)
    isErrored.value = true
    isLoading.value = false
  }
}

function onLocationSelected(data: { address: string; lat: number; lng: number }) {
  lat.value = data.lat
  long_.value = data.lng
  address.value = data.address
}

// Keep only valid phone number characters (also covers pasted text)
function onPhoneInput(event: Event) {
  const input = event.target as HTMLInputElement
  const cleaned = sanitizePhone(input.value)
  if (cleaned !== input.value) {
    input.value = cleaned
  }
  phoneNumber.value = cleaned
}

async function submitForm() {
  isSubmitting.value = true
  try {
    // The address sent to the backend is the text currently in the address
    // field (the user may have edited it after the reverse geocode).
    const pickerLocation = picker.value?.getLocation()
    const effectiveAddress = pickerLocation ? pickerLocation.address : address.value
    const response = await api('/api/editParticipant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        editToken: props.token,
        firstName: firstName.value,
        lastName: lastName.value,
        mode: mode.value,
        phoneNumber: phoneNumber.value,
        comments: comments.value,
        latitude: lat.value,
        longitude: long_.value,
        address: effectiveAddress,
        notifyMe: notifyMe.value,
        showEmail: !hideEmail.value,
      }),
    })

    if (!response.ok) {
      form_resp.value = FormResponse.Error
      try {
        const resp = await response.json()
        form_resp_msg.value = resp.error || t('editParticipant.popup.errorDefault')
      } catch {
        form_resp_msg.value = t('editParticipant.popup.errorDefault')
      }
    } else {
      form_resp.value = FormResponse.Success
      form_resp_msg.value = t('editParticipant.popup.successDesc')
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
</script>

<template>
  <div v-if="form_resp == FormResponse.Error">
    <PopUp :title="t('editParticipant.popup.errorTitle')" :message="form_resp_msg" type="error" @close="onPopupClose" />
  </div>
  <div v-if="form_resp == FormResponse.Success">
    <PopUp :title="t('editParticipant.popup.successTitle')" :message="form_resp_msg" type="success" @close="onPopupClose">
      <template #actions>
        <button class="btn-primary" type="button" @click="goHome()">{{ $t('eventPage.goHome') }}</button>
      </template>
    </PopUp>
  </div>
  <div class="page edit-participant">
    <h1>{{ $t('editParticipant.title') }}</h1>

    <div v-if="isLoading" class="edit-participant__loading">
      <p>{{ $t('editParticipant.loading') }}</p>
    </div>

    <div v-else-if="isErrored" class="edit-participant__error">
      <Card :title="$t('editParticipant.notFound.title')">
        <p class="text-secondary">{{ $t('editParticipant.notFound.desc') }}</p>
        <button class="btn-primary edit-participant__btn" @click="goHome()">{{ $t('eventPage.goHome') }}</button>
      </Card>
    </div>

    <FormLayout v-else :submitting="isSubmitting" :submit-label="t('editParticipant.submit')" @submit="submitForm">
      <CardRow>
        <Card variant="borderless">
          <div class="form__row">
            <div class="form__field">
              <label for="edit-first-name">{{ $t('registerParticipant.contact.firstName') }}</label>
              <input id="edit-first-name" type="text" v-model="firstName" required />
            </div>

            <div class="form__field">
              <label for="edit-last-name">{{ $t('registerParticipant.contact.lastName') }}</label>
              <input id="edit-last-name" type="text" v-model="lastName" required />
            </div>

            <div class="form__field">
              <label for="edit-email">{{ $t('registerParticipant.contact.email') }}</label>
              <input id="edit-email" type="email" v-model="email" disabled />
            </div>

            <div class="form__field">
              <label for="edit-mode">{{ $t('registerParticipant.details.mode') }}</label>
              <select id="edit-mode" v-model="mode" required>
                <option value="driver">{{ $t('registerParticipant.details.driver') }}</option>
                <option value="passenger">{{ $t('registerParticipant.details.passenger') }}</option>
              </select>
            </div>

            <div class="form__field">
              <label for="edit-phone">{{ $t('registerParticipant.details.phoneNumber') }}</label>
              <input id="edit-phone" type="tel" v-model="phoneNumber" @input="onPhoneInput"/>
            </div>

            <div class="form__field">
              <label for="edit-comments">{{ $t('registerParticipant.details.comments') }}</label>
              <textarea id="edit-comments" v-model="comments" rows="3" :placeholder="$t('registerParticipant.details.commentsPlaceholder')"></textarea>
            </div>
          </div>
        </Card>

        <Card variant="borderless">
          <LocationPicker
            ref="picker"
            :label="t('registerParticipant.details.location')"
            :placeholder="t('common.address.placeholder')"
            :mainMarkerLabel="t('registerParticipant.markerLabel')"
            required
            :height="'350px'"
            @location-selected="onLocationSelected"
          />

          <div class="form__checkboxes">
            <label class="form__checkbox">
              <input type="checkbox" v-model="hideEmail" />
              {{ $t('registerParticipant.details.hideEmail') }}
            </label>

            <label class="form__checkbox">
              <input type="checkbox" v-model="notifyMe" />
              {{ $t('registerParticipant.details.notifyMe') }}
            </label>
          </div>
        </Card>
      </CardRow>
    </FormLayout>
  </div>
</template>

<style scoped>
/* row/field/checkbox styles live in assets/main.css (.form__row, .form__field,
   .form__checkboxes, .form__checkbox) */

.edit-participant h1 {
  color: var(--color-primary-green);
  margin-bottom: 0.25rem;
}

.edit-participant__loading {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-medium);
}

.edit-participant__error {
  margin-top: 1.5rem;
}

.edit-participant__btn {
  margin-top: 1rem;
}
</style>
