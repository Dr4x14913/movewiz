import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import CreateEvent from './pages/CreateEvent.vue'
import Event from './pages/Event.vue'
import EditEvent from './pages/EditEvent.vue'
import EditParticipant from './pages/EditParticipant.vue'
import SendMessage from './pages/SendMessage.vue'

const routes = [
  { path: '/', component: Home },
  { path: '/create', component: CreateEvent },
  { path: '/event', component: Event, props: route => ({ token: route.query.token }) },
  { path: '/edit', component: EditEvent, props: route => ({ token: route.query.token }) },
  { path: '/edit-participant', component: EditParticipant, props: route => ({ token: route.query.token }) },
  { path: '/sendMessage', component: SendMessage, props: route => ({ token: route.query.token }) },
  { path: '/about', component: Home },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
