import { Pool, PoolClient } from "pg";
import { Passkey, DatabaseAdapter as IDatabaseAdapter } from "./types";

export class DatabaseAdapter implements IDatabaseAdapter {
  private pool: Pool | null = null;
  private static instance: DatabaseAdapter | null = null;

  private constructor() {}

  public static getInstance(): DatabaseAdapter {
    if (!DatabaseAdapter.instance) {
      DatabaseAdapter.instance = new DatabaseAdapter();
    }
    return DatabaseAdapter.instance;
  }

  async initialize(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production",
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
      connectionTimeoutMillis: 2000, // How long to wait for a connection to become available
    });

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS passkeys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL,
        device_type TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
      );

      CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys(user_id);
      CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);
    `);
  }

  private async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool!.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async createPasskey(
    passkey: Omit<Passkey, "id" | "createdAt" | "lastUsedAt">
  ): Promise<Passkey> {
    return this.withTransaction(async (client) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      await client.query(
        `INSERT INTO passkeys (id, user_id, credential_id, public_key, counter, device_type, created_at, last_used_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          passkey.userId,
          passkey.credentialId,
          passkey.publicKey,
          passkey.counter,
          passkey.deviceType,
          now,
          now,
        ]
      );

      return {
        id,
        ...passkey,
        createdAt: now,
        lastUsedAt: now,
      };
    });
  }

  async getPasskeyByCredentialId(
    credentialId: string
  ): Promise<Passkey | null> {
    const { rows } = await this.pool!.query(
      `SELECT * FROM passkeys WHERE credential_id = $1 AND is_active = true`,
      [credentialId]
    );

    if (rows.length === 0) return null;

    const row = rows[0] as {
      id: string;
      user_id: string;
      credential_id: string;
      public_key: string;
      counter: number;
      device_type: string | null;
      created_at: string;
      last_used_at: string;
    };

    return {
      id: row.id,
      userId: row.user_id,
      credentialId: row.credential_id,
      publicKey: row.public_key,
      counter: row.counter,
      deviceType: row.device_type || undefined,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  }

  async getPasskeysByUserId(userId: string): Promise<Passkey[]> {
    const { rows } = await this.pool!.query(
      `SELECT * FROM passkeys WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    return rows.map(
      (row: {
        id: string;
        user_id: string;
        credential_id: string;
        public_key: string;
        counter: number;
        device_type: string | null;
        created_at: string;
        last_used_at: string;
      }) => ({
        id: row.id,
        userId: row.user_id,
        credentialId: row.credential_id,
        publicKey: row.public_key,
        counter: row.counter,
        deviceType: row.device_type || undefined,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
      })
    );
  }

  async updatePasskeyCounter(
    credentialId: string,
    newCounter: number
  ): Promise<void> {
    return this.withTransaction(async (client) => {
      await client.query(
        `UPDATE passkeys 
         SET counter = $1, last_used_at = $2 
         WHERE credential_id = $3`,
        [newCounter, new Date().toISOString(), credentialId]
      );
    });
  }

  async deactivatePasskey(credentialId: string): Promise<void> {
    await this.pool!.query(
      `UPDATE passkeys SET is_active = false WHERE credential_id = $1`,
      [credentialId]
    );
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      DatabaseAdapter.instance = null;
    }
  }
}
