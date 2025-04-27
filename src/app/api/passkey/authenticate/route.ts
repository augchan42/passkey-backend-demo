import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@/lib/webauthn";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    // Generate authentication options without requiring authentication
    const options = await generateAuthenticationOptions(supabase);

    return NextResponse.json(options);
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}
