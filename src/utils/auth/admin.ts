const getSecretKey = async () => {
  // We use the anon key as a generic secret for signing since it's available, 
  // but in production it's better to have a dedicated JWT_SECRET.
  const secret = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-fallback-secret-key-12345';
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
};

export async function signAdminCookie(payload: string): Promise<string> {
  const key = await getSecretKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${payload}.${signatureHex}`;
}

export async function verifyAdminCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue || !cookieValue.includes('.')) return false;
  
  const lastDotIndex = cookieValue.lastIndexOf('.');
  if (lastDotIndex === -1) return false;

  const payload = cookieValue.substring(0, lastDotIndex);
  const signatureHex = cookieValue.substring(lastDotIndex + 1);
  if (!payload || !signatureHex) return false;

  const key = await getSecretKey();
  
  const match = signatureHex.match(/.{1,2}/g);
  if (!match) return false;
  
  const signatureBytes = new Uint8Array(match.map((byte) => parseInt(byte, 16)));

  try {
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(payload)
    );
    return isValid && payload.length > 0;
  } catch (error) {
    return false;
  }
}

