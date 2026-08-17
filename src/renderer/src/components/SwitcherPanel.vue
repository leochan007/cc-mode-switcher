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
          {{ t('switcher.aliasesTitle') }}
          <span>{{ t('switcher.aliasesHint') }}</span>
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
      <div class="command-tip">{{ t('switcher.aliasesTip') }}</div>
    </div>
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

const { models, planModelId, workModelId, planModel, workModel } = useModels()
const { t } = useI18n()
const { launchInTerminal } = useTerminal()
const toast = useToast()

const currentMode = ref<Mode>('plan')
const copied = ref(false)

/** Escape a value for inclusion inside `export KEY="..."` (double-quoted shell string). */
function dq(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`')
}

/**
 * Original `export KEY="VALUE"` lines (unchanged form). The shell ends up
 * reflecting whichever mode was exported last; the per-mode `--settings`
 * file below then takes precedence when the actual `claude` invocation runs.
 */
function envExports(m: ModelConfig, mode: Mode): string[] {
  const lines = [
    `export ANTHROPIC_BASE_URL="${dq(m.baseUrl)}"`,
    `export ANTHROPIC_AUTH_TOKEN="${dq(m.apiKey)}"`,
    `export ANTHROPIC_DEFAULT_OPUS_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_SONNET_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_HAIKU_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_FABLE_MODEL="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_SONNET_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_DEFAULT_FABLE_MODEL_NAME="${dq(m.modelID)}"`,
    `export ANTHROPIC_MODEL="${dq(m.modelID)}"`,
    `export CLAUDE_CODE_SUBAGENT_MODEL="${dq(m.modelID)}"`
  ]
  if (mode === 'plan') lines.push(`export MAX_THINKING_TOKENS=16000`)
  return lines
}

/**
 * Build the JSON payload that goes into the per-mode temp settings file.
 * `--settings <file>` has higher priority than both shell env and
 * `~/.claude/settings.json`, so this is the authoritative source for the
 * `claude` invocation — no conflict with `~/.claude/settings.json` is possible.
 */
function settingsJsonFor(m: ModelConfig, mode: Mode): string {
  const env: Record<string, string> = {
    ANTHROPIC_BASE_URL: m.baseUrl,
    ANTHROPIC_AUTH_TOKEN: m.apiKey,
    ANTHROPIC_DEFAULT_OPUS_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_SONNET_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_FABLE_MODEL: m.modelID,
    ANTHROPIC_DEFAULT_OPUS_MODEL_NAME: m.modelID,
    ANTHROPIC_DEFAULT_SONNET_MODEL_NAME: m.modelID,
    ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME: m.modelID,
    ANTHROPIC_DEFAULT_FABLE_MODEL_NAME: m.modelID,
    ANTHROPIC_MODEL: m.modelID,
    CLAUDE_CODE_SUBAGENT_MODEL: m.modelID
  }
  if (mode === 'plan') env.MAX_THINKING_TOKENS = '16000'
  return JSON.stringify({ env }, null, 2)
}

/** Sanitize a model's display name into something safe to use as a filename. */
function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/^_+|_+$/g, '')
  return cleaned || 'model'
}

function aliasFor(mode: Mode, filename: string): string {
  const permission = mode === 'plan' ? '--permission-mode plan ' : ''
  return `alias cc-${mode[0]}='claude ${permission}--setting-sources "" --settings "$CC_MODE_DIR/${filename}.json"'`
}

/**
 * Pick the active (mode, model) pair: currentMode's model if bound, else fall
 * back to whichever mode is bound. Returns null when nothing is bound.
 */
const active = computed<{ mode: Mode; model: ModelConfig } | null>(() => {
  if (currentMode.value === 'plan' && planModel.value) {
    return { mode: 'plan', model: planModel.value }
  }
  if (currentMode.value === 'work' && workModel.value) {
    return { mode: 'work', model: workModel.value }
  }
  if (planModel.value) return { mode: 'plan', model: planModel.value }
  if (workModel.value) return { mode: 'work', model: workModel.value }
  return null
})

const command = computed(() => {
  const a = active.value
  if (!a) return t('switcher.needModel')
  const { mode, model: m } = a
  const filename = safeFileName(m.name)
  const desc = mode === 'plan' ? t('switcher.ccpDesc') : t('switcher.ccwDesc')

  return [
    `# ${desc}`,
    ...envExports(m, mode),
    '',
    `# ${t('switcher.tmpDir')}`,
    `CC_MODE_DIR=$(mktemp -d -t cc-mode-XXXXXX)`,
    '',
    `cat > "$CC_MODE_DIR/${filename}.json" <<'CCMODE_EOF'`,
    settingsJsonFor(m, mode),
    `CCMODE_EOF`,
    '',
    `# ${t('switcher.aliasesLabel')}`,
    aliasFor(mode, filename)
  ].join('\n')
})

async function copyCommand(): Promise<void> {
  await copyText(command.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function openInTerminal(): Promise<void> {
  if (!active.value) {
    toast.error(t('switcher.launchNoModel'))
    return
  }
  const setup = [
    command.value,
    `echo "${t('switcher.launchHint')}"`
  ].join('\n')
  const r = await launchInTerminal(setup)
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
  height: 220px;
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
