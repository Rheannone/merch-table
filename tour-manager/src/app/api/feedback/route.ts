import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { type, message } = await req.json();

    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== "feature" && type !== "bug") {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    // Create Resend client at runtime
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send email notification
    await resend.emails.send({
      from: "Merch Table <onboarding@resend.dev>",
      to: "rheannone@gmail.com",
      subject: `${type === "feature" ? "💡 Feature Request" : "🐛 Bug Report"} - Merch Table`,
      html: `
        <h2>${type === "feature" ? "Feature Request" : "Bug Report"}</h2>
        <p><strong>From:</strong> ${session.user.email}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        <hr />
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">${message}</p>
        <hr />
        <p style="font-size: 12px; color: #666;">
          <em>Sent from Merch Table feedback system</em>
        </p>
      `,
    });

    console.log(`[Feedback] ${type} from ${session.user.email}:`, message);

    return NextResponse.json({
      success: true,
      message: "Feedback sent successfully",
    });
  } catch (error) {
    console.error("[Feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to send feedback" },
      { status: 500 }
    );
  }
}
