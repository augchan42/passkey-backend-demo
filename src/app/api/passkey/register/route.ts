import { NextResponse } from "next/server";
import { generateRegistrationOptionsForUser } from "@/lib/webauthn";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    // Generate registration options without requiring authentication
    const options = await generateRegistrationOptionsForUser(supabase);

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}
