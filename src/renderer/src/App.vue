<template>
  <div id="app">
    <AppHeader v-model="activeTab" />
    <main class="content">
      <ModelsPanel v-if="activeTab === 'models'" />
      <SwitcherPanel v-else />
    </main>
    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Tab } from './types'
import AppHeader from './components/AppHeader.vue'
import ModelsPanel from './components/ModelsPanel.vue'
import SwitcherPanel from './components/SwitcherPanel.vue'
import ToastHost from './components/ToastHost.vue'

const activeTab = ref<Tab>('switcher')
</script>

<style scoped>
.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
</style>
