import jwt from "jsonwebtoken";

const generateToken = (res, userId, sessionVersion = 0) => {
  const token = jwt.sign({ userId, sessionVersion }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

export default generateToken;
