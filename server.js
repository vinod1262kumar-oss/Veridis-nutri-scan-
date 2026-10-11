import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Load .env for local development.
// In production, configure environment variables on your host.
dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

// Resolve the public directory.
const PUBLIC_DIR = path.join(__dirname, "public");

// Support HTML files stored in public/ or in the project root.
function resolvePage(filename) {
  const publicPath = path.join(PUBLIC_DIR, filename);
  const rootPath = path.join(__dirname, filename);

  if (fs.existsSync(publicPath)) {
    return publicPath;
  }

  if (fs.existsSync(rootPath)) {
    return rootPath;
  }

  return null;
}

// Configure allowed frontend origins.
// Example:
// CORS_ORIGINS=http://localhost:3000,https://your-site.netlify.app
const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Trust only explicitly configured frontend origins.
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as server-to-server
      // requests. This is not an authentication mechanism.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

// Security headers.
// CSP is disabled here because existing pages may use inline scripts
// or external resources. Configure a suitable CSP before enabling it.
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Limit JSON request size.
app.use(express.json({ limit: "1mb" }));

// Parse URL-encoded form data with a size limit.
app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
  })
);

// Serve only the public directory as static content.
// Never expose the project root or .env through express.static().
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// Health check.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    application: "VERIDIS NutriScan",
    status: "online",
    environment: NODE_ENV,
  });
});

// API routes.
// These endpoints are intentionally marked as not implemented.
// Add real authentication and business logic before using them.
const notImplemented = (feature) => (req, res) => {
  res.status(501).json({
    success: false,
    error: `${feature} is not implemented yet.`,
    message: "Configure the required backend service and API logic.",
  });
};

app.all(
  "/api/auth",
  notImplemented("Authentication")
);

app.all(
  "/api/auth/*path",
  notImplemented("Authentication")
);

app.all(
  "/api/scan",
  notImplemented("Food scanning")
);

app.all(
  "/api/scan/*path",
  notImplemented("Food scanning")
);

app.all(
  "/api/nutrition",
  notImplemented("Nutrition")
);

app.all(
  "/api/nutrition/*path",
  notImplemented("Nutrition")
);

app.all(
  "/api/user",
  notImplemented("User profile")
);

app.all(
  "/api/user/*path",
  notImplemented("User profile")
);

// Serve HTML pages safely from known filenames.
const pages = {
  "/": "Index.html",
  "/login": "Login.html",
  "/scanner": "Scanner.html",
  "/analysis": "Analysis.html",
  "/explanation": "Explanation.html",
  "/user-profile": "User.html",
  "/code": "code.html",
};

for (const [route, filename] of Object.entries(pages)) {
  app.get(route, (req, res, next) => {
    const pagePath = resolvePage(filename);

    if (!pagePath) {
      return next();
    }

    return res.sendFile(pagePath);
  });
}

// API 404 response.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found",
  });
});

// General 404 response.
app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// Central error handler.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      success: false,
      error: "This website origin is not allowed.",
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON request body.",
    });
  }

  console.error("Request failed:", err.message);

  return res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// Start the server.
app.listen(PORT, () => {
  console.log(`VERIDIS NutriScan server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
});
