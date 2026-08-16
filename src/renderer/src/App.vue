<template>
  <div id="app">
    <header class="header">
      <div>
        <h1>🎯 CC Mode Switcher</h1>
        <p>Plan / Work dual-mode environment switcher for Claude Code</p>
      </div>
      <nav class="tabs">
        <button :class="['tab', { active: activeTab === 'models' }]" @click="activeTab = 'models'">
          Models
        </button>
        <button :class="['tab', { active: activeTab === 'switcher' }]" @click="activeTab = 'switcher'">
          Switcher
        </button>
      </nav>
    </header>

    <main class="content">
      <!-- Models Tab -->
      <section v-if="activeTab === 'models'">
        <div class="section-header">
          <h2>Configured Models</h2>
          <button class="btn-primary" @click="showAdd = true">+ Add Model</button>
        </div>

        <div v-if="showAdd" class="card" style="margin-bottom: 16px;">
          <div class="form-grid">
            <div class="form-group">
              <label>Display Name</label>
              <input v-model="newModel.name" placeholder="e.g. GLM-Lite" />
            </div>
            <div class="form-group">
              <label>Base URL</label>
              <input v-model="newModel.baseUrl" placeholder="https://open.bigmodel.cn/api/paas/v4" />
            </div>
            <div class="form-group full">
              <label>API Key</label>
              <input v-model="newModel.apiKey" type="password" placeholder="sk-..." />
            </div>
            <div class="form-group">
              <label>Plan Model ID</label>
              <input v-model="newModel.planModel" placeholder="glm-5.2" />
            </div>
            <div class="form-group">
              <label>Work Model ID</label>
              <input v-model="newModel.workModel" placeholder="MiniMax-M3" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-ghost" @click="showAdd = false">Cancel</button>
            <button class="btn-success" @click="addModel">Save</button>
          </div>
        </div>

        <div v-if="models.length === 0" class="empty">No models configured yet. Click the button above to add one.</div>
        <div v-else>
          <div v-for="(m, i) in models" :key="i" class="model-card">
            <div>
              <div class="model-name">{{ m.name }}</div>
              <div class="model-url">{{ m.baseUrl }}</div>
              <div class="model-tags">
                <span class="tag">Plan: {{ m.planModel }}</span>
                <span class="tag">Work: {{ m.workModel }}</span>
              </div>
            </div>
            <button class="btn-danger" @click="removeModel(i)">Delete</button>
          </div>
        </div>
      </section>

      <!-- Switcher Tab -->
      <section v-if="activeTab === 'switcher'">
        <div class="mode-grid">
          <div
            :class="['mode-card', { active: currentMode === 'plan', plan: currentMode === 'plan' }]"
            @click="currentMode = 'plan'"
          >
            <div class="emoji">🧠</div>
            <div class="title">Plan Mode</div>
            <div class="desc">Architecture analysis / Design / Code review</div>
            <div v-if="planModel" class="badge">{{ planModel.name }} · {{ planModel.planModel }}</div>
            <div v-else class="warning">⚠️ No model bound</div>
          </div>

          <div
            :class="['mode-card', { active: currentMode === 'work', work: currentMode === 'work' }]"
            @click="currentMode = 'work'"
          >
            <div class="emoji">⚡</div>
            <div class="title">Work Mode</div>
            <div class="desc">Implementation / Debug / File operations</div>
            <div v-if="workModel" class="badge">{{ workModel.name }} · {{ workModel.workModel }}</div>
            <div v-else class="warning">⚠️ No model bound</div>
          </div>
        </div>

        <div class="card" style="margin-bottom: 16px;">
          <div class="card-title">Mode Binding</div>
          <div class="form-grid">
            <div class="form-group">
              <label>Plan uses model</label>
              <select v-model.number="planIndex">
                <option value="">Select...</option>
                <option v-for="(m, i) in models" :key="i" :value="i">{{ m.name }} ({{ m.planModel }})</option>
              </select>
            </div>
            <div class="form-group">
              <label>Work uses model</label>
              <select v-model.number="workIndex">
                <option value="">Select...</option>
                <option v-for="(m, i) in models" :key="i" :value="i">{{ m.name }} ({{ m.workModel }})</option>
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
            <div style="display: flex; gap: 8px;">
              <button class="btn-ghost" style="font-size: 12px;" @click="installCLI">🔧 Install CLI Tool</button>
              <button :class="['btn-primary', { copied }]" @click="copyCommand">
                {{ copied ? '✅ Copied' : '📋 Copy Command' }}
              </button>
            </div>
          </div>
          <textarea class="command" readonly :value="command"></textarea>
          <div class="command-tip">
            💡 After execution, a new Claude Code session starts in
            <strong>{{ currentMode === 'plan' ? 'Plan (analysis/design)' : 'Work (coding/execution)' }}</strong> mode
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { ModelConfig, Mode } from './types'

const activeTab = ref<'models' | 'switcher'>('switcher')
const showAdd = ref(false)
const currentMode = ref<Mode>('plan')
const copied = ref(false)
const planIndex = ref<number | ''>('')
const workIndex = ref<number | ''>('')
const models = ref<ModelConfig[]>([])

const newModel = ref<ModelConfig>({
  name: '',
  baseUrl: '',
  apiKey: '',
  planModel: '',
  workModel: ''
})

const planModel = computed(() => {
  if (planIndex.value === '') return null
  return models.value[planIndex.value] ?? null
})

const workModel = computed(() => {
  if (workIndex.value === '') return null
  return models.value[workIndex.value] ?? null
})

const command = computed(() => {
  const m = currentMode.value === 'plan' ? planModel.value : workModel.value
  const modelId = currentMode.value === 'plan' ? (m?.planModel ?? '') : (m?.workModel ?? '')

  if (!m) {
    return '# Please add a model in "Models" tab and bind it in "Switcher" tab first'
  }

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

function addModel() {
  if (!newModel.value.name || !newModel.value.baseUrl || !newModel.value.apiKey) {
    alert('Please fill in Name, Base URL and API Key')
    return
  }
  models.value.push({ ...newModel.value })
  newModel.value = { name: '', baseUrl: '', apiKey: '', planModel: '', workModel: '' }
  showAdd.value = false
}

function removeModel(i: number) {
  if (!confirm('Are you sure you want to delete this model configuration?')) return
  models.value.splice(i, 1)
  if (planIndex.value === i) planIndex.value = ''
  else if (typeof planIndex.value === 'number' && planIndex.value > i) planIndex.value--
  if (workIndex.value === i) workIndex.value = ''
  else if (typeof workIndex.value === 'number' && workIndex.value > i) workIndex.value--
}

async function copyCommand() {
  try {
    await window.electronAPI.copyToClipboard(command.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Fallback for non-Electron environments
    const ta = document.createElement('textarea')
    ta.value = command.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}

async function installCLI() {
  const result = await window.electronAPI.installCLI()
  if (result.success) {
    alert(`✅ Installed to ${result.path}\n\nYou can now run in terminal:\ncc-mode-switcher`)
  } else {
    alert('❌ Installation failed: ' + result.error)
  }
}

// Persist to localStorage
onMounted(() => {
  try {
    const saved = localStorage.getItem('cc_models')
    if (saved) models.value = JSON.parse(saved)
    const p = localStorage.getItem('cc_plan')
    const w = localStorage.getItem('cc_work')
    if (p !== null) planIndex.value = p === '' ? '' : parseInt(p)
    if (w !== null) workIndex.value = w === '' ? '' : parseInt(w)
  } catch {}
})

watch(
  models,
  (v) => localStorage.setItem('cc_models', JSON.stringify(v)),
  { deep: true }
)
watch(planIndex, (v) => localStorage.setItem('cc_plan', String(v)))
watch(workIndex, (v) => localStorage.setItem('cc_work', String(v)))
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #09090b;
  color: #e4e4e7;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #27272a;
  -webkit-app-region: drag;
  flex-shrink: 0;
}
.header h1 { font-size: 18px; font-weight: 600; color: #fafafa; }
.header p { font-size: 12px; color: #71717a; margin-top: 2px; }

.tabs {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}
.tab {
  background: transparent;
  color: #a1a1aa;
  border: 1px solid transparent;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.tab.active {
  background: #27272a;
  color: #fafafa;
  border-color: #3f3f46;
  font-weight: 500;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-header h2 { font-size: 16px; color: #d4d4d8; }

.card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 16px;
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #fafafa;
  margin-bottom: 12px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}
.btn-primary:hover { background: #2563eb; }
.btn-primary.copied { background: #22c55e; }

.btn-success {
  background: #22c55e;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}

.btn-ghost {
  background: transparent;
  color: #a1a1aa;
  border: 1px solid #27272a;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.btn-ghost:hover { border-color: #3f3f46; color: #e4e4e7; }

.btn-danger {
  background: transparent;
  color: #ef4444;
  border: 1px solid #3f3f46;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.form-group { margin-bottom: 0; }
.form-group.full { grid-column: 1 / -1; }
.form-group label {
  display: block;
  font-size: 12px;
  color: #a1a1aa;
  margin-bottom: 4px;
}
.form-group input,
.form-group select {
  width: 100%;
  background: #09090b;
  border: 1px solid #27272a;
  color: #e4e4e7;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}
.form-group input:focus,
.form-group select:focus { border-color: #3b82f6; }

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 12px;
}

.model-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 10px;
}
.model-name { font-weight: 600; font-size: 14px; color: #fafafa; margin-bottom: 2px; }
.model-url { font-size: 12px; color: #71717a; font-family: monospace; }
.model-tags { margin-top: 6px; }
.tag {
  display: inline-block;
  background: #27272a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #a1a1aa;
  margin-right: 6px;
}

.empty {
  text-align: center;
  padding: 48px;
  color: #71717a;
  font-size: 14px;
}

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.mode-card {
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid #27272a;
  background: #18181b;
}
.mode-card:hover { border-color: #3f3f46; }
.mode-card.active.plan {
  background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}
.mode-card.active.work {
  background: linear-gradient(135deg, #3f1e5f 0%, #0f172a 100%);
  border-color: #a855f7;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
}
.mode-card .emoji { font-size: 32px; margin-bottom: 10px; }
.mode-card .title { font-weight: 700; font-size: 16px; margin-bottom: 4px; color: #fafafa; }
.mode-card .desc { font-size: 12px; color: #a1a1aa; }
.mode-card .badge {
  margin-top: 10px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 6px;
  display: inline-block;
  color: #e4e4e7;
}
.mode-card .warning { margin-top: 10px; font-size: 12px; color: #fbbf24; }

.command-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.command-header h3 { font-size: 14px; color: #fafafa; }
.command-header h3 span { font-weight: normal; color: #71717a; font-size: 12px; }

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

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #09090b; }
::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
</style>