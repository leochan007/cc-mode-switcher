<template>
  <section>
    <div class="mode-grid">
      <ModeCard mode="plan" :active="currentMode === 'plan'" :model="planModel" @select="currentMode = 'plan'" />
      <ModeCard mode="work" :active="currentMode === 'work'" :model="workModel" @select="currentMode = 'work'" />
    </div>

    <div class="card binding-card">
      <div class="card-title">Mode Binding</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Plan uses model</label>
          <select v-model="planModelId">
            <option value="">Select...</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }} ({{ m.modelID }})</option>
          </select>
        </div>
        <div class="form-group">
          <label>Work uses model</label>
          <select v-model="workModelId">
            <option value="">Select...</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }} ({{ m.modelID }})</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="command-header">
        <h3>
          CLI Launch Command
          <span>(copy and paste into terminal)</span>
        </h3>
        <div class="command-actions">
          <IconButton icon="🔧" tip="Install CLI tool" @confirm="installCLI" />
          <IconButton
            :icon="copied ? '✅' : '📋'"
            :tip="copied ? 'Copied!' : 'Copy command'"
            variant="primary"
            @confirm="copyCommand"
          />
        </div>
      </div>
      <textarea class="command" readonly :value="command"></textarea>
      <div class="command-tip">
        💡 After execution, a new Claude Code session starts in
        <strong>{{ currentMode === 'plan' ? 'Plan (analysis/design)' : 'Work (coding/execution)' }}</strong> mode
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Mode } from '../types'
import { useModels } from '../composables/useModels'
import { copyText } from '../utils/clipboard'
import ModeCard from './ModeCard.vue'
import IconButton from './IconButton.vue'

const { models, planModelId, workModelId, planModel, workModel } = useModels()

const currentMode = ref<Mode>('plan')
const copied = ref(false)

const command = computed(() => {
  const m = currentMode.value === 'plan' ? planModel.value : workModel.value
  if (!m) {
    return '# Please add a model in "Models" tab and bind it in "Switcher" tab first'
  }

  const modelId = m.modelID
  return [
    '# Set Claude Code to use custom endpoint',
    `export ANTHROPIC_BASE_URL="${m.baseUrl}"`,
    `export ANTHROPIC_AUTH_TOKEN="${m.apiKey}"`,
    '',
    '# Map model aliases so all Claude Code roles point to this model',
    `export ANTHROPIC_DEFAULT_OPUS_MODEL="${modelId}"`,
    `export ANTHROPIC_DEFAULT_SONNET_MODEL="${modelId}"`,
    `export ANTHROPIC_DEFAULT_HAIKU_MODEL="${modelId}"`,
    '',
    `# Launch Claude Code (current mode: ${currentMode.value === 'plan' ? 'Plan' : 'Work'})`,
    'claude'
  ].join('\n')
})

async function copyCommand(): Promise<void> {
  await copyText(command.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function installCLI(): Promise<void> {
  const result = await window.electronAPI.installCLI()
  if (result.success) {
    alert(`✅ Installed to ${result.path}\n\nYou can now run in terminal:\ncc-mode-switcher`)
  } else {
    alert('❌ Installation failed: ' + result.error)
  }
}
</script>

<style scoped>
.binding-card { margin-bottom: 16px; }

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.command-header h3 { font-size: 14px; color: #fafafa; }
.command-header h3 span { font-weight: normal; color: #71717a; font-size: 12px; }
.command-actions { display: flex; gap: 8px; }

.command {
  width: 100%;
  height: 140px;
  background: #09090b;
  border: 1px solid #27272a;
  color: #4ade80;
  padding: 12px;
  border-radius: 6px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 12px;
  line-height: 1.6;
  resize: none;
  outline: none;
}

.command-tip {
  margin-top: 8px;
  font-size: 11px;
  color: #71717a;
}
.command-tip strong { color: #d4d4d8; }
</style>
