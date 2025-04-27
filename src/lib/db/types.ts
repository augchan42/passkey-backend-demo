export interface Passkey {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType?: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface PasskeyRegistrationOptions {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType?: string;
}

export interface PasskeyAuthenticationOptions {
  credentialId: string;
  counter: number;
}

export interface DatabaseAdapter {
  initialize(): Promise<void>;
  close(): Promise<void>;
  createPasskey(
    passkey: Omit<Passkey, "id" | "createdAt" | "lastUsedAt">
  ): Promise<Passkey>;
  getPasskeyByCredentialId(credentialId: string): Promise<Passkey | null>;
  getPasskeysByUserId(userId: string): Promise<Passkey[]>;
  updatePasskeyCounter(credentialId: string, newCounter: number): Promise<void>;
  deactivatePasskey(credentialId: string): Promise<void>;
}
