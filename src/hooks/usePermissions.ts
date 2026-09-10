import { useAppSelector } from '../app/hooks';

// Alias mapping for modules that may have different display or DB names across backend / frontend
const MODULE_ALIASES: Record<string, string[]> = {
  "Purchase Return": ["Purchase Return", "Purchase Return Invoice"],
  "Purchase Return Invoice": ["Purchase Return", "Purchase Return Invoice"],
  "Purchase Invoice": ["Purchase Invoice", "Purchase"],
  "Sales Invoice": ["Sales Invoice", "Sales"],
};

export const usePermissions = () => {
  const isMaster = useAppSelector((state) => state.auth.isMaster);
  const userRoles = useAppSelector((state) => state.auth.userRoles);

  const hasPermission = (moduleName: string | string[], action: string) => {
    // Global bypass: allow all permissions if flag is set in .env (works in dev and production)
    if (import.meta.env.VITE_BYPASS_PERMISSIONS === 'true') {
      return true;
    }

    // Master users have full access (flagged from backend)
    if (isMaster) {
      return true;
    }

    const targetModules = Array.isArray(moduleName) ? moduleName : [moduleName];
    const expandedModules = new Set<string>();

    targetModules.forEach((m) => {
      expandedModules.add(m);
      if (MODULE_ALIASES[m]) {
        MODULE_ALIASES[m].forEach((alias) => expandedModules.add(alias));
      }
    });

    // Check if there is an active permission for any of the target module names and action
    return userRoles?.some(
      (role) => expandedModules.has(role.module) && role.action === action && role.status !== false
    ) ?? false;
  };

  return { hasPermission };
};
