import { createRouter, createWebHashHistory } from 'vue-router'

/* Hash routing, matching the original site — the whole app is a static bundle
 * that can be dropped on any object store / CDN with no server rewrites. */
const routes = [
  {
    path: '/',
    name: 'champions',
    component: () => import('../pages/ChampionsPage.vue'),
    meta: { title: 'Champions' },
  },
  {
    path: '/guides',
    name: 'guides',
    component: () => import('../pages/GuidesPage.vue'),
    meta: { title: 'Off-Meta Builds' },
  },
  {
    path: '/guides/:id',
    name: 'guide',
    component: () => import('../pages/GuideDetailPage.vue'),
    meta: { title: 'Off-Meta Builds' },
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('../pages/MessagesPage.vue'),
    meta: { title: 'Message Board' },
  },
  {
    path: '/more',
    name: 'more',
    component: () => import('../pages/MorePage.vue'),
    meta: { title: 'More' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    return saved || { top: 0 }
  },
})

router.afterEach((to) => {
  document.title = `ARAM Mayhem Guide - ${to.meta.title || 'Champions'}`
})

export default router
