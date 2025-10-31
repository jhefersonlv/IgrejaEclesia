import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertUserSchema, insertEventSchema, insertCourseSchema, insertLessonSchema, insertMaterialSchema, insertPrayerRequestSchema, loginSchema, insertScheduleSchema, insertScheduleAssignmentSchema, insertQuestionSchema, insertVisitorSchema } from "@shared/schema";
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

  // Schedule Routes (for leaders and members)
  const requireLeader = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.isLider && !req.user?.isAdmin) {
      return res.status(403).json({ message: "Acesso negado. Apenas líderes podem acessar." });
    }
    next();
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

  // Create schedule (leaders only)
  app.post("/api/schedules", authenticateToken, requireLeader, async (req: Request, res: Response) => {
    try {
      const scheduleData = insertScheduleSchema.parse(req.body);
      const newSchedule = await storage.createSchedule(scheduleData);
      res.status(201).json(newSchedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Create schedule error:", error);
      res.status(500).json({ message: "Erro ao criar escala" });
    }
  });

  // Update schedule (leaders only)
  app.patch("/api/schedules/:id", authenticateToken, requireLeader, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const updatedSchedule = await storage.updateSchedule(id, updateData);
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Update schedule error:", error);
      res.status(500).json({ message: "Erro ao atualizar escala" });
    }
  });

  // Delete schedule (leaders only)
  app.delete("/api/schedules/:id", authenticateToken, requireLeader, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSchedule(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete schedule error:", error);
      res.status(500).json({ message: "Erro ao deletar escala" });
    }
  });

  // Create assignment (leaders only)
  app.post("/api/assignments", authenticateToken, requireLeader, async (req: Request, res: Response) => {
    try {
      const assignmentData = insertScheduleAssignmentSchema.parse(req.body);
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
  app.patch("/api/assignments/:id", authenticateToken, requireLeader, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { userId } = req.body;
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
}