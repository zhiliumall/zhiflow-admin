<template>
  <el-dialog v-model="open" title="列设置" width="360px" append-to-body>
    <p class="column-preference__hint">仅保存在当前浏览器</p>
    <el-checkbox-group v-model="selected">
      <div v-for="column in columns" :key="column.key" class="column-preference__row">
        <el-checkbox :value="column.key" :disabled="column.required">{{ column.label }}</el-checkbox>
      </div>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="reset">恢复默认</el-button>
      <el-button @click="open = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { normalizeColumnPreference, readColumnPreference, isValidColumnPreference, serializeColumnPreference } from '@/utils/columnPreference'

export interface ColumnPreference {
  key: string
  label: string
  defaultVisible?: boolean
  required?: boolean
}

const props = defineProps<{ storageKey: string; columns: ColumnPreference[] }>()
const emit = defineEmits<{ change: [keys: string[]] }>()
const open = ref(false)
const selected = ref<string[]>([])
const defaults = computed(() => props.columns.filter(column => column.defaultVisible !== false || column.required).map(column => column.key))

function normalized(value: unknown) {
  return normalizeColumnPreference(value, props.columns.map(column => column.key), props.columns.filter(column => column.required).map(column => column.key), defaults.value)
}
function load() {
  const allowed = props.columns.map(column => column.key)
  const required = props.columns.filter(column => column.required).map(column => column.key)
  try {
    const raw = localStorage.getItem(props.storageKey)
    if (!isValidColumnPreference(raw)) localStorage.removeItem(props.storageKey)
    selected.value = readColumnPreference(raw, allowed, required, defaults.value)
  } catch {
    selected.value = defaults.value
  }
  emit('change', selected.value)
}
function persist() {
  const next = normalized(selected.value)
  if (next.length !== selected.value.length || next.some((key, index) => key !== selected.value[index])) {
    selected.value = next
    return
  }
  try {
    localStorage.setItem(props.storageKey, serializeColumnPreference(selected.value, props.columns.map(column => column.key)))
  } catch { /* storage unavailable */ }
  emit('change', selected.value)
}
function reset() {
  selected.value = [...defaults.value]
  try { localStorage.removeItem(props.storageKey) } catch { /* storage unavailable */ }
  emit('change', selected.value)
}
function show() { open.value = true }

watch(() => props.storageKey, load, { immediate: true })
watch(selected, persist, { deep: true })
defineExpose({ show, reset, visible: () => selected.value })
</script>

<style scoped>
.column-preference__hint { margin: 0 0 12px; font-size: 14px; color: var(--dc-text-3); }

.column-preference__row { padding: 6px 0; }
</style>
