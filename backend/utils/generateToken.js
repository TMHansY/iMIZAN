import jwt from "jsonwebtoken";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === "production";

const generateToken = (res, userId, sessionVersion = 0) => {
  const token = jwt.sign({ userId, sessionVersion }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  res.cookie("jwt", token, {
    httpOnly: true,
    // LAN development uses plain HTTP, where browsers reject Secure cookies.
    // Production deployments use HTTPS and need None for separate frontend/API origins.
    secure: isProduction,
    sameSite: isProduction ? "None" : "Lax",
    maxAge: SESSION_DURATION_MS,
  });

  if (typeof res.set === "function") {
    res.set("X-Session-Expires-At", expiresAt.toISOString());
  }
  return expiresAt.toISOString();
};

export default generateToken;
