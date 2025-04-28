import { NextResponse } from "next/server";
import { generateRegistrationOptionsForUser } from "@/lib/webauthn";
import { createSupabaseServerClient } from "@/lib/supabase";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    // Generate registration options without requiring authentication
    const options = await generateRegistrationOptionsForUser(supabase);

    // Transform the options to match the iOS app's expected format
    const transformedOptions = {
      rpId: options.rp.id,
      challenge: options.challenge,
      timeout: options.timeout,
      userVerification: options.authenticatorSelection?.userVerification,
      user: {
        id: options.user.id,
        name: options.user.name,
        displayName: options.user.displayName
      }
    };

    // Log the response we're about to send
    console.log("Sending registration options response:", {
      options: transformedOptions,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

    // Add proper headers for CORS and content type
    return NextResponse.json(transformedOptions, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
