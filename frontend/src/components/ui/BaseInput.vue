<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    label?: string;
    autocomplete?: string;
  }>(),
  { type: "text" }
);

defineEmits<{ (e: "update:modelValue", value: string): void }>();
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      class="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white
             dark:placeholder:text-gray-500 rounded-lg px-3 py-2.5 text-sm outline-none transition
             focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400"
    />
  </div>
</template>
