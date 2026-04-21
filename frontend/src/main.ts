import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './styles.css';
import Home from './pages/Home.vue';
import CreateRole from './pages/CreateRole.vue';
import Status from './pages/Status.vue';
import NpcSocial from './pages/NpcSocial.vue';
import Bag from './pages/Bag.vue';
import Career from './pages/Career.vue';
import Profile from './pages/Profile.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/create', component: CreateRole },
    { path: '/status', component: Status },
    { path: '/npc', component: NpcSocial },
    { path: '/bag', component: Bag },
    { path: '/career', component: Career },
    { path: '/profile', component: Profile },
  ],
});

createApp(App).use(router).mount('#app');
