// Rentalworks HubSpot Proxy
// Sits between the browser and HubSpot's API to bypass CORS restrictions.
// The HUBSPOT_TOKEN is stored securely as a Netlify environment variable —
// it is never exposed to the browser.

exports.handler = async (event) => {
  // Handle CORS preflight
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Check token is configured
  const token = process.env.HUBSPOT_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({
        error: 'HUBSPOT_TOKEN is not set. Go to Netlify → Site Settings → Environment Variables and add it.'
      })
    };
  }

  // Parse request
  let parsed;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { method = 'GET', path, payload } = parsed;

  if (!path) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Missing path' }) };
  }

  // Forward to HubSpot
  try {
    const res = await fetch(`https://api.hubapi.com${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    return {
      statusCode: res.status,
      headers: cors,
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'HubSpot request failed: ' + err.message }),
    };
  }
};
