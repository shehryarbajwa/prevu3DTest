import Vue from 'vue'
import VueRouter from 'vue-router'
import TicTacToe from '@/components/TicTacToe.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'TicTacToe',
    component: TicTacToe
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
