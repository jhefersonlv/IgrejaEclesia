import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertUserSchema, insertEventSchema, insertCourseSchema, insertLessonSchema, insertMaterialSchema, insertPrayerRequestSchema, loginSchema, insertScheduleSchema, insertScheduleAssignmentSchema, insertQuestionSchema, insertVisitorSchema, insertMinisterioSchema, scheduleAssignments, insertCultoRecorrenteSchema, insertScheduleRequestSchema, insertModuloSchema, insertPermissaoSchema } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import multer from 'multer';
import path from 'path';

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key-change-in-production";

// Setup multer for file uploads
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'client/public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storageConfig });

// Middleware to verify JWT token
async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await storage.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(403).json({ message: "Usuário não encontrado" });
    }
    
    (req as any).userId = decoded.userId;
    (req as any).user = user;
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

// Middleware to check if user is obreiro or admin
async function requireObreiro(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (!user.ministerioObreiro && !user.isAdmin)) {
    return res.status(403).json({ message: "Acesso negado. Requer permissões de obreiro." });
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

  app.get("/api/auth/me", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { senha, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  // Upload Route
  app.post("/api/upload", authenticateToken, upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
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
      const user = (req as any).user;
      const userId = (req as any).userId;

      const courses = user.isAdmin
        ? await storage.getAllCourses()
        : await storage.getEnrolledCourses(userId);

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

    // Rota para buscar aniversariantes do mês (membros autenticados)
app.get("/api/members/birthdays", authenticateToken, async (req: Request, res: Response) => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
    const aniversariantes = await storage.getAniversariantesByMonth(month);
    res.json(aniversariantes);
  } catch (error) {
    console.error("Get birthdays error:", error);
    res.status(500).json({ message: "Erro ao buscar aniversariantes" });
  }
});


  // Members list (accessible by leaders and admins)
  app.get("/api/admin/members", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      
      // Only leaders and admins can access
      if (!user.isLider && !user.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
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

  app.patch("/api/admin/members/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      // Create a partial schema for updates (senha is optional)
      const updateSchema = insertUserSchema.partial();
      const userData = updateSchema.parse(req.body);
      
      // Sanitize empty strings to undefined for optional fields
      const sanitizedData = Object.fromEntries(
        Object.entries(userData).map(([key, value]) => {
          // Convert empty strings to undefined for optional fields
          if (value === "" && key !== "nome" && key !== "email") {
            return [key, undefined];
          }
          return [key, value];
        })
      );
      
      const updatedUser = await storage.updateUser(id, sanitizedData);
      const { senha, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Update member error:", error);
      res.status(500).json({ message: "Erro ao atualizar membro" });
    }
  });

  app.patch("/api/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = (req as any).userId;
      const updateSchema = insertUserSchema.partial();
      const userData = updateSchema.parse(req.body);

      // Prevent users from making themselves admins
      if (userData.isAdmin !== undefined) {
        delete userData.isAdmin;
      }

      const updatedUser = await storage.updateUser(id, userData);
      const { senha, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Erro ao atualizar perfil" });
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

  app.patch("/api/admin/courses/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const courseData = insertCourseSchema.partial().parse(req.body);
      const updatedCourse = await storage.updateCourse(id, courseData);
      res.json(updatedCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Update course error:", error);
      res.status(500).json({ message: "Erro ao atualizar curso" });
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

  // Admin Routes - Course Enrollments
  app.get("/api/admin/courses/:courseId/enrollments", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const users = await storage.getEnrolledUsers(courseId);
      const usersWithoutPasswords = users.map(({ senha, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get enrollments error:", error);
      res.status(500).json({ message: "Erro ao buscar matrículas" });
    }
  });

  app.post("/api/admin/courses/:courseId/enrollments", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "ID do usuário é obrigatório" });
      }

      const enrollment = await storage.enrollUserInCourse(userId, courseId);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Enroll user error:", error);
      // Handle potential unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({ message: "Usuário já matriculado neste curso" });
      }
      res.status(500).json({ message: "Erro ao matricular usuário" });
    }
  });

  app.delete("/api/admin/courses/:courseId/enrollments/:userId", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const userId = parseInt(req.params.userId);
      await storage.unenrollUserFromCourse(userId, courseId);
      res.status(204).send();
    } catch (error) {
      console.error("Unenroll user error:", error);
      res.status(500).json({ message: "Erro ao remover matrícula" });
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
      const eventsList = await storage.getAllEvents();
      res.json(eventsList);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  app.post("/api/admin/events", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const conflict = await storage.checkEventLocationConflict(eventData.local, eventData.data);
      if (conflict.hasConflict && conflict.conflictEvent) {
        return res.status(409).json({
          message: `Já existe um evento neste local nesta data: "${conflict.conflictEvent.titulo}".`,
          conflictEvent: conflict.conflictEvent,
        });
      }
      const newEvent = await storage.createEvent(eventData);
      res.status(201).json(newEvent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });

  app.patch("/api/admin/events/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertEventSchema.partial().parse(req.body);
      if (updateData.local && updateData.data) {
        const conflict = await storage.checkEventLocationConflict(updateData.local, updateData.data, id);
        if (conflict.hasConflict && conflict.conflictEvent) {
          return res.status(409).json({
            message: `Já existe um evento neste local nesta data: "${conflict.conflictEvent.titulo}".`,
            conflictEvent: conflict.conflictEvent,
          });
        }
      }
      const updated = await storage.updateEvent(id, updateData);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar evento" });
    }
  });

  app.delete("/api/admin/events/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEvent(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar evento" });
    }
  });

  // Agenda unificada (eventos + escalas filtrados por papel)
  app.get("/api/agenda", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const month = req.query.month ? parseInt(req.query.month as string) : new Date().getMonth() + 1;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const ministeriosList = await storage.getUserMinisterios(user.id);
      const ministerioIds = ministeriosList.map((m: any) => m.id);
      const agenda = await storage.getAgenda(month, year, user.id, user.isAdmin, ministerioIds);
      res.json(agenda);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar agenda" });
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
      const updateSchema = z.object({
        status: z.enum(["pending", "approved", "archived"]),
        isPublic: z.boolean(),
      });
      const { status, isPublic } = updateSchema.parse(req.body);
      const updatedPrayer = await storage.updatePrayerRequestStatus(id, status, isPublic);
      res.json(updatedPrayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
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

  // Analytics Routes
  app.get("/api/admin/analytics/members", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getMemberAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({ message: "Erro ao buscar analytics" });
    }
  });

  app.get("/api/admin/analytics/courses", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getCourseAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get course analytics error:", error);
      res.status(500).json({ message: "Erro ao buscar analytics de cursos" });
    }
  });

  app.get("/api/admin/analytics/visitors", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getVisitorAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get visitor analytics error:", error);
      res.status(500).json({ message: "Erro ao buscar analytics de visitantes" });
    }
  });

  app.get("/api/admin/analytics/general", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const analytics = await storage.getGeneralAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Get general analytics error:", error);
      res.status(500).json({ message: "Erro ao buscar analytics geral" });
    }
  });

  // Helper: verifica se usuário pode gerenciar escala de um ministério
  const canManageSchedule = async (user: any, ministerioId: number | null | undefined): Promise<boolean> => {
    if (user.isAdmin) return true;
    if (!ministerioId) return false;
    return storage.isUserLeaderOfMinisterio(user.id, ministerioId);
  };

  // Get schedules (members can view) - Rota Otimizada
  app.get("/api/schedules", authenticateToken, async (req: Request, res: Response) => {
    try {
      const queryMonth = req.query.month ? parseInt(req.query.month as string) : null;
      const queryYear = req.query.year ? parseInt(req.query.year as string) : null;
      
      let schedules;

      if (queryMonth && queryYear && !isNaN(queryMonth) && !isNaN(queryYear)) {
        // Usa a nova função que já inclui assignments
        schedules = await storage.getSchedulesByMonth(queryMonth, queryYear);
      } else {
        // Comportamento padrão: busca as próximas escalas (já com assignments)
        schedules = await storage.getUpcomingSchedules();
      }

      res.json(schedules);
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ message: "Erro ao buscar escalas" });
    }
  });

  // Get schedule with assignments - Rota mantida para visualização de detalhes
  app.get("/api/schedules/details/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const schedule = await storage.getScheduleById(id);
      if (!schedule) {
        return res.status(404).json({ message: "Escala não encontrada" });
      }
      const assignments = await storage.getAssignmentsBySchedule(id);
      res.json({ schedule, assignments });
    } catch (error) {
      console.error("Get schedule details error:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes da escala" });
    }
  });

  // Create schedule (ministry leaders only)
  app.post("/api/schedules", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const scheduleData = insertScheduleSchema.parse(req.body);
      if (!await canManageSchedule(user, scheduleData.ministerioId)) {
        return res.status(403).json({ message: "Você não é líder deste ministério." });
      }
      const newSchedule = await storage.createSchedule(scheduleData);
      // Se houver scheduleRequestId, marca a solicitação como cumprida
      const scheduleRequestId = req.body.scheduleRequestId;
      if (scheduleRequestId) {
        await storage.fulfillScheduleRequest(scheduleRequestId, newSchedule.id);
      }
      res.status(201).json(newSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create schedule error:", error);
      res.status(500).json({ message: "Erro ao criar escala" });
    }
  });

  // Update schedule (ministry leaders only)
  app.patch("/api/schedules/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const schedule = await storage.getScheduleById(id);
      if (!schedule) return res.status(404).json({ message: "Escala não encontrada" });
      if (!await canManageSchedule(user, schedule.ministerioId)) {
        return res.status(403).json({ message: "Você não é líder deste ministério." });
      }
      const updatedSchedule = await storage.updateSchedule(id, req.body);
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Update schedule error:", error);
      res.status(500).json({ message: "Erro ao atualizar escala" });
    }
  });

  // Delete schedule (ministry leaders only)
  app.delete("/api/schedules/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const id = parseInt(req.params.id);
      const schedule = await storage.getScheduleById(id);
      if (!schedule) return res.status(404).json({ message: "Escala não encontrada" });
      if (!await canManageSchedule(user, schedule.ministerioId)) {
        return res.status(403).json({ message: "Você não é líder deste ministério." });
      }
      await storage.deleteSchedule(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete schedule error:", error);
      res.status(500).json({ message: "Erro ao deletar escala" });
    }
  });

  // Create assignment (leaders only)
  app.post("/api/assignments", authenticateToken, async (req: Request, res: Response) => {
    try {
      const assignmentData = insertScheduleAssignmentSchema.parse(req.body);

      if (assignmentData.userId) {
        const schedule = await storage.getScheduleById(assignmentData.scheduleId);
        if (schedule) {
          const conflict = await storage.checkScheduleConflict(assignmentData.userId, schedule.data);
          if (conflict.hasConflict && conflict.conflictInfo) {
            const tipoLabel = conflict.conflictInfo.tipo === "louvor" ? "Louvor" : "Obreiros";
            return res.status(409).json({
              message: `Este membro já está escalado no Ministério de ${tipoLabel} nesta data (${schedule.data}). Verifique os conflitos antes de escalar.`,
              conflictInfo: conflict.conflictInfo,
            });
          }
        }
      }

      // Verifica se usuário pode gerenciar a escala
      const scheduleForAuth = await storage.getScheduleById(assignmentData.scheduleId);
      if (scheduleForAuth && !await canManageSchedule((req as any).user, scheduleForAuth.ministerioId)) {
        return res.status(403).json({ message: "Você não é líder deste ministério." });
      }

      const newAssignment = await storage.createAssignment(assignmentData);
      res.status(201).json(newAssignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create assignment error:", error);
      res.status(500).json({ message: "Erro ao criar atribuição" });
    }
  });

  // Update assignment (leaders only)
  app.patch("/api/assignments/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId } = req.body;

      if (userId) {
        const rows = await db.select().from(scheduleAssignments).where(eq(scheduleAssignments.id, id)).limit(1);
        if (rows.length > 0) {
          const schedule = await storage.getScheduleById(rows[0].scheduleId);
          if (schedule) {
            const conflict = await storage.checkScheduleConflict(userId, schedule.data, id);
            if (conflict.hasConflict && conflict.conflictInfo) {
              const tipoLabel = conflict.conflictInfo.tipo === "louvor" ? "Louvor" : "Obreiros";
              return res.status(409).json({
                message: `Este membro já está escalado no Ministério de ${tipoLabel} nesta data (${schedule.data}). Verifique os conflitos antes de escalar.`,
                conflictInfo: conflict.conflictInfo,
              });
            }
          }
        }
      }

      const updatedAssignment = await storage.updateAssignment(id, userId);
      res.json(updatedAssignment);
    } catch (error) {
      console.error("Update assignment error:", error);
      res.status(500).json({ message: "Erro ao atualizar atribuição" });
    }
  });

  // Get users by ministry (for suggestions)
  app.get("/api/users/ministry/:ministerio", authenticateToken, async (req: Request, res: Response) => {
    try {
      const ministerio = req.params.ministerio;
      const users = await storage.getUsersByMinistry(ministerio);
      res.json(users);
    } catch (error) {
      console.error("Get users by ministry error:", error);
      res.status(500).json({ message: "Erro ao buscar membros" });
    }
  });

  // Update user ministry (admin only)
  app.patch("/api/admin/members/:id/ministry", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { ministerio, isLider } = req.body;
      const updatedUser = await storage.updateUserMinistry(id, ministerio, isLider);
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user ministry error:", error);
      res.status(500).json({ message: "Erro ao atualizar ministério" });
    }
  });

  // ========== QUIZ ROUTES ==========
  
  // Get questions for a lesson (authenticated)
  app.get("/api/lessons/:id/questions", authenticateToken, async (req: Request, res: Response) => {
    try {
      const lessonId = parseInt(req.params.id);
      const questions = await storage.getQuestionsByLessonId(lessonId);
      res.json(questions);
    } catch (error) {
      console.error("Get questions error:", error);
      res.status(500).json({ message: "Erro ao buscar perguntas" });
    }
  });

  // Create questions for a lesson (admin only)
  app.post("/api/admin/lessons/:id/questions", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const lessonId = parseInt(req.params.id);
      const { questions: questionsData } = req.body;

      if (!Array.isArray(questionsData) || questionsData.length !== 3) {
        return res.status(400).json({ message: "São necessárias exatamente 3 perguntas" });
      }

      // Validate ALL questions first before making any changes
      const validatedQuestions = [];
      for (let i = 0; i < questionsData.length; i++) {
        const questionData = insertQuestionSchema.parse({
          ...questionsData[i],
          lessonId,
          ordem: i + 1,
        });
        validatedQuestions.push(questionData);
      }

      // Only after ALL validations pass, delete existing and insert new ones
      await storage.deleteQuestionsByLessonId(lessonId);

      const createdQuestions = [];
      for (const questionData of validatedQuestions) {
        const question = await storage.createQuestion(questionData);
        createdQuestions.push(question);
      }

      res.status(201).json(createdQuestions);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create questions error:", error);
      res.status(500).json({ message: "Erro ao criar perguntas" });
    }
  });

  // Submit quiz answers and complete lesson (members)
  app.post("/api/lessons/:id/complete", authenticateToken, async (req: Request, res: Response) => {
    try {
      const lessonId = parseInt(req.params.id);
      const userId = (req as any).userId;
      const { respostas } = req.body; // Array of answers: ['A', 'B', 'C']

      if (!Array.isArray(respostas) || respostas.length !== 3) {
        return res.status(400).json({ message: "São necessárias 3 respostas" });
      }

      // Get questions for this lesson
      const questions = await storage.getQuestionsByLessonId(lessonId);
      
      if (questions.length !== 3) {
        return res.status(400).json({ message: "Este vídeo ainda não possui quiz configurado" });
      }

      // Calculate score
      let score = 0;
      for (let i = 0; i < 3; i++) {
        if (respostas[i] === questions[i].respostaCorreta) {
          score++;
        }
      }

      const completed = score === 3; // Must get all correct to complete

      // Save completion
      const completion = await storage.createOrUpdateLessonCompletion(
        userId,
        lessonId,
        score,
        completed
      );

      res.json({
        score,
        completed,
        totalQuestions: 3,
        message: completed 
          ? "Parabéns! Você completou esta lição." 
          : `Você acertou ${score} de 3 perguntas. Tente novamente para completar.`,
      });
    } catch (error) {
      console.error("Complete lesson error:", error);
      res.status(500).json({ message: "Erro ao processar respostas" });
    }
  });

  // Get course progress for current user
  app.get("/api/courses/:id/progress", authenticateToken, async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = (req as any).userId;
      const progress = await storage.getCourseProgress(userId, courseId);
      res.json(progress);
    } catch (error) {
      console.error("Get course progress error:", error);
      res.status(500).json({ message: "Erro ao buscar progresso" });
    }
  });

  // Get lesson completion status for user
  app.get("/api/lessons/:id/completion", authenticateToken, async (req: Request, res: Response) => {
    try {
      const lessonId = parseInt(req.params.id);
      const userId = (req as any).userId;
      const completion = await storage.getLessonCompletion(userId, lessonId);
      res.json(completion || { completed: false, score: 0 });
    } catch (error) {
      console.error("Get lesson completion error:", error);
      res.status(500).json({ message: "Erro ao buscar conclusão" });
    }
  });

  // Get all users progress for a course (admin only)
  app.get("/api/admin/courses/:id/progress", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      const allProgress = await storage.getAllUsersProgress(courseId);
      res.json(allProgress);
    } catch (error) {
      console.error("Get all users progress error:", error);
      res.status(500).json({ message: "Erro ao buscar progresso dos usuários" });
    }
  });

  // Visitors API
  app.get("/api/admin/visitors", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const visitors = await storage.getAllVisitors();
      res.json(visitors);
    } catch (error) {
      console.error("Get visitors error:", error);
      res.status(500).json({ message: "Erro ao buscar visitantes" });
    }
  });

  app.post("/api/admin/visitors", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const visitorData = insertVisitorSchema.parse(req.body);
      const newVisitor = await storage.createVisitor(visitorData);
      res.status(201).json(newVisitor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create visitor error:", error);
      res.status(500).json({ message: "Erro ao criar visitante" });
    }
  });

  app.patch("/api/admin/visitors/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateSchema = insertVisitorSchema.partial();
      const visitorData = updateSchema.parse(req.body);
      const updatedVisitor = await storage.updateVisitor(id, visitorData);
      res.json(updatedVisitor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Update visitor error:", error);
      res.status(500).json({ message: "Erro ao atualizar visitante" });
    }
  });

  app.delete("/api/admin/visitors/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVisitor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete visitor error:", error);
      res.status(500).json({ message: "Erro ao deletar visitante" });
    }
  });

  // Member Visitors API (for Obreiros)
  app.get("/api/member/visitors", authenticateToken, requireObreiro, async (req: Request, res: Response) => {
    try {
      const visitors = await storage.getAllVisitors();
      res.json(visitors);
    } catch (error) {
      console.error("Get visitors error:", error);
      res.status(500).json({ message: "Erro ao buscar visitantes" });
    }
  });

  app.post("/api/member/visitors", authenticateToken, requireObreiro, async (req: Request, res: Response) => {
    try {
      const visitorData = insertVisitorSchema.parse(req.body);
      const newVisitor = await storage.createVisitor(visitorData);
      res.status(201).json(newVisitor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create visitor error:", error);
      res.status(500).json({ message: "Erro ao criar visitante" });
    }
  });

  app.patch("/api/member/visitors/:id", authenticateToken, requireObreiro, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateSchema = insertVisitorSchema.partial();
      const visitorData = updateSchema.parse(req.body);
      const updatedVisitor = await storage.updateVisitor(id, visitorData);
      res.json(updatedVisitor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Update visitor error:", error);
      res.status(500).json({ message: "Erro ao atualizar visitante" });
    }
  });

  app.delete("/api/member/visitors/:id", authenticateToken, requireObreiro, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteVisitor(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete visitor error:", error);
      res.status(500).json({ message: "Erro ao deletar visitante" });
    }
  });

  // ── Ministérios ──────────────────────────────────────────────────────────────

  // Ministérios que o usuário lidera (ou todos, se admin)
  app.get("/api/ministerios/meus-liderancas", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user.isAdmin) {
        return res.json(await storage.getAllMinisterios());
      }
      res.json(await storage.getUserLeaderMinisterios(user.id));
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar ministérios" });
    }
  });

  // Membros de um ministério específico
  app.get("/api/ministerios/:id/membros", authenticateToken, async (req: Request, res: Response) => {
    try {
      const ministerioId = parseInt(req.params.id);
      const membros = await storage.getUsersByMinisterioId(ministerioId);
      res.json(membros);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar membros do ministério" });
    }
  });

  // Toggle líder de um membro em um ministério (admin only)
  app.patch("/api/admin/members/:id/ministerios/:ministerioId/lider", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const ministerioId = parseInt(req.params.ministerioId);
      const { isLider } = req.body;
      await storage.setUserMinisterioLider(userId, ministerioId, !!isLider);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar liderança" });
    }
  });

  app.get("/api/ministerios", authenticateToken, async (req: Request, res: Response) => {
    try {
      const lista = await storage.getAllMinisterios();
      res.json(lista);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar ministérios" });
    }
  });

  app.post("/api/admin/ministerios", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertMinisterioSchema.parse(req.body);
      const novo = await storage.createMinisterio(data);
      res.status(201).json(novo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar ministério" });
    }
  });

  app.delete("/api/admin/ministerios/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMinisterio(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar ministério" });
    }
  });

  // Ministérios de um membro
  app.get("/api/admin/members/:id/ministerios", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const lista = await storage.getUserMinisterios(userId);
      res.json(lista);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar ministérios do membro" });
    }
  });

  app.post("/api/admin/members/:id/ministerios", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { ministerioId } = req.body;
      if (!ministerioId) return res.status(400).json({ message: "ministerioId é obrigatório" });
      await storage.addUserToMinisterio(userId, ministerioId);
      res.status(201).json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao vincular ministério" });
    }
  });

  app.delete("/api/admin/members/:id/ministerios/:ministerioId", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const ministerioId = parseInt(req.params.ministerioId);
      await storage.removeUserFromMinisterio(userId, ministerioId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao desvincular ministério" });
    }
  });
  // ── Cultos Recorrentes ───────────────────────────────────────────────────────

  app.get("/api/cultos-recorrentes", authenticateToken, async (req: Request, res: Response) => {
    try {
      const lista = await storage.getAllCultosRecorrentes();
      res.json(lista);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar cultos recorrentes" });
    }
  });

  app.post("/api/admin/cultos-recorrentes", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertCultoRecorrenteSchema.parse(req.body);
      const { ministerioIds, ...cultoData } = req.body;
      const novo = await storage.createCultoRecorrente(data);
      // Cria schedule_requests para os ministérios selecionados (se fornecidos)
      if (Array.isArray(ministerioIds) && ministerioIds.length > 0) {
        const requests = ministerioIds.map((mid: number) => ({
          cultoRecorrenteId: novo.id,
          ministerioId: mid,
        }));
        await storage.createMultipleScheduleRequests(requests);
      }
      res.status(201).json(novo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar culto recorrente" });
    }
  });

  app.patch("/api/admin/cultos-recorrentes/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertCultoRecorrenteSchema.partial().parse(req.body);
      const updated = await storage.updateCultoRecorrente(id, data);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao atualizar culto recorrente" });
    }
  });

  app.delete("/api/admin/cultos-recorrentes/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCultoRecorrente(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar culto recorrente" });
    }
  });

  // ── Schedule Requests ─────────────────────────────────────────────────────────

  app.get("/api/schedule-requests/pendentes", authenticateToken, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      let ministerioIds: number[] = [];
      if (user.isAdmin) {
        const todos = await storage.getAllMinisterios();
        ministerioIds = todos.map(m => m.id);
      } else {
        const liderancas = await storage.getUserLeaderMinisterios(user.id);
        ministerioIds = liderancas.map(m => m.id);
      }
      const pendentes = await storage.getPendingRequestsForMinisterios(ministerioIds);
      res.json(pendentes);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar solicitações pendentes" });
    }
  });

  app.post("/api/admin/schedule-requests", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertScheduleRequestSchema.parse(req.body);
      const novo = await storage.createScheduleRequest(data);
      res.status(201).json(novo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Erro ao criar solicitação" });
    }
  });

  app.patch("/api/schedule-requests/:id/fulfill", authenticateToken, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { scheduleId } = req.body;
      if (!scheduleId) return res.status(400).json({ message: "scheduleId é obrigatório" });
      const updated = await storage.fulfillScheduleRequest(id, scheduleId);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Erro ao cumprir solicitação" });
    }
  });

  app.delete("/api/admin/schedule-requests/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteScheduleRequest(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar solicitação" });
    }
  });


  // ── Módulos e Permissões ────────────────────────────────────────────────────

  // Middleware reutilizável: requer acesso ao módulo
  app.locals.requireModulo = function requireModulo(moduloChave: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      const ok = await storage.checkUserHasAccess(user.id, moduloChave);
      if (!ok) return res.status(403).json({ message: `Acesso ao módulo "${moduloChave}" negado.` });
      next();
    };
  };

  app.get("/api/admin/modulos", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const lista = await storage.getAllModulos();
      // Para cada módulo, retorna também as permissões
      const result = await Promise.all(lista.map(async m => ({
        ...m,
        permissoes: await storage.getPermissoesByModulo(m.id),
      })));
      res.json(result);
    } catch { res.status(500).json({ message: "Erro ao buscar módulos" }); }
  });

  app.post("/api/admin/modulos", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertModuloSchema.parse(req.body);
      const novo = await storage.createModulo(data);
      res.status(201).json(novo);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Dados inválidos", errors: e.errors });
      res.status(500).json({ message: "Erro ao criar módulo" });
    }
  });

  app.patch("/api/admin/modulos/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertModuloSchema.partial().parse(req.body);
      const updated = await storage.updateModulo(id, data);
      res.json(updated);
    } catch { res.status(500).json({ message: "Erro ao atualizar módulo" }); }
  });

  app.delete("/api/admin/modulos/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteModulo(parseInt(req.params.id));
      res.status(204).send();
    } catch { res.status(500).json({ message: "Erro ao deletar módulo" }); }
  });

  app.post("/api/admin/modulos/:id/permissoes", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const moduloId = parseInt(req.params.id);
      const { cargoChave } = req.body;
      if (!cargoChave) return res.status(400).json({ message: "cargoChave obrigatório" });
      const perm = await storage.addPermissao(moduloId, cargoChave);
      res.status(201).json(perm);
    } catch { res.status(500).json({ message: "Erro ao adicionar permissão" }); }
  });

  app.delete("/api/admin/modulos/:id/permissoes/:cargo", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const moduloId = parseInt(req.params.id);
      const cargoChave = decodeURIComponent(req.params.cargo);
      await storage.removePermissao(moduloId, cargoChave);
      res.status(204).send();
    } catch { res.status(500).json({ message: "Erro ao remover permissão" }); }
  });

  // Rota de verificação: retorna os cargos do usuário atual
  app.get("/api/meus-cargos", authenticateToken, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).userId;
      const cargos = await storage.getUserCargos(userId);
      res.json({ cargos });
    } catch { res.status(500).json({ message: "Erro" }); }
  });
}