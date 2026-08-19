import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/api";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for secure cookies and accurate protocol/host detection behind reverse proxies
  app.set("trust proxy", 1);

  // CORS & Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
      );
      res.setHeader("Access-Control-Max-Age", "86400");
      res.setHeader("Vary", "Origin");
    }

    // Handle preflight OPTIONS request immediately
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    next();
  });

  // JSON request body parser
  app.use(express.json());

  // Development/production request logger for /api routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || req.url.startsWith("/api")) {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`[API ${req.method}] ${req.originalUrl || req.url} -> ${res.statusCode} (${duration}ms)`);
      });
    }
    next();
  });

  // Health check
  app.get(["/api/health", "/health"], (_req, res) => {
    res.json({ success: true, status: "ok", gateway: "AEGIS // DEFENSE CORE v4.8.2" });
  });

  // API routes (Mount both /api and root to guarantee compatibility across reverse proxies)
  app.use("/api", apiRouter);
  app.use("/", apiRouter);

  // Catch-all 404 for any unmatched /api routes (PREVENTS FALLING THROUGH TO HTML SPA HANDLER)
  app.all(["/api/*", "/api"], (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API endpoint ${req.method} ${req.originalUrl || req.url} not found`,
      message: "API endpoint not found",
    });
  });

  // Global Error Handler for API routes
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || req.url.startsWith("/api")) {
      console.error(`[API UNHANDLED ERROR] ${req.method} ${req.url}:`, err);
      return res.status(err.status || 500).json({
        success: false,
        error: err.message || "Internal server error",
        message: "An unexpected server error occurred",
      });
    }
    next(err);
  });

  // Vite middleware for development / Static files for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AEGIS // DEFENSE Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
