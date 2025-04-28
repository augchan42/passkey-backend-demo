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

// Helper function to decode JWT
function decodeJWT(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return { 
      error: 'Invalid token',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    };
  }
}

// Helper function to format timestamp
function formatTimestamp(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString();
}

// Helper function to get time until expiry
function getTimeUntilExpiry(expiryTimestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  const seconds = expiryTimestamp - now;
  if (seconds <= 0) return 'Expired';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m remaining`;
}

type AuthenticationResult = {
  verified: boolean;
  userId: string;
  token?: string;
};

type DecodedToken = {
  userId: string;
  iat: number;
  exp: number;
} | {
  error: string;
  message: string;
  stack?: string;
};

type DebugInfo = {
  type: 'authentication';
  result: AuthenticationResult;
  token?: string;
  decodedToken?: DecodedToken;
} | {
  type: 'registration';
  result: AuthenticationResult;
};

export default function Home() {
  const [status, setStatus] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const handleRegister = async () => {
    try {
      setStatus('Starting registration...');
      setDebugInfo(null);
      
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
        setDebugInfo({
          type: 'registration',
          result: verification
        });
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
      setDebugInfo(null);
      
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
        setDebugInfo({
          type: 'authentication',
          result: verification,
          token: verification.token,
          decodedToken: verification.token ? decodeJWT(verification.token) : null
        });
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

        {debugInfo && (
          <div className="mt-4 p-4 rounded bg-gray-100 dark:bg-gray-800">
            <h2 className="font-bold mb-2">Debug Information:</h2>
            <div className="space-y-4">
              {debugInfo.type === 'authentication' && (
                <>
                  <div>
                    <h3 className="font-semibold text-sm">Authentication Result:</h3>
                    <pre className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded">
                      {JSON.stringify(debugInfo.result, null, 2)}
                    </pre>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-sm">JWT Token:</h3>
                    <div className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded">
                      <div className="whitespace-pre-wrap break-all font-mono">
                        {debugInfo.token?.split('.').map((part: string, index: number) => (
                          <div key={index} className="mb-1">
                            {index === 0 ? 'Header: ' : index === 1 ? 'Payload: ' : 'Signature: '}
                            {part}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-sm">Decoded Token:</h3>
                    <pre className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded">
                      {JSON.stringify({
                        ...debugInfo.decodedToken,
                        ...(debugInfo.decodedToken && 'iat' in debugInfo.decodedToken ? {
                          iat: `${debugInfo.decodedToken.iat} (${formatTimestamp(debugInfo.decodedToken.iat)})`,
                          exp: `${debugInfo.decodedToken.exp} (${formatTimestamp(debugInfo.decodedToken.exp)})`,
                          expiresIn: getTimeUntilExpiry(debugInfo.decodedToken.exp)
                        } : {})
                      }, null, 2)}
                    </pre>
                  </div>
                </>
              )}
              
              {debugInfo.type === 'registration' && (
                <div>
                  <h3 className="font-semibold text-sm">Registration Result:</h3>
                  <pre className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded">
                    {JSON.stringify(debugInfo.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
