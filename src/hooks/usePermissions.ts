import { useAppSelector } from '../app/hooks';

export const usePermissions = () => {
  const isMaster = useAppSelector((state) => state.auth.isMaster);
  const userRoles = useAppSelector((state) => state.auth.userRoles);

  const hasPermission = (moduleName: string, action: string) => {
    // Development bypass: allow all permissions if flag is set in .env.development
    if (import.meta.env.DEV && import.meta.env.VITE_BYPASS_PERMISSIONS === 'true') {
      return true;
    }

    // Master users have full access
    if (isMaster) {
      return true;
    }

    // Check if there is an active permission for the given module and action
    return userRoles?.some(
      (role) => role.module === moduleName && role.action === action
    ) ?? false;
  };


  return { hasPermission };
};
