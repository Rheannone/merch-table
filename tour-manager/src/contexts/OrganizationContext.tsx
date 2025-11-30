"use client";

/**
 * Organization Context
 *
 * Manages the current organization, list of user's organizations,
 * organization switching, and user's role within the current organization.
 *
 * Persists current organization ID to localStorage for session continuity.
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { OrganizationWithRole, OrganizationRole } from "@/types";
import { loadUserOrganizations } from "@/lib/supabase/data";
import { useAuth } from "@/components/AuthProvider";

interface OrganizationContextType {
  // Current organization
  currentOrganization: OrganizationWithRole | null;
  // All organizations user belongs to
  organizations: OrganizationWithRole[];
  // User's role in current organization
  userRole: OrganizationRole | null;
  // Loading state
  loading: boolean;
  // Switch to a different organization
  switchOrganization: (organizationId: string) => Promise<void>;
  // Refresh organizations list (call after creating/joining/leaving)
  refreshOrganizations: () => Promise<void>;
  // Helper: Check if user has at least a certain role
  hasRole: (
    requiredRole: OrganizationRole,
    roles?: OrganizationRole[]
  ) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

const STORAGE_KEY = "road-dog-current-org-id";

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: OrganizationRole[] = [
  "viewer",
  "member",
  "admin",
  "owner",
];

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>(
    []
  );
  const [currentOrganization, setCurrentOrganization] =
    useState<OrganizationWithRole | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Load organizations on mount or when user changes
  useEffect(() => {
    if (!user) {
      // User logged out - clear state
      setOrganizations([]);
      setCurrentOrganization(null);
      setUserRole(null);
      setLoading(false);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    loadOrganizationsForUser();
  }, [user]);

  /**
   * Load all organizations for the current user
   */
  const loadOrganizationsForUser = async () => {
    setLoading(true);
    try {
      const orgs = await loadUserOrganizations();
      setOrganizations(orgs);

      if (orgs.length === 0) {
        // No organizations yet (shouldn't happen due to auto-migration)
        console.warn("User has no organizations");
        setCurrentOrganization(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Try to restore previously selected organization
      const storedOrgId = localStorage.getItem(STORAGE_KEY);
      let selectedOrg: OrganizationWithRole | null = null;

      if (storedOrgId) {
        selectedOrg = orgs.find((org) => org.id === storedOrgId) || null;
      }

      // If no stored org or stored org not found, use first org (usually personal org)
      if (!selectedOrg) {
        selectedOrg = orgs[0];
        localStorage.setItem(STORAGE_KEY, selectedOrg.id);
      }

      setCurrentOrganization(selectedOrg);
      setUserRole(selectedOrg.role);
      console.log(
        `✅ Loaded ${orgs.length} organizations, current: ${selectedOrg.name} (${selectedOrg.role})`
      );
    } catch (error) {
      console.error("Failed to load organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Switch to a different organization
   */
  const switchOrganization = async (organizationId: string) => {
    const targetOrg = organizations.find((org) => org.id === organizationId);

    if (!targetOrg) {
      console.error(`Organization ${organizationId} not found in user's orgs`);
      return;
    }

    console.log(
      `🔄 Switching to organization: ${targetOrg.name} (${targetOrg.role})`
    );

    // Clear IndexedDB cache when switching organizations
    // This ensures we load fresh data from Supabase for the new org
    try {
      const { clearAllData } = await import("@/lib/db");
      await clearAllData();
      console.log("🗑️ Cleared IndexedDB cache for organization switch");
    } catch (error) {
      console.error("Failed to clear IndexedDB cache:", error);
    }

    // Update current organization
    setCurrentOrganization(targetOrg);
    setUserRole(targetOrg.role);
    localStorage.setItem(STORAGE_KEY, organizationId);

    console.log(`✅ Switched to: ${targetOrg.name}`);

    // The app will automatically re-initialize and load data for the new org
    // via the useEffect in page.tsx that watches currentOrganization?.id
  };

  /**
   * Refresh organizations list (call after creating/joining/leaving)
   */
  const refreshOrganizations = async () => {
    await loadOrganizationsForUser();
  };

  /**
   * Check if user has at least the required role in current organization
   *
   * @param requiredRole - Minimum role required
   * @param roles - Custom role hierarchy (optional, uses default if not provided)
   * @returns true if user has required role or higher
   */
  const hasRole = (
    requiredRole: OrganizationRole,
    roles: OrganizationRole[] = ROLE_HIERARCHY
  ): boolean => {
    if (!userRole) return false;

    const requiredIndex = roles.indexOf(requiredRole);
    const userRoleIndex = roles.indexOf(userRole);

    return userRoleIndex >= requiredIndex;
  };

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    userRole,
    loading,
    switchOrganization,
    refreshOrganizations,
    hasRole,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook to access organization context
 */
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
