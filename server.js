import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Import the analyze handler from the repo so the /api/analyze-food route works.
import analyzeFood from "./analyze-food.js";

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const frontendRoot = fs.existsSync(publicDir) ? publicDir : __dirname;

const PORT = Number(process.env.PORT) || 3000;

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Serve frontend files from the project root when no public/ directory exists.
app.use(express.static(frontendRoot));

// Health check.
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    app: "VERIDIS NutriScan",
    server: "online",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Temporary API status endpoints.
// These do not perform AI analysis.
app.get("/api/auth", (req, res) => {
  res.json({
    success: true,
    message: "Authentication API is reachable.",
    note: "Configure Supabase authentication in the frontend."
  });
});

app.get("/api/scan", (req, res) => {
  res.json({
    success: true,
    message: "Scan API is reachable.",
    analysisConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.get("/api/nutrition", (req, res) => {
  res.json({
    success: true,
    message: "Nutrition API is reachable."
  });
});

app.get("/api/user", (req, res) => {
  res.json({
    success: true,
    message: "User API is reachable."
  });
});

// Analysis endpoint - delegates to analyze-food.js
app.post("/api/analyze-food", async (req, res) => {
  try {
    await analyzeFood(req, res);
  } catch (err) {
    console.error("/api/analyze-food handler failed:", err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: "Food analysis failed." });
    }
  }
});

// Serve existing HTML pages.
const pages = {
  "/": "index.html",
  "/login": "Login.html",
  "/scanner": "Scanner.html",
  "/analysis": "Analysis.html",
  "/explanation": "Explanation.html",
  "/user-profile": "User.html",
  "/code": "code.html"
};

for (const [route, filename] of Object.entries(pages)) {
  app.get(route, (req, res) => {
    const filePath = path.join(frontendRoot, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`Page not found: ${filename}. Check the frontend directory.`);
    }

    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        res.status(404).send(`Page not found: ${filename}.`);
      }
    });
  });
}

// API-specific 404 response.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found."
  });
});

// General 404 response.
app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// Error handler.
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    success: false,
    error: "Internal server error."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`VERIDIS NutriScan server listening on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Gemini configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
});
