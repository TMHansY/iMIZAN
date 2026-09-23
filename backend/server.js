import express from "express";
import dotenv from "dotenv";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import examRoutes from "./routes/examRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import { exec } from "child_process";
import fs from "fs";
import { writeFileSync } from "fs";
import path from "path";
import cors from "cors";
dotenv.config();
connectDB();
const app = express();
const port = process.env.PORT || 5050;

app.use(express.json());
app.use(
  cors({
    origin: [
      "https://ai-proctored-system.vercel.app",
      "http://localhost:3000",
      "http://localhost:5050",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/users", userRoutes);
app.use("/api/users", examRoutes);
app.use("/api/users", resultRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);

if (process.env.NODE_ENV === "production") {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"))
  });
}

// Error handling middleware - must be after all routes
app.use(notFound);
app.use(errorHandler);

// Server
app.listen(port, () => {
  console.log(`server is running on http://localhost:${port}`);
});
