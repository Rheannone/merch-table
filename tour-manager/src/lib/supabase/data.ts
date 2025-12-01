/**
 * Supabase Data Loaders
 *
 * Functions to load data from Supabase (primary source of truth)
 * IndexedDB is used as a local cache and offline fallback
 */

import { createClient } from "./client";
import {
  Product,
  Sale,
  CloseOut,
  UserSettings,
  Organization,
  OrganizationMember,
  OrganizationWithRole,
  OrganizationSettings,
  OrganizationRole,
} from "@/types";

/**
 * Load products for current organization from Supabase
 */
export async function loadProductsFromSupabase(
  organizationId: string
): Promise<Product[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading products from Supabase:", error);
      return [];
    }

    // Transform Supabase schema to app format
    const products: Product[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      imageUrl: row.image_url || undefined,
      category: row.category || undefined,
      description: row.description || undefined,
      showTextOnButton: row.show_text_on_button ?? true,
      sizes: row.sizes || undefined,
      inventory: row.inventory || {},
      currencyPrices: row.currency_prices || undefined,
      synced: true, // Products from Supabase are synced
    }));

    console.log(`✅ Loaded ${products.length} products from Supabase`);
    return products;
  } catch (error) {
    console.error("Failed to load products from Supabase:", error);
    return [];
  }
}

/**
 * Load sales for current organization from Supabase
 */
export async function loadSalesFromSupabase(
  organizationId: string
): Promise<Sale[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    // Load sales with their items
    const { data, error } = await supabase
      .from("sales")
      .select(
        `
        *,
        sale_items (
          product_id,
          product_name,
          quantity,
          price,
          size
        )
      `
      )
      .eq("organization_id", organizationId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error loading sales from Supabase:", error);
      return [];
    }

    // Transform Supabase schema to app format
    const sales: Sale[] = (data || []).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      items: (row.sale_items || []).map((item: any) => ({
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        price: Number(item.price),
        size: item.size || undefined,
      })),
      total: Number(row.total),
      actualAmount: Number(row.actual_amount),
      discount: row.discount ? Number(row.discount) : undefined,
      tipAmount: row.tip_amount ? Number(row.tip_amount) : undefined,
      paymentMethod: row.payment_method,
      synced: true, // Sales loaded from Supabase are already synced
      isHookup: row.is_hookup || false,
    }));

    console.log(`✅ Loaded ${sales.length} sales from Supabase`);
    return sales;
  } catch (error) {
    console.error("Failed to load sales from Supabase:", error);
    return [];
  }
}

/**
 * Load close-outs for current organization from Supabase
 */
export async function loadCloseOutsFromSupabase(
  organizationId: string
): Promise<CloseOut[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("close_outs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error loading close-outs from Supabase:", error);
      return [];
    }

    // Transform Supabase schema to app format
    const closeOuts: CloseOut[] = (data || []).map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      createdAt: row.created_at,
      sessionName: row.session_name || undefined,
      location: row.location || undefined,
      eventDate: row.event_date || undefined,
      notes: row.notes || undefined,
      salesCount: row.sales_count,
      totalRevenue: Number(row.total_revenue),
      actualRevenue: Number(row.actual_revenue),
      discountsGiven: Number(row.discounts_given),
      tipsReceived: Number(row.tips_received),
      paymentBreakdown: row.payment_breakdown || {},
      productsSold: row.products_sold || [],
      expectedCash: row.expected_cash ? Number(row.expected_cash) : undefined,
      actualCash: row.actual_cash ? Number(row.actual_cash) : undefined,
      cashDifference: row.cash_difference
        ? Number(row.cash_difference)
        : undefined,
      saleIds: row.sale_ids || [],
      syncedToSupabase: row.synced_to_supabase || true,
    }));

    console.log(`✅ Loaded ${closeOuts.length} close-outs from Supabase`);
    return closeOuts;
  } catch (error) {
    console.error("Failed to load close-outs from Supabase:", error);
    return [];
  }
}

/**
 * Load user settings from Supabase and cache to IndexedDB
 */
export async function loadSettingsFromSupabase(): Promise<UserSettings | null> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("settings")
      .eq("user_id", userData.user.id)
      .single();

    if (error) {
      // If no settings exist yet, check IndexedDB and migrate
      if (error.code === "PGRST116") {
        console.log(
          "🔄 No settings row in Supabase, checking IndexedDB for migration..."
        );
        const { getSettings } = await import("@/lib/db");
        const indexedDBSettings = await getSettings(userData.user.id);

        if (indexedDBSettings && Object.keys(indexedDBSettings).length > 0) {
          console.log(
            "📦 Found settings in IndexedDB, migrating to Supabase..."
          );
          const migrated = await saveSettingsToSupabase(indexedDBSettings);
          if (migrated) {
            console.log(
              "✅ Successfully migrated IndexedDB settings to Supabase"
            );
            return indexedDBSettings;
          } else {
            console.warn("⚠️ Migration failed, using IndexedDB settings");
            return indexedDBSettings;
          }
        }

        console.log(
          "ℹ️ No settings in Supabase or IndexedDB (first time user)"
        );
        return null;
      }
      console.error("Error loading settings from Supabase:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        fullError: error,
      });
      return null;
    }

    const settings = data?.settings || null;

    // Migration: If Supabase settings are empty but IndexedDB has settings, migrate them
    if (!settings || Object.keys(settings).length === 0) {
      console.log(
        "🔄 Supabase settings empty, checking IndexedDB for migration..."
      );
      const { getSettings } = await import("@/lib/db");
      const indexedDBSettings = await getSettings(userData.user.id);

      if (indexedDBSettings && Object.keys(indexedDBSettings).length > 0) {
        console.log("📦 Found settings in IndexedDB, migrating to Supabase...");
        const migrated = await saveSettingsToSupabase(indexedDBSettings);
        if (migrated) {
          console.log(
            "✅ Successfully migrated IndexedDB settings to Supabase"
          );
          return indexedDBSettings;
        } else {
          console.warn("⚠️ Migration failed, using IndexedDB settings");
          return indexedDBSettings;
        }
      }

      return null;
    }

    // Cache settings to IndexedDB for offline use
    if (settings) {
      const { saveSettings } = await import("@/lib/db");
      await saveSettings(userData.user.id, settings);
      console.log("✅ Loaded settings from Supabase and cached to IndexedDB");
    }

    return settings;
  } catch (error) {
    console.error("Failed to load settings from Supabase:", error);
    return null;
  }
}

/**
 * Save user settings to Supabase
 */
export async function saveSettingsToSupabase(
  settings: UserSettings
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userData.user.id,
        settings,
      },
      {
        onConflict: "user_id", // Update if row exists
      }
    );

    if (error) {
      console.error("Error saving settings to Supabase:", error);
      return false;
    }

    console.log("✅ Settings saved to Supabase");
    return true;
  } catch (error) {
    console.error("Failed to save settings to Supabase:", error);
    return false;
  }
}

/**
 * Load email signups for current organization from Supabase
 */
export async function loadEmailSignupsFromSupabase(
  organizationId: string
): Promise<import("../../types").EmailSignup[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("email_signups")
      .select("*")
      .eq("organization_id", organizationId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Supabase email signups query error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("No email signups found in Supabase");
      return [];
    }

    // Transform snake_case to camelCase
    const emailSignups = data.map(
      (row: {
        id: string;
        timestamp: string;
        email: string;
        name?: string;
        phone?: string;
        source: string;
        sale_id?: string;
        synced?: boolean;
      }) => ({
        id: row.id,
        timestamp: row.timestamp,
        email: row.email,
        name: row.name || undefined,
        phone: row.phone || undefined,
        source: row.source as "post-checkout" | "manual-entry",
        saleId: row.sale_id || undefined,
        synced: row.synced || true,
      })
    );

    console.log(`✅ Loaded ${emailSignups.length} email signups from Supabase`);
    return emailSignups;
  } catch (error) {
    console.error("Failed to load email signups from Supabase:", error);
    return [];
  }
}

/**
 * ============================================================================
 * ORGANIZATION DATA FUNCTIONS
 * ============================================================================
 */

/**
 * Load all organizations the current user belongs to
 */
export async function loadUserOrganizations(): Promise<OrganizationWithRole[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    // Query organizations through organization_members junction
    const { data, error } = await supabase
      .from("organization_members")
      .select(
        `
        role,
        joined_at,
        organizations!inner (
          id,
          name,
          slug,
          description,
          avatar_url,
          created_by,
          created_at,
          updated_at,
          is_active
        )
      `
      )
      .eq("user_id", userData.user.id)
      .eq("organizations.is_active", true)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error loading user organizations:", error);
      return [];
    }

    // Transform to OrganizationWithRole format
    const organizations: OrganizationWithRole[] = await Promise.all(
      (data || []).map(async (row: any) => {
        const org = row.organizations;

        // Count members for this organization
        const { count } = await supabase
          .from("organization_members")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", org.id);

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          description: org.description || undefined,
          avatarUrl: org.avatar_url || undefined,
          createdBy: org.created_by,
          createdAt: org.created_at,
          updatedAt: org.updated_at,
          isActive: org.is_active,
          role: row.role as OrganizationRole,
          memberCount: count || 0,
        };
      })
    );

    console.log(
      `✅ Loaded ${organizations.length} organizations for user ${userData.user.id}`
    );
    return organizations;
  } catch (error) {
    console.error("Failed to load user organizations:", error);
    return [];
  }
}

/**
 * Get a specific organization by ID (if user has access)
 */
export async function loadOrganization(
  organizationId: string
): Promise<Organization | null> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .eq("is_active", true)
      .single();

    if (error) {
      console.error("Error loading organization:", error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
      avatarUrl: data.avatar_url || undefined,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active,
    };
  } catch (error) {
    console.error("Failed to load organization:", error);
    return null;
  }
}

/**
 * Get the user's role in a specific organization
 */
export async function getUserOrganizationRole(
  organizationId: string
): Promise<OrganizationRole | null> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", userData.user.id)
      .single();

    if (error) {
      console.error("Error getting user role:", error);
      return null;
    }

    return data.role as OrganizationRole;
  } catch (error) {
    console.error("Failed to get user organization role:", error);
    return null;
  }
}

/**
 * Create a new organization
 */
export async function createOrganization(
  name: string,
  description?: string
): Promise<Organization | null> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return null;
    }

    // Insert organization (trigger will auto-add creator as owner)
    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name,
        description,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating organization:", error);
      return null;
    }

    console.log(`✅ Created organization: ${data.name} (${data.id})`);

    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
      avatarUrl: data.avatar_url || undefined,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      isActive: data.is_active,
    };
  } catch (error) {
    console.error("Failed to create organization:", error);
    return null;
  }
}

/**
 * Update an organization's details
 * Requires admin or owner role
 */
export async function updateOrganization(
  organizationId: string,
  updates: {
    name?: string;
    description?: string;
    avatarUrl?: string;
  }
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    // RLS will enforce permissions (admin or owner only)
    const { error } = await supabase
      .from("organizations")
      .update({
        name: updates.name,
        description: updates.description,
        avatar_url: updates.avatarUrl,
      })
      .eq("id", organizationId);

    if (error) {
      console.error("Error updating organization:", error);
      return false;
    }

    console.log(`✅ Updated organization ${organizationId}`);
    return true;
  } catch (error) {
    console.error("Failed to update organization:", error);
    return false;
  }
}

/**
 * Soft delete an organization (sets is_active = false)
 * Requires owner role
 */
export async function deleteOrganization(
  organizationId: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    // RLS will enforce permissions (owner only)
    const { error } = await supabase
      .from("organizations")
      .update({ is_active: false })
      .eq("id", organizationId);

    if (error) {
      console.error("Error deleting organization:", error);
      return false;
    }

    console.log(`✅ Deleted organization ${organizationId}`);
    return true;
  } catch (error) {
    console.error("Failed to delete organization:", error);
    return false;
  }
}

/**
 * Load organization members
 */
export async function loadOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("organization_members")
      .select(
        `
        id,
        organization_id,
        user_id,
        role,
        joined_at,
        invited_by,
        users!organization_members_user_id_fkey (
          email,
          name
        )
      `
      )
      .eq("organization_id", organizationId)
      .order("joined_at", { ascending: false });

    if (error) {
      console.error("Error loading organization members:", error);
      return [];
    }

    const members: OrganizationMember[] = (data || []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      role: row.role as OrganizationRole,
      joinedAt: row.joined_at,
      invitedBy: row.invited_by || undefined,
      email: row.users?.email,
      name: row.users?.name,
    }));

    console.log(
      `✅ Loaded ${members.length} members for organization ${organizationId}`
    );
    return members;
  } catch (error) {
    console.error("Failed to load organization members:", error);
    return [];
  }
}

/**
 * Update a member's role
 * Requires admin or owner role
 */
export async function updateMemberRole(
  memberId: string,
  newRole: OrganizationRole
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    // RLS will enforce permissions
    const { error } = await supabase
      .from("organization_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      console.error("Error updating member role:", error);
      return false;
    }

    console.log(`✅ Updated member ${memberId} to role ${newRole}`);
    return true;
  } catch (error) {
    console.error("Failed to update member role:", error);
    return false;
  }
}

/**
 * Remove a member from an organization
 * Requires admin or owner role
 */
export async function removeMember(memberId: string): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    // RLS will enforce permissions
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Error removing member:", error);
      return false;
    }

    console.log(`✅ Removed member ${memberId}`);
    return true;
  } catch (error) {
    console.error("Failed to remove member:", error);
    return false;
  }
}

/**
 * Add a member to an organization by email
 * Requires admin or owner role
 */
export async function addMemberByEmail(
  organizationId: string,
  email: string,
  role: OrganizationRole = "member"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return { success: false, error: "Not authenticated" };
    }

    // Look up user by email in the users table
    const { data: targetUser, error: userLookupError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (userLookupError || !targetUser) {
      console.error("User not found:", email);
      return { success: false, error: `No user found with email: ${email}` };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", organizationId)
      .eq("user_id", targetUser.id)
      .single();

    if (existingMember) {
      return {
        success: false,
        error: `User is already a ${existingMember.role} of this organization`,
      };
    }

    // Add the user as a member
    const { error: insertError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: targetUser.id,
        role: role,
        invited_by: userData.user.id,
      });

    if (insertError) {
      console.error("Error adding member:", insertError);
      return {
        success: false,
        error: "Failed to add member (permission denied)",
      };
    }

    console.log(
      `✅ Added ${email} as ${role} to organization ${organizationId}`
    );
    return { success: true };
  } catch (error) {
    console.error("Failed to add member:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Leave an organization (remove self from members)
 * Cannot leave if you are the only owner
 */
export async function leaveOrganization(
  organizationId: string
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    // Check if user is the only owner
    const { data: owners, error: ownersError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("role", "owner");

    if (ownersError) {
      console.error("Error checking owners:", ownersError);
      return false;
    }

    if (owners && owners.length === 1) {
      const { data: currentMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", userData.user.id)
        .eq("role", "owner")
        .single();

      if (currentMember) {
        console.error(
          "Cannot leave organization: you are the only owner. Transfer ownership or delete the organization first."
        );
        return false;
      }
    }

    // Remove the user from organization_members
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userData.user.id);

    if (error) {
      console.error("Error leaving organization:", error);
      return false;
    }

    console.log(`✅ Left organization ${organizationId}`);
    return true;
  } catch (error) {
    console.error("Failed to leave organization:", error);
    return false;
  }
}

/**
 * Load organization settings
 */
export async function loadOrganizationSettings(
  organizationId: string
): Promise<OrganizationSettings | null> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("organization_settings")
      .select("settings")
      .eq("organization_id", organizationId)
      .single();

    if (error) {
      // No settings yet
      if (error.code === "PGRST116") {
        console.log(`No settings found for organization ${organizationId}`);
        return null;
      }
      console.error("Error loading organization settings:", error);
      return null;
    }

    return data?.settings || null;
  } catch (error) {
    console.error("Failed to load organization settings:", error);
    return null;
  }
}

/**
 * Save organization settings
 * Requires admin or owner role
 */
export async function saveOrganizationSettings(
  organizationId: string,
  settings: OrganizationSettings
): Promise<boolean> {
  try {
    const supabase = createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Not authenticated:", userError);
      return false;
    }

    // RLS will enforce permissions (admin or owner only)
    const { error } = await supabase.from("organization_settings").upsert(
      {
        organization_id: organizationId,
        settings,
      },
      {
        onConflict: "organization_id", // Update if row exists
      }
    );

    if (error) {
      console.error("Error saving organization settings:", error);
      return false;
    }

    console.log(`✅ Settings saved for organization ${organizationId}`);
    return true;
  } catch (error) {
    console.error("Failed to save organization settings:", error);
    return false;
  }
}
