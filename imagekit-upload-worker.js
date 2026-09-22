// Cloudflare Worker: secure ImageKit upload authorization for the free tier.
// Configure the environment variables listed in the deployment notes below.
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
    const allowOrigin = allowedOrigins.includes(origin) ? origin : ''
    const cors = {
      ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin, Vary: 'Origin' } : {}),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (request.method !== 'POST' || !['/', '/upload-auth'].includes(new URL(request.url).pathname)) {
      return json({ error: 'Not found' }, 404, cors)
    }
    if (!allowOrigin) return json({ error: 'Origin is not allowed' }, 403, cors)

    const bearer = request.headers.get('Authorization') || ''
    const idToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : ''
    if (!idToken) return json({ error: 'Missing Firebase token' }, 401, cors)

    // Firebase validates the ID token; only the specified admin email may sign uploads.
    const verification = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    )
    const account = await verification.json()
    if (!verification.ok || account.users?.[0]?.email !== env.ADMIN_EMAIL) {
      return json({ error: 'Administrator authorization failed' }, 403, cors)
    }

    const token = crypto.randomUUID()
    const expire = Math.floor(Date.now() / 1000) + 15 * 60
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.IMAGEKIT_PRIVATE_KEY), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    )
    const signatureBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${token}${expire}`))
    const signature = [...new Uint8Array(signatureBytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
    return json({ token, expire, signature, publicKey: env.IMAGEKIT_PUBLIC_KEY }, 200, cors)
  },
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
}
