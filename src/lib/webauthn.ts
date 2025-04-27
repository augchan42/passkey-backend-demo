import {
  generateAuthenticationOptions as generateAuthOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/types";

const rpName = "Passkey Demo";
const rpID = process.env.NEXT_PUBLIC_RP_ID || "localhost";
const origin = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";

export type PasskeyCredential = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: Buffer;
  counter: number;
  device_type?: string;
  created_at: string;
  last_used_at?: string;
};

export async function generateRegistrationOptionsForUser(
  supabase: SupabaseClient<Database>
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  // Generate a random user ID for the new user
  const userId = new Uint8Array(16);
  crypto.getRandomValues(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: userId,
    userName: userId.toString(), // We'll update this after user creation
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  console.log("Generated registration options:", options);

  // Store the challenge in the database
  const { error: challengeError } = await supabase
    .from("passkey_challenges")
    .insert({
      challenge: options.challenge,
      type: "registration",
      created_at: new Date().toISOString(),
    });

  if (challengeError) {
    console.error("Error storing challenge:", challengeError);
    throw new Error("Failed to store challenge");
  }

  console.log("Stored challenge in database");

  return options;
}

export async function verifyRegistration(
  supabase: SupabaseClient<Database>,
  response: RegistrationResponseJSON
): Promise<{ verified: boolean; userId: string }> {
  console.log("Starting registration verification");

  // Get the stored challenge
  const { data: challenge, error: challengeError } = await supabase
    .from("passkey_challenges")
    .select("challenge")
    .eq("type", "registration")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (challengeError) {
    console.error("Error retrieving challenge:", challengeError);
    throw new Error("Failed to retrieve challenge");
  }

  if (!challenge) {
    console.error("No registration challenge found");
    throw new Error("No registration challenge found");
  }

  console.log("Retrieved challenge from database");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    console.error("Registration verification failed");
    throw new Error("Registration verification failed");
  }

  console.log("Registration verified successfully");
  console.log("Registration info:", verification.registrationInfo);

  const { credential } = verification.registrationInfo;
  if (!credential) {
    throw new Error("No credential data in registration info");
  }

  const {
    publicKey: credentialPublicKey,
    id: credentialID,
    counter,
  } = credential;

  console.log("Credential public key:", credentialPublicKey);
  console.log("Credential ID:", credentialID);
  console.log("Counter:", counter);

  // Create a new user in Supabase
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.signUp({
    email: `${response.id}@passkey.demo`, // Temporary email
    password: crypto.randomUUID(), // Random password
  });

  if (userError || !user) {
    console.error("Error creating user:", userError);
    throw new Error("Failed to create user");
  }

  console.log("Created user in Supabase");

  // Store the passkey credential
  const credentialIdBase64 = credentialID; // The ID is already in base64 format from the response
  console.log("Storing credential with ID:", credentialIdBase64);

  const { error: credentialError } = await supabase
    .from("passkey_credentials")
    .insert({
      user_id: user.id,
      credential_id: credentialIdBase64,
      public_key: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
      device_type: "unknown",
    });

  if (credentialError) {
    console.error("Error storing credential:", credentialError);
    throw new Error("Failed to store credential");
  }

  console.log("Stored credential in database with ID:", credentialIdBase64);

  // Clean up the challenge
  const { error: cleanupError } = await supabase
    .from("passkey_challenges")
    .delete()
    .eq("challenge", challenge.challenge);

  if (cleanupError) {
    console.error("Error cleaning up challenge:", cleanupError);
  }

  console.log("Registration process completed successfully");

  return { verified: true, userId: user.id };
}

export async function generateAuthenticationOptions(
  supabase: SupabaseClient<Database>
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthOptions({
    rpID,
    userVerification: "preferred",
  });

  // Store the challenge in the database
  await supabase.from("passkey_challenges").insert({
    challenge: options.challenge,
    type: "authentication",
    created_at: new Date().toISOString(),
  });

  return options;
}

export async function verifyAuthentication(
  supabase: SupabaseClient<Database>,
  response: AuthenticationResponseJSON
): Promise<{ verified: boolean; userId: string }> {
  // Get the stored challenge
  const { data: challenge, error: challengeError } = await supabase
    .from("passkey_challenges")
    .select("challenge")
    .eq("type", "authentication")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (challengeError) {
    console.error("Error retrieving challenge:", challengeError);
    throw new Error("Failed to retrieve challenge");
  }

  if (!challenge) {
    console.error("No authentication challenge found");
    throw new Error("No authentication challenge found");
  }

  console.log("Retrieved challenge from database");

  // The response ID is already in base64 format
  const credentialIdBase64 = response.id;
  console.log("Looking for credential with ID:", credentialIdBase64);

  const { data: credential } = await supabase
    .from("passkey_credentials")
    .select("*")
    .eq("credential_id", credentialIdBase64)
    .single();

  if (!credential) {
    console.error("Credential not found for ID:", credentialIdBase64);
    throw new Error("Credential not found");
  }

  console.log("Found credential:", credential);

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credential_id,
      publicKey: Buffer.from(credential.public_key, "base64"),
      counter: credential.counter,
    },
  });

  if (!verification.verified || !verification.authenticationInfo) {
    console.error("Authentication verification failed:", verification);
    throw new Error("Authentication verification failed");
  }

  console.log("Authentication verified successfully");

  // Update the counter
  const { error: updateError } = await supabase
    .from("passkey_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", credential.id);

  if (updateError) {
    console.error("Error updating credential:", updateError);
  }

  return { verified: true, userId: credential.user_id };
}
