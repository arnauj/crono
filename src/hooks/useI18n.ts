import { useSyncExternalStore } from 'react';
import { subscribe, getLang, t } from '../utils/i18n';

export function useT(): typeof t {
  useSyncExternalStore(subscribe, getLang);
  return t;
}
