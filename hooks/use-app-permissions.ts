import { useOrganization } from "@/contexts/organization-context";

/**
 * Custom hook to check user permissions for app-level actions
 * Returns permission flags and user role
 */
export function useAppPermissions() {
  const { selectedOrg } = useOrganization();

  const userRole = selectedOrg?.role || "viewer";

  // Permission levels
  const isOwner = userRole === "owner";
  const isAdmin = userRole === "admin";
  const isMember = userRole === "member";
  const isViewer = userRole === "viewer";

  // Granular permissions
  const canManageApp = isOwner || isAdmin; // Can rename, delete app
  const canManageSettings = isOwner || isAdmin; // Can update app settings
  const canManagePlans = isOwner || isAdmin; // Can create, edit, delete plans
  const canManageCustomers = isOwner || isAdmin || isMember; // Can add, edit customers
  const canManageSubscriptions = isOwner || isAdmin || isMember; // Can manage subscriptions
  const canManageInvoices = isOwner || isAdmin || isMember; // Can create, edit invoices
  const canManageWebhooks = isOwner || isAdmin; // Can manage webhooks
  const canManageApiKeys = isOwner || isAdmin; // Can manage API keys
  const canViewAnalytics = true; // Everyone can view
  const canDeleteOrganization = isOwner; // Only owner can delete org

  return {
    userRole,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    canManageApp,
    canManageSettings,
    canManagePlans,
    canManageCustomers,
    canManageSubscriptions,
    canManageInvoices,
    canManageWebhooks,
    canManageApiKeys,
    canViewAnalytics,
    canDeleteOrganization,
  };
}

/**
 * Get permission message for a specific action
 */
export function getPermissionMessage(
  requiredRoles: ("owner" | "admin" | "member")[]
): string {
  if (requiredRoles.includes("owner") && requiredRoles.length === 1) {
    return "⚠️ Only organization owners can perform this action.";
  }

  if (requiredRoles.includes("owner") && requiredRoles.includes("admin")) {
    return "⚠️ Only organization owners and admins can perform this action.";
  }

  if (requiredRoles.includes("member")) {
    return "⚠️ Only organization owners, admins, and members can perform this action.";
  }

  return "⚠️ You don't have permission to perform this action.";
}
