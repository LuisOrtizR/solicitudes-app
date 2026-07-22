<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "danger" | "danger-solid";
  }>(),
  { variant: "primary" }
);

const variantClass = computed(() => ({
  primary: "bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400 text-white",
  secondary:
    "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800",
  danger:
    "border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40",
  "danger-solid": "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 text-white",
}[props.variant]));
</script>

<template>
  <button
    :class="[
      'rounded-lg text-sm font-medium px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2',
      variantClass,
    ]"
  >
    <slot />
  </button>
</template>
