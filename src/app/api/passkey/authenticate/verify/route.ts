import { NextResponse } from "next/server";
import { verifyAuthentication } from "@/lib/webauthn";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const response: AuthenticationResponseJSON = await request.json();
    const result = await verifyAuthentication(supabase, response);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 }
    );
  }
}
