import { ref, reactive, computed, watch, onUnmounted, type Ref } from "vue";
import { isAxiosError } from "axios";

export interface ListQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterChip {
  key: string;
  label: string;
}

export function useListQuery<T, TFilters extends object>(
  fetchFn: (params: { page: number; limit: number; search?: string } & TFilters) => Promise<ListQueryResult<T>>,
  options: {
    initialFilters: TFilters;
    filterLabels: Partial<Record<keyof TFilters, (value: string) => string>>;
  }
) {
  const page = ref(1);
  const limit = ref(10);
  const search = ref("");
  const filters = reactive({ ...options.initialFilters }) as TFilters;

  const data = ref([]) as Ref<T[]>;
  const total = ref(0);
  const totalPages = ref(1);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let requestToken = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const fetchNow = async () => {
    const token = ++requestToken;
    loading.value = true;
    error.value = null;

    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== "")
      ) as TFilters;

      const result = await fetchFn({
        page: page.value,
        limit: limit.value,
        search: search.value || undefined,
        ...cleanFilters,
      });

      if (token !== requestToken) return; // respuesta obsoleta, se descarta

      data.value = result.data;
      total.value = result.total;
      totalPages.value = result.totalPages;
    } catch (err: unknown) {
      if (token !== requestToken) return;
      const message =
        isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : undefined;
      error.value = message ?? "Error cargando datos";
    } finally {
      if (token === requestToken) loading.value = false;
    }
  };

  const setFilter = <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
    filters[key] = value;
    page.value = 1;
  };

  const clearFilter = (key: keyof TFilters) => {
    filters[key] = undefined as TFilters[keyof TFilters];
    page.value = 1;
  };

  const activeFilterChips = computed<FilterChip[]>(() =>
    (Object.keys(filters) as (keyof TFilters)[])
      .filter((key) => filters[key] !== undefined && filters[key] !== "")
      .map((key) => ({
        key: String(key),
        label: options.filterLabels[key]?.(filters[key] as string) ?? `${String(key)}: ${filters[key]}`,
      }))
  );

  watch(search, () => {
    page.value = 1;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fetchNow, 300);
  });

  watch(page, fetchNow);
  watch(limit, () => {
    page.value = 1;
    fetchNow();
  });
  watch(
    () => ({ ...filters }),
    fetchNow,
    { deep: true }
  );

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return {
    page,
    limit,
    search,
    filters,
    data,
    total,
    totalPages,
    loading,
    error,
    activeFilterChips,
    setFilter,
    clearFilter,
    refetch: fetchNow,
  };
}
