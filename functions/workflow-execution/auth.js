const jwt = require("jsonwebtoken");

function getBearerToken(req) {
  const authorization = req.headers?.authorization;

  if (!authorization) {
    return null;
  }

  const parts = authorization.split(" ");

  if (parts.length !== 2 || !/^Bearer$/i.test(parts[0])) {
    return null;
  }

  return parts[1];
}

function getAuthenticatedUserId(req) {
  const token = getBearerToken(req);

  if (!token) {
    throw new Error("Authentication required");
  }

  const rawJwtSecret = process.env.NHOST_JWT_SECRET;

  if (!rawJwtSecret) {
    throw new Error("NHOST_JWT_SECRET is not configured");
  }

  let jwtSecret;

  try {
    const parsed = JSON.parse(rawJwtSecret);

    jwtSecret = parsed.key;
  } catch {
    throw new Error("Invalid NHOST_JWT_SECRET configuration");
  }

  if (!jwtSecret) {
    throw new Error("JWT signing key is missing");
  }

  let decoded;

  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (error) {
    throw new Error("Invalid or expired authentication token");
  }

  const claims =
    decoded?.["https://hasura.io/jwt/claims"];

  const userId =
    claims?.["x-hasura-user-id"] || decoded?.sub;

  if (!userId) {
    throw new Error("Authenticated user ID is missing");
  }

  return userId;
}

module.exports = {
  getAuthenticatedUserId,
};