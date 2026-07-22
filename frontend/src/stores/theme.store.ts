import { defineStore } from "pinia";

const STORAGE_KEY = "theme";

type ThemeMode = "light" | "dark";

const applyClass = (mode: ThemeMode) => {
  document.documentElement.classList.toggle("dark", mode === "dark");
};

export const useThemeStore = defineStore("theme", {
  state: () => ({
    mode: "light" as ThemeMode,
  }),

  actions: {
    init() {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      this.mode = stored === "dark" ? "dark" : "light";
      applyClass(this.mode);
    },

    toggle() {
      this.mode = this.mode === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, this.mode);
      applyClass(this.mode);
    },
  },
});
