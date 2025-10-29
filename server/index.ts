import { db } from "./db";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log, useViteCatchall } from "./vite";
import session from "express-session";
import cors from "cors";

const app = express();

// Configuração CORS
app.use(cors({
  origin: true,
  credentials: true,
}));

// Configuração de sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'sua-chave-secreta-aqui-mude-em-producao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  }
}));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
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

(async () => {

  // endpoint de teste
  app.get("/test-db", async (_req, res) => {
    try {
      const result = await db.execute(`SELECT NOW() AS now;`);
      res.json({ success: true, serverTime: result.rows[0].now });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as any).message });
    }
  });

  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, app as any);
    useViteCatchall(app);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  app.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();