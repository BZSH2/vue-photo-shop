import type { Ref } from 'vue';
import { ref } from 'vue';

const loading = ref(false);

export function useLoading(): {
  loading: Ref<boolean>;
  open: () => void;
  close: () => void;
  toggle: () => void;
} {
  const open = (): void => {
    loading.value = true;
  };

  const close = (): void => {
    loading.value = false;
  };

  const toggle = (): void => {
    loading.value = !loading.value;
  };

  return {
    loading,
    open,
    close,
    toggle,
  };
}
