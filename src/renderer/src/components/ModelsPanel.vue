<template>
  <section>
    <div class="section-header">
      <h2>{{ t('models.title') }}</h2>
      <IconButton
        v-if="!showAdd && !editingId"
        icon="➕"
        :tip="t('models.addTip')"
        variant="primary"
        @confirm="openAdd"
      />
    </div>

    <!-- Add / Edit form (shared component) -->
    <ModelForm
      v-if="showAdd || editingId"
      :key="editingId ?? 'new'"
      :title="editingId ? t('form.editTitle') : t('form.addTitle')"
      :submit-text="editingId ? t('form.submitEdit') : t('form.submitAdd')"
      :initial="editingModel"
      @save="onSave"
      @cancel="closeForm"
    />

    <div v-if="models.length === 0" class="empty">{{ t('models.empty') }}</div>
    <div v-else>
      <ModelCard
        v-for="(m, i) in models"
        :key="m.id"
        :model="m"
        :dragging="dragFrom === i"
        :over="overIdx === i ? overPos : null"
        @edit="openEdit(m)"
        @copy="onCopy(m)"
        @remove="deletingId = m.id"
        @drag-start="onDragStart(i, $event)"
        @drag-over="onDragOver(i, $event)"
        @drop="onDrop(i)"
        @drag-end="resetDrag"
      />
    </div>

    <!-- delete confirmation -->
    <ConfirmModal
      v-if="deletingModel"
      :title="t('modal.deleteTitle')"
      :message="t('modal.deleteMessage', { name: deletingModel.name })"
      :confirm-text="t('modal.delete')"
      danger
      @confirm="onRemove(deletingModel)"
      @cancel="deletingId = null"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ModelConfig } from '../types'
import { useModels } from '../composables/useModels'
import { useToast } from '../composables/useToast'
import { useI18n } from '../composables/useI18n'
import ModelForm from './ModelForm.vue'
import ModelCard from './ModelCard.vue'
import IconButton from './IconButton.vue'
import ConfirmModal from './ConfirmModal.vue'

const { models, addModel, updateModel, removeModel, moveModel, duplicateModel } = useModels()
const toast = useToast()
const { t } = useI18n()

// ----- add / edit -----
const showAdd = ref(false)
const editingId = ref<string | null>(null)

const editingModel = computed(() => models.value.find((m) => m.id === editingId.value) ?? null)

function openAdd(): void {
  showAdd.value = true
  editingId.value = null
}

function openEdit(m: ModelConfig): void {
  editingId.value = m.id
  showAdd.value = false
}

function closeForm(): void {
  showAdd.value = false
  editingId.value = null
}

function onSave(model: ModelConfig): void {
  if (editingId.value) updateModel(editingId.value, model)
  else addModel(model)
  closeForm()
}

function onCopy(m: ModelConfig): void {
  const copy = duplicateModel(m.id)
  if (copy) toast.success(t('toast.duplicated', { name: copy.name }))
}

// ----- delete (modal confirm) -----
const deletingId = ref<string | null>(null)
const deletingModel = computed(() => models.value.find((m) => m.id === deletingId.value) ?? null)

function onRemove(m: ModelConfig): void {
  removeModel(m.id)
  deletingId.value = null
  if (editingId.value === m.id) closeForm()
}

// ----- drag & drop sorting -----
const dragFrom = ref<number | null>(null)
const overIdx = ref<number | null>(null)
const overPos = ref<'before' | 'after' | null>(null)

function onDragStart(i: number, ev: DragEvent): void {
  dragFrom.value = i
  // Chromium needs data set for the drag to carry
  ev.dataTransfer?.setData('text/plain', String(i))
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
}

function onDragOver(i: number, ev: DragEvent): void {
  if (dragFrom.value === null || i === dragFrom.value) return
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  overIdx.value = i
  overPos.value = ev.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

function onDrop(i: number): void {
  if (dragFrom.value === null || overPos.value === null) return
  let to = overPos.value === 'after' ? i + 1 : i
  if (dragFrom.value < to) to -= 1
  moveModel(dragFrom.value, to)
  resetDrag()
}

function resetDrag(): void {
  dragFrom.value = null
  overIdx.value = null
  overPos.value = null
}
</script>
