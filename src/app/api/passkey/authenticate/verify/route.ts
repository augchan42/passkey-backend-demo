import { NextResponse } from "next/server";
import { verifyAuthentication } from "@/lib/webauthn";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const response: AuthenticationResponseJSON = await request.json();
    const result = await verifyAuthentication(supabase, response);

    if (result.verified) {
      // Generate JWT token with 24 hour expiry
      const token = jwt.sign(
        { userId: result.userId },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return NextResponse.json({
        ...result,
        token
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 }
    );
  }
}
