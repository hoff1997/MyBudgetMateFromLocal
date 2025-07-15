import dotenv from "dotenv";
dotenv.config(); // ✅ Loads your .env variables at the top

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize database storage
async function initializeDatabase() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    const { testSupabaseConnection } = await import("./supabase");
    const { initializeSupabaseData } = await import("./supabase-init");
    
    const success = await testSupabaseConnection();
    if (success) {
      log("✅ Connected to Supabase database");
      await initializeSupabaseData();
    } else {
      log("⚠️ Supabase connection failed - using in-memory storage");
    }
  } else {
    log("⚠️ No persistent storage configured - using in-memory storage");
  }
}

(async () => {
  await initializeDatabase();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  app.get("/debug-test", (req, res) => {
    res.json({ message: "Express route working!" });
  });

  const isDevelopment = process.env.NODE_ENV === "development" || app.get("env") === "development";
  if (isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "3001", 10);

  app.listen(port, () => {
    log(`✅ My Budget Mate running at http://localhost:${port}`);
    log(`🔧 Debug route: http://localhost:${port}/debug-test`);
  });
})();
