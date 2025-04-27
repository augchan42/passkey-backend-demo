
-- Create a table for storing passkey credentials
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
  
-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_id ON public.passkey_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id ON public.passkey_credentials(credential_id);

-- Enable RLS
ALTER TABLE public.passkey_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own passkey credentials"
    ON public.passkey_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own passkey credentials"
    ON public.passkey_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own passkey credentials"
    ON public.passkey_credentials
    FOR DELETE
    USING (auth.uid() = user_id); 