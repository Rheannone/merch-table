import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Create Resend client at runtime (not top-level)
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email notification via Resend
    await resend.emails.send({
      from: "Road Dog <onboarding@resend.dev>", // Resend's verified sender for testing
      to: "rheannone@gmail.com",
      subject: "🎸 New Beta Interest - Road Dog",
      html: `
        <h2>New Beta Tester Interest!</h2>
        <p><strong>Email:</strong> ${email}</p>
        ${name ? `<p><strong>Name:</strong> ${name}</p>` : ""}
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        <hr />
        <p><em>Sent from your Road Dog landing page</em></p>
      `,
    });

    console.log("Beta interest received:", {
      email,
      name,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "Thanks for your interest! We'll be in touch soon.",
    });
  } catch (error) {
    console.error("Error processing beta interest:", error);
    return NextResponse.json(
      { error: "Failed to submit. Please try again." },
      { status: 500 }
    );
  }
}
