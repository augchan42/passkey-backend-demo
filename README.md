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

Response:
```json
{
  "verified": true,
  "userId": "user-uuid"
}
```

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

Response:
```json
{
  "verified": true,
  "userId": "user-uuid",
  "token": "jwt-token"
}
```

The JWT token contains:
- `userId`: The authenticated user's ID
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (24 hours from issuance)

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_RP_ID=your_relying_party_id
NEXT_PUBLIC_ORIGIN=your_origin
JWT_SECRET=your_jwt_secret_key
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
4. Store the JWT token securely (e.g., in Keychain) for authenticated requests

Example registration flow:
1. Call `/api/passkey/register` to get registration options
2. Use the options with `ASAuthorizationPlatformPublicKeyCredentialProvider` to create a credential
3. Send the credential to `/api/passkey/register/verify` to complete registration

Example authentication flow:
1. Call `/api/passkey/authenticate` to get authentication options
2. Use the options with `ASAuthorizationPlatformPublicKeyCredentialProvider` to authenticate
3. Send the authentication result to `/api/passkey/authenticate/verify` to complete authentication
4. Store the received JWT token for future authenticated requests
5. Include the token in the `Authorization` header for subsequent requests:
   ```
   Authorization: Bearer <token>
   ```

## Associated Domains Setup

To enable passkey sharing between your iOS app and website:

### 1. Add Associated Domains in Xcode
1. Go to your project target → Signing & Capabilities
2. Click the + Capability button
3. Add Associated Domains
4. Add an entry:
   ```
   webcredentials:your-backend-domain.com
   ```
   Example:
   ```
   webcredentials:passkey-backend-demo.vercel.app
   ```

### 2. Configure apple-app-site-association File
The project includes a template file at `public/.well-known/apple-app-site-association`. You need to:

1. Replace the placeholders in the file:
   ```json
   {
     "webcredentials": {
       "apps": ["TEAM_ID.BUNDLE_ID"]
     }
   }
   ```
   Replace:
   - `TEAM_ID`: Your Apple Developer Team ID
   - `BUNDLE_ID`: Your app's bundle identifier (e.g., `com.example.peepsapp`)

2. The file will be served at:
   ```
   https://your-backend-domain.com/.well-known/apple-app-site-association
   ```

### 3. Deploy the File
- The file is included in the `public` directory and will be automatically served by Next.js
- For production, ensure your domain is properly configured to serve the file

### When to Use Associated Domains
- **Use**: If you want to share passkeys between your iOS app and website
- **Don't Use**: If your app uses passkeys only for in-app authentication

### Benefits
- Enables seamless passkey login across app and website
- Allows users to use the same passkey for both platforms
- Required for Apple passkey APIs to work with your web domain

## Development

```