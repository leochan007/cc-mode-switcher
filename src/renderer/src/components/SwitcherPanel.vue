<template>
  <section>
    <div class="mode-grid">
      <ModeCard mode="plan" :active="currentMode === 'plan'" :model="planModel" @select="currentMode = 'plan'" />
      <ModeCard mode="work" :active="currentMode === 'work'" :model="workModel" @select="currentMode = 'work'" />
    </div>

    <div class="card binding-card">
      <div class="card-title">{{ t('switcher.binding') }}</div>
      <div class="form-grid">
        <div class="form-group">
          <label>{{ t('switcher.planUses') }}</label>
          <select v-model="planModelId">
            <option value="">{{ t('switcher.select') }}</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }} ({{ m.modelID }})</option>
          </select>
        </div>
        <div class="form-group">
          <label>{{ t('switcher.workUses') }}</label>
          <select v-model="workModelId">
            <option value="">{{ t('switcher.select') }}</option>
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.name }} ({{ m.modelID }})</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="command-header">
        <h3>
          {{ t('switcher.cliTitle') }}
          <span>{{ t('switcher.cliHint') }}</span>
        </h3>
        <div class="command-actions">
          <IconButton :icon="'▶️'" :tip="t('switcher.launch')" variant="primary" @confirm="openInTerminal" />
          <IconButton
            :icon="copied ? '✅' : '📋'"
            :tip="copied ? t('switcher.copied') : t('switcher.copy')"
            @confirm="copyCommand"
          />
        </div>
      </div>
      <textarea class="command" readonly :value="command"></textarea>
      <div class="command-tip">{{ t('switcher.tip') }}</div>
    </div>

    <!-- settings.json env override warning -->
    <ConfirmModal
      v-if="pendingOverrideClean"
      :title="t('switcher.overrideTitle')"
      :message="t('switcher.overrideMsg', { count: overrideCount })"
      :confirm-text="t('switcher.overrideClean')"
      @confirm="cleanOverridesAndLaunch"
      @cancel="pendingOverrideClean = false"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Mode, ModelConfig } from '../types'
import { useModels } from '../composables/useModels'
import { useI18n } from '../composables/useI18n'
import { useTerminal } from '../composables/useTerminal'
import { useToast } from '../composables/useToast'
import { copyText } from '../utils/clipboard'
import ModeCard from './ModeCard.vue'
import IconButton from './IconButton.vue'
import ConfirmModal from './ConfirmModal.vue'

const { models, planModelId, workModelId, planModel, workModel } = useModels()
const { t } = useI18n()
const { launchInTerminal } = useTerminal()
const toast = useToast()

const currentMode = ref<Mode>('plan')
const copied = ref(false)

// settings.json override warning state
const pendingOverrideClean = ref(false)
const overrideCount = ref(0)

const currentModel = computed(() => (currentMode.value === 'plan' ? planModel.value : workModel.value))

/** Plain export lines pointing every Claude Code role at the bound model */
function envExports(m: ModelConfig, mode: Mode): string[] {
  const lines = [
    `export ANTHROPIC_BASE_URL="${m.baseUrl}"`,
    `export ANTHROPIC_AUTH_TOKEN="${m.apiKey}"`,
    `export ANTHROPIC_DEFAULT_OPUS_MODEL="${m.modelID}"`,
    `export ANTHROPIC_DEFAULT_SONNET_MODEL="${m.modelID}"`,
    `export ANTHROPIC_DEFAULT_HAIKU_MODEL="${m.modelID}"`,
    `export ANTHROPIC_DEFAULT_FABLE_MODEL="${m.modelID}"`,
    `export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME="${m.modelID}"`,
    `export ANTHROPIC_DEFAULT_SONNET_MODEL_NAME="${m.modelID}"`,
    `export ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME="${m.modelID}"`,
    `export ANTHROPIC_DEFAULT_FABLE_MODEL_NAME="${m.modelID}"`,
    `export ANTHROPIC_MODEL="${m.modelID}"`,
    `export CLAUDE_CODE_SUBAGENT_MODEL="${m.modelID}"`
  ]
  if (mode === 'plan') lines.push(`export MAX_THINKING_TOKENS=16000`)
  return lines
}

/** The one alias: plan permission mode + nothing else (env comes from exports) */
const PLAN_ALIAS = "alias claude-plan='claude --permission-mode plan'"

const command = computed(() => {
  const m = currentModel.value
  if (!m) return t('switcher.needModel')

  const lines = [
    '# Set Claude Code to use custom endpoint',
    ...envExports(m, currentMode.value).slice(0, 2),
    '',
    '# Map model aliases so all Claude Code roles point to this model',
    ...envExports(m, currentMode.value).slice(2)
  ]
  if (currentMode.value === 'plan') {
    lines.push('', '# Plan mode: extended thinking + plan permission alias', PLAN_ALIAS)
  } else {
    lines.push('', '# Work mode: default permissions — just run claude')
  }
  return lines.join('\n')
})

async function copyCommand(): Promise<void> {
  await copyText(command.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function openInTerminal(): Promise<void> {
  if (!currentModel.value) {
    toast.error(t('switcher.launchNoModel'))
    return
  }
  // settings.json env silently overrides the terminal env — check first
  const overrides = await window.electronAPI.getClaudeEnvOverrides()
  const count = overrides.reduce((n, e) => n + e.keys.length, 0)
  if (count > 0) {
    overrideCount.value = count
    pendingOverrideClean.value = true
    return
  }
  await doLaunch()
}

async function cleanOverridesAndLaunch(): Promise<void> {
  pendingOverrideClean.value = false
  const r = await window.electronAPI.clearClaudeEnvOverrides()
  if (!r.ok) {
    toast.error(t('switcher.overrideCleanFail', { error: r.error ?? '' }))
    return
  }
  toast.success(t('switcher.overrideCleaned', { count: r.count ?? 0 }))
  await doLaunch()
}

async function doLaunch(): Promise<void> {
  const m = currentModel.value
  if (!m) return
  const parts = [...envExports(m, currentMode.value)]
  const runCmd = currentMode.value === 'plan' ? (parts.push(PLAN_ALIAS), 'claude-plan') : 'claude'
  parts.push(`echo "✅ env ready — run: ${runCmd}"`)
  const r = await launchInTerminal(parts.join('; '))
  if (r.ok) {
    toast.success(t('switcher.launchOk'))
  } else if (r.error !== 'cancelled') {
    toast.error(t('switcher.launchFail', { error: r.error ?? '' }))
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
.command-header h3 { font-size: 14px; color: var(--text-strong); }
.command-header h3 span { font-weight: normal; color: var(--text-dim); font-size: 12px; }
.command-actions { display: flex; gap: 8px; }

.command {
  width: 100%;
  height: 170px;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--code-green);
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
  color: var(--text-dim);
}
</style>
