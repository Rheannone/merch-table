import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createClient } from "@supabase/supabase-js";

// This API route uses the Supabase service role key to bypass RLS
// and look up user IDs by email for the settings migration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - no session" },
        { status: 401 }
      );
    }

    // Get email from request body (optional, defaults to session email)
    const body = await request.json();
    const email = body.email || session.user.email;

    // Use service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key bypasses RLS
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Error fetching user ID:", error);
      return NextResponse.json(
        { error: "User not found", details: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ userId: data.id });
  } catch (error) {
    console.error("Server error in get-id route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
