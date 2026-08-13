const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");

function getBearerToken(req) {
  const authorization = req.headers?.authorization;

  if (!authorization) {
    return null;
  }

  const parts = authorization.trim().split(/\s+/);

  if (
    parts.length !== 2 ||
    !/^Bearer$/i.test(parts[0])
  ) {
    return null;
  }

  return parts[1];
}

// --------------------------------------------------
// JWKS client
// --------------------------------------------------

const subdomain = process.env.NHOST_SUBDOMAIN;
const region = process.env.NHOST_REGION;

if (!subdomain || !region) {
  console.error(
    "[Auth] NHOST_SUBDOMAIN or NHOST_REGION is missing"
  );
}

const jwks = jwksClient({
  jwksUri:
    `https://${subdomain}.auth.${region}.nhost.run` +
    `/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// --------------------------------------------------
// Get public signing key for JWT kid
// --------------------------------------------------

function getSigningKey(header, callback) {
  if (!header?.kid) {
    return callback(
      new Error("JWT key ID (kid) is missing")
    );
  }

  jwks.getSigningKey(header.kid, (error, key) => {
    if (error) {
      return callback(error);
    }

    const publicKey = key.getPublicKey();

    callback(null, publicKey);
  });
}

// --------------------------------------------------
// Verify Nhost JWT
// --------------------------------------------------

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        algorithms: ["RS256"],
      },
      (error, decoded) => {
        if (error) {
          return reject(error);
        }

        resolve(decoded);
      }
    );
  });
}

// --------------------------------------------------
// Authenticate caller
// --------------------------------------------------

async function getAuthenticatedUserId(req) {
  const token = getBearerToken(req);

  if (!token) {
    throw new Error("Authentication required");
  }

  let decoded;

  try {
    decoded = await verifyToken(token);
  } catch (error) {
    console.error(
      "[Auth] JWT verification failed:",
      error.message
    );

    throw new Error(
      "Invalid or expired authentication token"
    );
  }

  const claims =
    decoded?.["https://hasura.io/jwt/claims"];

  const userId =
    claims?.["x-hasura-user-id"] ||
    decoded?.sub;

  if (!userId) {
    throw new Error(
      "Authenticated user ID is missing"
    );
  }

  console.log(
    `[Auth] Verified Nhost user: ${userId}`
  );

  return userId;
}

module.exports = {
  getAuthenticatedUserId,
};