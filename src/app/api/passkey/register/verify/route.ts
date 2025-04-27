import { NextResponse } from "next/server";
import { verifyRegistration } from "@/lib/webauthn";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const response: RegistrationResponseJSON = await request.json();
    const result = await verifyRegistration(supabase, response);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying registration:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 }
    );
  }
}
