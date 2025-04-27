# Passkey Backend Demo

This is a Next.js 14 backend for handling passkey authentication using Supabase and WebAuthn.

## API Endpoints

### Registration

#### Generate Registration Options
```http
POST /api/passkey/register
```

Generates options for registering a new passkey. No authentication required.

#### Verify Registration
```http
POST /api/passkey/register/verify
```

Verifies a passkey registration. Requires the registration response from the client.

### Authentication

#### Generate Authentication Options
```http
POST /api/passkey/authenticate
```

Generates options for authenticating with a passkey. No authentication required.

#### Verify Authentication
```http
POST /api/passkey/authenticate/verify
```

Verifies a passkey authentication. Requires the authentication response from the client.

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_RP_ID=your_relying_party_id
NEXT_PUBLIC_ORIGIN=your_origin
```

## Database Schema

The following tables are created in Supabase:

```sql
CREATE TABLE IF NOT EXISTS public.passkey_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key text not null,     -- Will store base64 string
    counter BIGINT NOT NULL,
    device_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(user_id, credential_id)
);

CREATE TABLE IF NOT EXISTS public.passkey_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## iOS/Swift Integration

To integrate with an iOS/Swift frontend:

1. Use the `ASAuthorizationPlatformPublicKeyCredentialProvider` for passkey operations
2. Make HTTP requests to the API endpoints
3. Handle the WebAuthn responses appropriately

Example registration flow:
1. Call `/api/passkey/register` to get registration options
2. Use the options with `ASAuthorizationPlatformPublicKeyCredentialProvider` to create a credential
3. Send the credential to `/api/passkey/register/verify` to complete registration

Example authentication flow:
1. Call `/api/passkey/authenticate` to get authentication options
2. Use the options with `ASAuthorizationPlatformPublicKeyCredentialProvider` to authenticate
3. Send the authentication result to `/api/passkey/authenticate/verify` to complete authentication

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```
