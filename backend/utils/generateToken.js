import jwt from "jsonwebtoken";

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

const generateToken = (res, userId, sessionVersion = 0) => {
  const token = jwt.sign({ userId, sessionVersion }, process.env.JWT_SECRET, {
    expiresIn: "8h",
  });

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: SESSION_DURATION_MS,
  });

  res.set("X-Session-Expires-At", expiresAt.toISOString());
  return expiresAt.toISOString();
};

export default generateToken;
