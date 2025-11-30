"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/components/AuthProvider";
import {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  leaveOrganization,
} from "@/lib/supabase/data";
import Toast, { ToastType } from "@/components/Toast";
import {
  BuildingOfficeIcon,
  PlusIcon,
  UserGroupIcon,
  ArrowLeftOnRectangleIcon,
  TrashIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

export default function OrganizationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    organizations,
    currentOrganization,
    refreshOrganizations,
    switchOrganization,
  } = useOrganization();

  const [isCreating, setIsCreating] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      const org = await createOrganization(
        newOrgName.trim(),
        newOrgDescription.trim() || undefined
      );
      if (org) {
        setToast({
          message: `Created organization: ${org.name}`,
          type: "success",
        });
        setNewOrgName("");
        setNewOrgDescription("");
        setIsCreating(false);
        await refreshOrganizations();
      } else {
        setToast({ message: "Failed to create organization", type: "error" });
      }
    } catch (error) {
      console.error("Error creating organization:", error);
      setToast({ message: "Error creating organization", type: "error" });
    }
  };

  const handleUpdateOrganization = async (orgId: string) => {
    if (!editName.trim()) return;

    try {
      const success = await updateOrganization(orgId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });

      if (success) {
        setToast({
          message: "Organization updated successfully",
          type: "success",
        });
        setEditingOrg(null);
        await refreshOrganizations();
      } else {
        setToast({
          message: "Failed to update organization (admin/owner required)",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error updating organization:", error);
      setToast({ message: "Error updating organization", type: "error" });
    }
  };

  const handleDeleteOrganization = async (orgId: string, orgName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${orgName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const success = await deleteOrganization(orgId);
      if (success) {
        setToast({
          message: `Deleted organization: ${orgName}`,
          type: "success",
        });
        await refreshOrganizations();
      } else {
        setToast({
          message: "Failed to delete organization (owner required)",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting organization:", error);
      setToast({ message: "Error deleting organization", type: "error" });
    }
  };

  const handleLeaveOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Are you sure you want to leave "${orgName}"?`)) {
      return;
    }

    try {
      const success = await leaveOrganization(orgId);
      if (success) {
        setToast({ message: `Left organization: ${orgName}`, type: "success" });
        await refreshOrganizations();
      } else {
        setToast({
          message:
            "Cannot leave (transfer ownership first if you're the only owner)",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error leaving organization:", error);
      setToast({ message: "Error leaving organization", type: "error" });
    }
  };

  const startEdit = (orgId: string, name: string, description?: string) => {
    setEditingOrg(orgId);
    setEditName(name);
    setEditDescription(description || "");
  };

  return (
    <div className="min-h-screen bg-theme">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/app")}
            className="mb-4 text-theme-secondary hover:text-theme transition-colors flex items-center gap-2"
          >
            ← Back to App
          </button>
          <h1 className="text-3xl font-bold text-theme flex items-center gap-3">
            <BuildingOfficeIcon className="w-8 h-8" />
            My Organizations
          </h1>
          <p className="text-theme-muted mt-2">
            Manage your organizations, teams, and collaborations
          </p>
        </div>

        {/* Create New Organization */}
        <div className="bg-theme-secondary rounded-lg border border-theme p-6 mb-6">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create New Organization
            </button>
          ) : (
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g., The Awesome Band"
                  className="w-full px-4 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  placeholder="What's this organization about?"
                  rows={3}
                  className="w-full px-4 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewOrgName("");
                    setNewOrgDescription("");
                  }}
                  className="flex-1 bg-theme-tertiary hover:bg-theme text-theme py-2 px-4 rounded-lg transition-colors border border-theme"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Organizations List */}
        <div className="space-y-4">
          {organizations.length === 0 ? (
            <div className="bg-theme-secondary rounded-lg border border-theme p-8 text-center">
              <p className="text-theme-muted">
                No organizations yet. Create one to get started!
              </p>
            </div>
          ) : (
            organizations.map((org) => (
              <div
                key={org.id}
                className={`bg-theme-secondary rounded-lg border ${
                  currentOrganization?.id === org.id
                    ? "border-primary"
                    : "border-theme"
                } p-6 transition-all`}
              >
                {editingOrg === org.id ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-theme mb-2">
                        Organization Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-theme mb-2">
                        Description
                      </label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleUpdateOrganization(org.id)}
                        className="flex-1 bg-primary hover:bg-primary-dark text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingOrg(null)}
                        className="flex-1 bg-theme-tertiary hover:bg-theme text-theme py-2 px-4 rounded-lg transition-colors border border-theme"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-theme flex items-center gap-2">
                          {org.name}
                          {currentOrganization?.id === org.id && (
                            <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                              Current
                            </span>
                          )}
                        </h3>
                        {org.description && (
                          <p className="text-theme-muted mt-1">
                            {org.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm px-3 py-1 rounded-full ${
                            org.role === "owner"
                              ? "bg-purple-100 text-purple-800"
                              : org.role === "admin"
                              ? "bg-blue-100 text-blue-800"
                              : org.role === "member"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {org.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-theme-muted mb-4">
                      <div className="flex items-center gap-1">
                        <UserGroupIcon className="w-4 h-4" />
                        {org.memberCount}{" "}
                        {org.memberCount === 1 ? "member" : "members"}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {currentOrganization?.id !== org.id && (
                        <button
                          onClick={() => switchOrganization(org.id)}
                          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm"
                        >
                          Switch to This Org
                        </button>
                      )}

                      {(org.role === "owner" || org.role === "admin") && (
                        <button
                          onClick={() =>
                            startEdit(org.id, org.name, org.description)
                          }
                          className="px-4 py-2 bg-theme-tertiary hover:bg-theme text-theme rounded-lg transition-colors border border-theme text-sm flex items-center gap-2"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit
                        </button>
                      )}

                      <button
                        onClick={() => router.push(`/app`)}
                        className="px-4 py-2 bg-theme-tertiary hover:bg-theme text-theme rounded-lg transition-colors border border-theme text-sm flex items-center gap-2"
                      >
                        <UserGroupIcon className="w-4 h-4" />
                        Manage Members
                      </button>

                      {org.role === "owner" && (
                        <button
                          onClick={() =>
                            handleDeleteOrganization(org.id, org.name)
                          }
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                        </button>
                      )}

                      {org.role !== "owner" && (
                        <button
                          onClick={() =>
                            handleLeaveOrganization(org.id, org.name)
                          }
                          className="px-4 py-2 bg-theme-tertiary hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-red-300 text-sm flex items-center gap-2"
                        >
                          <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                          Leave
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
