import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertUserSchema, insertEventSchema, insertCourseSchema, insertLessonSchema, insertMaterialSchema, insertPrayerRequestSchema, loginSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key-change-in-production";

// Middleware to verify JWT token
async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido" });
  }
}

// Middleware to check if user is admin
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  const user = await storage.getUserById(userId);
  
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Acesso negado. Requer permissões de administrador." });
  }
  
  next();
}

export function registerRoutes(app: Express) {
  // Auth Routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(credentials.email);

      if (!user) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const isPasswordValid = await bcrypt.compare(credentials.senha, user.senha);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      const { senha, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  // Public Routes
  app.get("/api/events/public", async (req: Request, res: Response) => {
    try {
      const events = await storage.getPublicEvents();
      res.json(events);
    } catch (error) {
      console.error("Get public events error:", error);
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  // Member Routes (Authenticated)
  app.get("/api/courses", authenticateToken, async (req: Request, res: Response) => {
    try {
      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error) {
      console.error("Get courses error:", error);
      res.status(500).json({ message: "Erro ao buscar cursos" });
    }
  });

  app.get("/api/courses/:id/lessons", authenticateToken, async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      const lessons = await storage.getLessonsByCourseId(courseId);
      res.json(lessons);
    } catch (error) {
      console.error("Get lessons error:", error);
      res.status(500).json({ message: "Erro ao buscar aulas" });
    }
  });

  app.get("/api/materials", authenticateToken, async (req: Request, res: Response) => {
    try {
      const materials = await storage.getAllMaterials();
      res.json(materials);
    } catch (error) {
      console.error("Get materials error:", error);
      res.status(500).json({ message: "Erro ao buscar materiais" });
    }
  });

  // Admin Routes - Members
  app.get("/api/admin/members", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ senha, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get members error:", error);
      res.status(500).json({ message: "Erro ao buscar membros" });
    }
  });

  app.post("/api/admin/members", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const newUser = await storage.createUser(userData);
      const { senha, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create member error:", error);
      res.status(500).json({ message: "Erro ao criar membro" });
    }
  });

  app.patch("/api/admin/members/:id/toggle-admin", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { isAdmin } = req.body;
      
      const updatedUser = await storage.updateUserAdmin(id, isAdmin);
      const { senha, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Toggle admin error:", error);
      res.status(500).json({ message: "Erro ao atualizar permissões" });
    }
  });

  app.delete("/api/admin/members/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete member error:", error);
      res.status(500).json({ message: "Erro ao deletar membro" });
    }
  });

  // Admin Routes - Courses
  app.post("/api/admin/courses", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const courseData = insertCourseSchema.parse(req.body);
      const newCourse = await storage.createCourse(courseData);
      res.status(201).json(newCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create course error:", error);
      res.status(500).json({ message: "Erro ao criar curso" });
    }
  });

  app.delete("/api/admin/courses/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCourse(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete course error:", error);
      res.status(500).json({ message: "Erro ao deletar curso" });
    }
  });

  // Admin Routes - Lessons
  app.post("/api/admin/lessons", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const lessonData = insertLessonSchema.parse(req.body);
      const newLesson = await storage.createLesson(lessonData);
      res.status(201).json(newLesson);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create lesson error:", error);
      res.status(500).json({ message: "Erro ao criar aula" });
    }
  });

  app.delete("/api/admin/lessons/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLesson(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete lesson error:", error);
      res.status(500).json({ message: "Erro ao deletar aula" });
    }
  });

  // Admin Routes - Events
  app.get("/api/admin/events", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const events = await storage.getAllEvents();
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  app.post("/api/admin/events", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const newEvent = await storage.createEvent(eventData);
      res.status(201).json(newEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create event error:", error);
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });

  app.delete("/api/admin/events/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Erro ao deletar evento" });
    }
  });

  // Admin Routes - Materials
  app.post("/api/admin/materials", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const materialData = insertMaterialSchema.parse(req.body);
      const newMaterial = await storage.createMaterial(materialData);
      res.status(201).json(newMaterial);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create material error:", error);
      res.status(500).json({ message: "Erro ao criar material" });
    }
  });

  app.delete("/api/admin/materials/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMaterial(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete material error:", error);
      res.status(500).json({ message: "Erro ao deletar material" });
    }
  });

  // Prayer Request Routes
  app.post("/api/prayers", async (req: Request, res: Response) => {
    try {
      const prayerData = insertPrayerRequestSchema.parse(req.body);
      const newPrayer = await storage.createPrayerRequest(prayerData);
      res.status(201).json(newPrayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create prayer request error:", error);
      res.status(500).json({ message: "Erro ao criar pedido de oração" });
    }
  });

  app.get("/api/prayers/public", async (req: Request, res: Response) => {
    try {
      const prayers = await storage.getPublicPrayerRequests();
      res.json(prayers);
    } catch (error) {
      console.error("Get public prayers error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos de oração" });
    }
  });

  app.get("/api/admin/prayers", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const prayers = await storage.getAllPrayerRequests();
      res.json(prayers);
    } catch (error) {
      console.error("Get all prayers error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos de oração" });
    }
  });

  app.patch("/api/admin/prayers/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { status, isPublic } = req.body;
      const updatedPrayer = await storage.updatePrayerRequestStatus(id, status, isPublic);
      res.json(updatedPrayer);
    } catch (error) {
      console.error("Update prayer status error:", error);
      res.status(500).json({ message: "Erro ao atualizar pedido" });
    }
  });

  app.delete("/api/admin/prayers/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePrayerRequest(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete prayer error:", error);
      res.status(500).json({ message: "Erro ao deletar pedido" });
    }
  });
}
