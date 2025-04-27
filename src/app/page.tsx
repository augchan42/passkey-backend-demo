'use client';

import { useState } from 'react';
import type { 
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

function bufferToBase64url(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export default function Home() {
  const [status, setStatus] = useState<string>('');

  const handleRegister = async () => {
    try {
      setStatus('Starting registration...');
      
      // Get registration options from server
      const optionsRes = await fetch('/api/passkey/register', {
        method: 'POST',
      });
      const optionsJSON: PublicKeyCredentialCreationOptionsJSON = await optionsRes.json();

      // Convert options from JSON to binary format
      const options: PublicKeyCredentialCreationOptions = {
        ...optionsJSON,
        challenge: base64urlToBuffer(optionsJSON.challenge),
        user: {
          ...optionsJSON.user,
          id: Uint8Array.from(optionsJSON.user.id, c => c.charCodeAt(0)),
        },
        excludeCredentials: optionsJSON.excludeCredentials?.map(credential => ({
          ...credential,
          id: base64urlToBuffer(credential.id),
          transports: credential.transports as AuthenticatorTransport[],
        })),
      };

      // Create credentials
      const credential = await navigator.credentials.create({
        publicKey: options,
      }) as PublicKeyCredential;

      // Convert credential to JSON for transmission
      const credentialJSON = {
        id: credential.id,
        type: credential.type,
        rawId: bufferToBase64url(credential.rawId),
        response: {
          clientDataJSON: bufferToBase64url((credential.response as AuthenticatorAttestationResponse).clientDataJSON),
          attestationObject: bufferToBase64url((credential.response as AuthenticatorAttestationResponse).attestationObject),
        },
      };

      // Verify registration with server
      const verificationRes = await fetch('/api/passkey/register/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentialJSON),
      });

      const verification = await verificationRes.json();
      
      if (verification.verified) {
        setStatus('Registration successful! You can now authenticate with this passkey.');
      } else {
        setStatus('Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatus('Registration failed: ' + (error as Error).message);
    }
  };

  const handleAuthenticate = async () => {
    try {
      setStatus('Starting authentication...');
      
      // Get authentication options from server
      const optionsRes = await fetch('/api/passkey/authenticate', {
        method: 'POST',
      });
      const optionsJSON: PublicKeyCredentialRequestOptionsJSON = await optionsRes.json();

      // Convert options from JSON to binary format
      const options: PublicKeyCredentialRequestOptions = {
        ...optionsJSON,
        challenge: base64urlToBuffer(optionsJSON.challenge),
        allowCredentials: optionsJSON.allowCredentials?.map(credential => ({
          ...credential,
          id: base64urlToBuffer(credential.id),
          transports: credential.transports as AuthenticatorTransport[],
        })),
      };

      // Get credentials
      const credential = await navigator.credentials.get({
        publicKey: options,
      }) as PublicKeyCredential;

      // Convert credential to JSON for transmission
      const credentialJSON = {
        id: credential.id,
        type: credential.type,
        rawId: bufferToBase64url(credential.rawId),
        response: {
          clientDataJSON: bufferToBase64url((credential.response as AuthenticatorAssertionResponse).clientDataJSON),
          authenticatorData: bufferToBase64url((credential.response as AuthenticatorAssertionResponse).authenticatorData),
          signature: bufferToBase64url((credential.response as AuthenticatorAssertionResponse).signature),
          userHandle: bufferToBase64url((credential.response as AuthenticatorAssertionResponse).userHandle),
        },
      };

      // Verify authentication with server
      const verificationRes = await fetch('/api/passkey/authenticate/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentialJSON),
      });

      const verification = await verificationRes.json();
      
      if (verification.verified) {
        setStatus('Authentication successful! Welcome back.');
      } else {
        setStatus('Authentication failed');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setStatus('Authentication failed: ' + (error as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
      <h1 className="text-2xl font-bold mb-4">Passkey Demo</h1>
      
      <div className="flex flex-col gap-4 w-full max-w-md">
        <button
          onClick={handleRegister}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Register Passkey
        </button>
        
        <button
          onClick={handleAuthenticate}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          Authenticate with Passkey
        </button>
        
        {status && (
          <div className="mt-4 p-4 rounded bg-gray-100 dark:bg-gray-800">
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
