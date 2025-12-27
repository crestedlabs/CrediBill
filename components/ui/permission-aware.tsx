import React from "react";

interface PermissionAwareFieldProps {
  children: React.ReactNode;
  canEdit: boolean;
  message?: string;
  className?: string;
}

/**
 * Wrapper component that disables children and shows warning message
 * when user doesn't have permission
 */
export function PermissionAwareField({
  children,
  canEdit,
  message = "⚠️ You don't have permission to edit this field.",
  className = "",
}: PermissionAwareFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className={!canEdit ? "opacity-60 pointer-events-none" : ""}>
        {children}
      </div>
      {!canEdit && (
        <p className="text-sm text-amber-600 font-medium">{message}</p>
      )}
    </div>
  );
}

interface PermissionAwareSectionProps {
  children: React.ReactNode;
  canEdit: boolean;
  message?: string;
}

/**
 * Wrapper for entire sections that need permission checks
 * Disables all inputs and shows a banner at the top
 */
export function PermissionAwareSection({
  children,
  canEdit,
  message = "⚠️ You don't have permission to modify these settings.",
}: PermissionAwareSectionProps) {
  return (
    <div className="space-y-4">
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-900 font-medium">{message}</p>
        </div>
      )}
      <div className={!canEdit ? "opacity-60 pointer-events-none" : ""}>
        {children}
      </div>
    </div>
  );
}
