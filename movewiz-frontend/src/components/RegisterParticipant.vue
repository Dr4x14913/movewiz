<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../api'
import Card from './Card.vue'
import LocationPicker from './LocationPicker.vue'
import PopUp from './PopUp.vue'
import Spinner from './Spinner.vue'
import FormLayout from '../components/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { sanitizePhone } from '../phone'

enum FormResponse {
  Error,
  Success,
  None,
}

const props = defineProps<{
  token: string
  eventPageUrl: string
  editParticipantPageUrl: string
}>()

const emit = defineEmits<{
  registered: []
  confirmed: []
}>()

const { t, locale } = useI18n()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const mode = ref('passenger')
const hideEmail = ref(false)

const phoneNumber = ref('')
const comments = ref('')
const notifyMe = ref(false)
const lat = ref<number | null>(null)
const long_ = ref<number | null>(null)
const address = ref('')

const locationPickerRef = ref<{
  getLocation: () => { address: string; lat: number; lng: number }
  resetLocation: () => void
} | null>(null)

const form_resp = ref(FormResponse.None)
const form_resp_msg = ref('')
const isSubmitting = ref(false)

function clearForm() {
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  mode.value = 'passenger'
  hideEmail.value = false
  phoneNumber.value = ''
  comments.value = ''
  notifyMe.value = false
  lat.value = null
  long_.value = null
  address.value = ''
  locationPickerRef.value?.resetLocation()
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
    const pickerLocation = locationPickerRef.value?.getLocation()
    const effectiveAddress = pickerLocation ? pickerLocation.address : address.value
    const body: any = {
      firstName: firstName.value,
      lastName: lastName.value,
      email: email.value,
      mode: mode.value,
      showEmail: !hideEmail.value,
      token: props.token,
      eventPageUrl: props.eventPageUrl,
      editParticipantPageUrl: props.editParticipantPageUrl,
      latitude: lat.value,
      longitude: long_.value,
      address: effectiveAddress,
      notifyMe: notifyMe.value,
      phoneNumber: phoneNumber.value,
      comments: comments.value,
      language: locale.value,
    }

    const response = await api('/api/registerParticipant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      form_resp.value = FormResponse.Error
      try {
        const resp = await response.json()
        const errorMsg = resp.error || t('registerParticipant.popup.errorDefault')
        if (errorMsg.includes('latitude') || errorMsg.includes('longitude')) {
          form_resp_msg.value = t('registerParticipant.popup.errorMissingLocation')
        } else {
          form_resp_msg.value = errorMsg
        }
      } catch {
        form_resp_msg.value = t('registerParticipant.popup.errorDefault')
      }
    } else {
      form_resp.value = FormResponse.Success
      form_resp_msg.value = t('registerParticipant.popup.successDesc')
      emit('registered')
    }
  } finally {
    isSubmitting.value = false
  }
}

function onPopupClose() {
  if (form_resp.value === FormResponse.Success) {
    clearForm()
  }
  form_resp.value = FormResponse.None
}

// OK on the success popup: resets the form, closes the popup and lets the
// event page scroll to the map and collapse the registration card.
function onSuccessConfirm() {
  clearForm()
  emit('confirmed')
  form_resp.value = FormResponse.None
}
</script>

<template>
  <div v-if="form_resp == FormResponse.Error">
    <PopUp :title="t('registerParticipant.popup.errorTitle')" :message="form_resp_msg" type='error' @close='onPopupClose' />
  </div>
  <div v-if="form_resp == FormResponse.Success">
    <PopUp :title="t('registerParticipant.popup.successTitle')" :message="form_resp_msg" type='success' @close='onPopupClose'>
      <template #actions>
        <button class="btn-primary" type="button" @click="onSuccessConfirm">{{ $t('common.ok') }}</button>
      </template>
    </PopUp>
  </div>
  <div class="register-participant">
    <p class="form__required-legend">{{ $t('registerParticipant.required') }}</p>

    <FormLayout :submitting="isSubmitting" @submit="submitForm">
      <Card variant="borderless">
        <div class="form__row">
          <div class="form__field">
            <label for="reg-first-name">{{ $t('registerParticipant.contact.firstName') }} <span class="form__required">*</span></label>
            <input id="reg-first-name" type="text" v-model="firstName" required />
          </div>

          <div class="form__field">
            <label for="reg-last-name">{{ $t('registerParticipant.contact.lastName') }} <span class="form__required">*</span></label>
            <input id="reg-last-name" type="text" v-model="lastName" required />
          </div>

          <div class="form__field">
            <label for="reg-email">{{ $t('registerParticipant.contact.email') }} <span class="form__required">*</span></label>
            <input id="reg-email" type="email" v-model="email" required />
          </div>

          <div class="form__field">
            <label for="reg-mode">{{ $t('registerParticipant.details.mode') }} <span class="form__required">*</span></label>
            <select id="reg-mode" v-model="mode" required>
              <option value="driver">{{ $t('registerParticipant.details.driver') }}</option>
              <option value="passenger">{{ $t('registerParticipant.details.passenger') }}</option>
            </select>
          </div>

          <div class="form__field">
            <label for="reg-phone">{{ $t('registerParticipant.details.phoneNumber') }}</label>
            <input id="reg-phone" type="tel" v-model="phoneNumber" @input="onPhoneInput"/>
          </div>

          <div class="form__field">
            <label for="reg-comments">{{ $t('registerParticipant.details.comments') }}</label>
            <textarea id="reg-comments" v-model="comments" rows="4" :placeholder="$t('registerParticipant.details.commentsPlaceholder')"></textarea>
          </div>
        </div>
      </Card>

      <Card variant="borderless">
        <LocationPicker
          ref="locationPickerRef"
          required
          :label="t('registerParticipant.details.location')"
          :placeholder="t('common.address.placeholder')"
          :height="'350px'"
          :mainMarkerLabel="t('registerParticipant.markerLabel')"
          @location-selected="onLocationSelected"
        />

        <input type="hidden" name="reg-lat" :value="lat" />
        <input type="hidden" name="reg-long" :value="long_" />

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
    </FormLayout>
  </div>
</template>

