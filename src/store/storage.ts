import type { AppStoreState } from './appStore';

const STORAGE_KEY = 'aegis_defense_frontend_store_v1';

/**
 * Single Storage Layer for Pure Client-Side Persistence
 */
export const storage = {
  loadAppState(): AppStoreState | null {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (!item) return null;
      const parsed = JSON.parse(item);
      if (parsed && typeof parsed === 'object') {
        return parsed as AppStoreState;
      }
      return null;
    } catch (e) {
      console.error('Failed to load app state from localStorage:', e);
      return null;
    }
  },

  saveAppState(state: AppStoreState): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Failed to save app state to localStorage:', e);
      return false;
    }
  },

  clearAppState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('aegis_auth_token');
      localStorage.removeItem('aegis_admin_token');
      localStorage.removeItem('aegis_auth_session');
    } catch (e) {
      console.error('Failed to clear app state:', e);
    }
  },

  exportAppState(state: AppStoreState): string {
    return JSON.stringify(state, null, 2);
  },

  importAppState(jsonString: string): { success: boolean; message: string; newState?: AppStoreState } {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic schema validation
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Invalid JSON format. Expected an object.' };
      }

      if (!Array.isArray(parsed.customers) && !Array.isArray(parsed.users)) {
        return { success: false, message: 'Invalid store structure: Missing customers or users array.' };
      }

      this.saveAppState(parsed);
      return {
        success: true,
        message: 'Application state imported successfully!',
        newState: parsed as AppStoreState,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Failed to import JSON: ${e?.message || 'Syntax error'}`,
      };
    }
  },
};

export const loadAppState = () => storage.loadAppState();
export const saveAppState = (state: AppStoreState) => storage.saveAppState(state);
export const clearAppState = () => storage.clearAppState();
export const exportAppState = (state: AppStoreState) => storage.exportAppState(state);
export const importAppState = (jsonString: string) => storage.importAppState(jsonString);
