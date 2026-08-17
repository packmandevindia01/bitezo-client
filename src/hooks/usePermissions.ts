import { useAppSelector } from '../app/hooks';

export const usePermissions = () => {
  const isMaster = useAppSelector((state) => state.auth.isMaster);
  const userRoles = useAppSelector((state) => state.auth.userRoles);

  const hasPermission = (moduleName: string, action: string) => {
    // Global bypass: allow all permissions if flag is set in .env (works in dev and production)
    if (import.meta.env.VITE_BYPASS_PERMISSIONS === 'true') {
      return true;
    }

    // Master users have full access (flagged from backend)
    if (isMaster) {
      return true;
    }

    // Check if there is an active permission for the given module and action
    return userRoles?.some(
      (role) => role.module === moduleName && role.action === action && role.status !== false
    ) ?? false;
  };


  return { hasPermission };
};
