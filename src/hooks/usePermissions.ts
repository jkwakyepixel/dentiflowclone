import { useAuth } from '../contexts/AuthContext';
import { useClinic } from '../contexts/ClinicContext';
import { DEFAULT_ROLE_PERMISSIONS, type AppPermission, type RoleType } from '../config/permissions';

export const usePermissions = () => {
  const { userData } = useAuth();
  const { clinicProfile } = useClinic();

  const hasPermission = (permission: AppPermission): boolean => {
    if (!userData) return false;

    const role = (userData.role || 'staff') as RoleType;
    
    // Check if the clinic has custom permissions for this role, otherwise use defaults
    const rolePermissionsMap = clinicProfile.rolePermissions || DEFAULT_ROLE_PERMISSIONS;
    const permissionsForRole = rolePermissionsMap[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
    
    return permissionsForRole.includes(permission);
  };

  return { hasPermission };
};
