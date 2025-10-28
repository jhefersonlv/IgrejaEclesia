import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, date, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - members and admins
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senha: text("senha").notNull(),
  dataNascimento: date("data_nascimento"),
  profissao: text("profissao"),
  endereco: text("endereco"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  ministerio: text("ministerio"), // Louvor, Obreiros, Infantil, etc
  isAdmin: boolean("is_admin").notNull().default(false),
  isLider: boolean("is_lider").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Events table
export const events = pgTable("events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  data: date("data").notNull(),
  local: text("local").notNull(),
  imagem: text("imagem"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull(),
  descricao: text("descricao").notNull(),
  imagem: text("imagem"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Lessons table (aulas)
export const lessons = pgTable("lessons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  cursoId: integer("curso_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  videoUrl: text("video_url").notNull(),
  ordem: integer("ordem").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Materials table (apostilas)
export const materials = pgTable("materials", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  arquivoUrl: text("arquivo_url").notNull(),
  tipo: text("tipo").notNull().default("pdf"), // pdf or video
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Prayer requests table
export const prayerRequests = pgTable("prayer_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull(),
  email: text("email"),
  pedido: text("pedido").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, archived
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem").notNull(),
  tipo: text("tipo").notNull(), // info, success, warning, error
  link: text("link"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schedules table (escalas)
export const schedules = pgTable("schedules", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  mes: integer("mes").notNull(), // 1-12
  ano: integer("ano").notNull(), // 2025, 2026, etc
  tipo: text("tipo").notNull(), // louvor, obreiros
  data: date("data").notNull(), // data específica do culto
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schedule assignments (atribuições de escala)
export const scheduleAssignments = pgTable("schedule_assignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  posicao: text("posicao").notNull(), // teclado, violao, baixo, bateria, voz, backing, obreiro
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const coursesRelations = relations(courses, ({ many }) => ({
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.cursoId],
    references: [courses.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
});

export const insertLessonSchema = createInsertSchema(lessons).omit({
  id: true,
  createdAt: true,
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export const insertPrayerRequestSchema = createInsertSchema(prayerRequests, {
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  pedido: z.string().min(10, "Pedido deve ter no mínimo 10 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
}).omit({
  id: true,
  createdAt: true,
  status: true,
  isPublic: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleAssignmentSchema = createInsertSchema(scheduleAssignments).omit({
  id: true,
  createdAt: true,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Lesson = typeof lessons.$inferSelect;
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type PrayerRequest = typeof prayerRequests.$inferSelect;
export type InsertPrayerRequest = z.infer<typeof insertPrayerRequestSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type ScheduleAssignment = typeof scheduleAssignments.$inferSelect;
export type InsertScheduleAssignment = z.infer<typeof insertScheduleAssignmentSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
