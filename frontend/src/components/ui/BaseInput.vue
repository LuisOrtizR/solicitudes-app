<script setup lang="ts">
import type { Component } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    modelValue: string;
    type?: string;
    placeholder?: string;
    label?: string;
    autocomplete?: string;
    icon?: Component;
  }>(),
  { type: "text" }
);
defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div>
    <label v-if="label" class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">{{ label }}</label>
    <div class="relative">
      <component
        :is="icon"
        v-if="icon"
        class="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
      />
      <input
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        v-bind="$attrs"
        :class="[
          'border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg py-2.5 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-400 w-full',
          icon ? 'pl-10' : 'pl-3',
        ]"
      />
    </div>
  </div>
</template>
