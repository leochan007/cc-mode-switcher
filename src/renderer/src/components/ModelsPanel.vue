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
        v-for="m in models"
        :key="m.id"
        :model="m"
        @edit="openEdit(m)"
        @copy="onCopy(m)"
        @remove="deletingId = m.id"
      />
    </div>

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
import { useConfig } from '../composables/useConfig'
import { useToast } from '../composables/useToast'
import { useI18n } from '../composables/useI18n'
import ModelForm from './ModelForm.vue'
import ModelCard from './ModelCard.vue'
import IconButton from './IconButton.vue'
import ConfirmModal from './ConfirmModal.vue'

const { models, addModel, updateModel, removeModel, duplicateModel } = useConfig()
const toast = useToast()
const { t } = useI18n()

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

async function onSave(model: ModelConfig): Promise<void> {
  if (editingId.value) await updateModel(editingId.value, model)
  else await addModel(model)
  closeForm()
}

async function onCopy(m: ModelConfig): Promise<void> {
  const copy = await duplicateModel(m.id)
  if (copy) toast.success(t('toast.duplicated', { name: copy.name }))
}

const deletingId = ref<string | null>(null)
const deletingModel = computed(() => models.value.find((m) => m.id === deletingId.value) ?? null)

async function onRemove(m: ModelConfig): Promise<void> {
  await removeModel(m.id)
  deletingId.value = null
  if (editingId.value === m.id) closeForm()
}
</script>