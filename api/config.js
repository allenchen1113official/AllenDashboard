// Vercel Serverless Function — /api/config
// Injects Appwrite credentials from Vercel Environment Variables as JS globals.
// Same variable names as config.js so app.js / admin.js need no changes.
module.exports = (req, res) => {
  const endpoint = (process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1').trim();
  const salt     = (process.env.APPWRITE_SALT     || '').trim();
  const cipher   = (process.env.APPWRITE_CIPHER   || '').trim();

  let lines;
  if (salt && cipher) {
    // Encrypted mode: passphrase required at runtime to decrypt
    lines = [
      `const APPWRITE_ENDPOINT = '${endpoint}';`,
      `const APPWRITE_SALT     = '${salt}';`,
      `const APPWRITE_CIPHER   = '${cipher}';`,
    ];
  } else {
    // Fallback: no env vars set → app runs in localStorage-only mode
    lines = [
      `const APPWRITE_ENDPOINT   = '${endpoint}';`,
      `const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID';`,
      `const APPWRITE_DB_ID      = 'YOUR_DATABASE_ID';`,
      `const APPWRITE_COL_CONFIG  = 'YOUR_CONFIG_COLLECTION_ID';`,
      `const APPWRITE_COL_EVENTS  = 'YOUR_EVENTS_COLLECTION_ID';`,
      `const APPWRITE_COL_HISTORY = 'YOUR_HISTORY_COLLECTION_ID';`,
    ];
  }

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache');
  res.status(200).send(lines.join('\n') + '\n');
};
