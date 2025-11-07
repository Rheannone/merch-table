import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: "Settings data required" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user ID from email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare settings data
    const settingsData = {
      user_id: user.id,
      payment_methods: settings.payment_methods || [],
      categories: settings.categories || ["Apparel", "Merch", "Music"],
      show_tip_jar: settings.show_tip_jar ?? true,
      currency: settings.currency || "USD",
      exchange_rate: settings.exchange_rate || 1.0,
      theme_id: settings.theme_id || "default",
      current_sheet_id: settings.current_sheet_id || null,
      current_sheet_name: settings.current_sheet_name || null,
      email_signup_enabled: settings.email_signup_enabled ?? false,
      email_signup_prompt_message:
        settings.email_signup_prompt_message || "Want to join our email list?",
      email_signup_collect_name: settings.email_signup_collect_name ?? false,
      email_signup_collect_phone: settings.email_signup_collect_phone ?? false,
      email_signup_auto_dismiss_seconds:
        settings.email_signup_auto_dismiss_seconds || 10,
      migrated_from_sheets: settings.migrated_from_sheets ?? false,
      migrated_at: settings.migrated_at || null,
    };

    // Upsert settings (insert or update)
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(settingsData, {
        onConflict: "user_id",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
  } catch (error) {
    console.error("Server error saving settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
