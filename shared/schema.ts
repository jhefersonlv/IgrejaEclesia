import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, date, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
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
  ministerioLouvor: boolean("ministerio_louvor").notNull().default(false),
  ministerioObreiro: boolean("ministerio_obreiro").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  isLider: boolean("is_lider").notNull().default(false),
  fotoUrl: text("foto_url"),
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
  louvores: text("louvores"), // JSON string com lista de louvores
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

// Questions table (perguntas do quiz por lição)
export const questions = pgTable("questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  pergunta: text("pergunta").notNull(),
  opcaoA: text("opcao_a").notNull(),
  opcaoB: text("opcao_b").notNull(),
  opcaoC: text("opcao_c").notNull(),
  respostaCorreta: text("resposta_correta").notNull(), // 'A', 'B', ou 'C'
  ordem: integer("ordem").notNull().default(1), // 1, 2, ou 3
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Lesson completions (conclusão de lições pelos usuários)
export const lessonCompletions = pgTable("lesson_completions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completed: boolean("completed").notNull().default(false),
  score: integer("score").notNull().default(0), // 0-3 (número de acertos)
  tentativas: integer("tentativas").notNull().default(1),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Course enrollments table (matrículas)
export const courseEnrollments = pgTable("course_enrollments", {
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.courseId] }),
  }
});

// Visitors table
export const visitors = pgTable("visitors", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  nome: text("nome").notNull(),
  whatsapp: text("whatsapp").notNull(),
  comoConheceu: text("como_conheceu").notNull(),
  culto: text("culto").notNull(), // Quarta, Domingo Manhã, Domingo Noite
  membrouSe: boolean("membrou_se").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(courseEnrollments),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  lessons: many(lessons),
  enrollments: many(courseEnrollments),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  course: one(courses, {
    fields: [lessons.cursoId],
    references: [courses.id],
  }),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ one }) => ({
  user: one(users, {
    fields: [courseEnrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [courseEnrollments.courseId],
    references: [courses.id],
  }),
}));

// Insert schemas
export const insertUserSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  dataNascimento: z.string().optional(),
  profissao: z.string().optional(),
  endereco: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  ministerioLouvor: z.boolean().optional(),
  ministerioObreiro: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isLider: z.boolean().optional(),
  fotoUrl: z.string().optional(),
});

export const insertEventSchema = z.object({
  titulo: z.string(),
  descricao: z.string(),
  data: z.string(),
  local: z.string(),
  imagem: z.string().optional(),
});

export const insertCourseSchema = z.object({
  nome: z.string(),
  descricao: z.string(),
  imagem: z.string().optional(),
});

export const insertLessonSchema = z.object({
  cursoId: z.number(),
  titulo: z.string(),
  descricao: z.string(),
  videoUrl: z.string(),
  ordem: z.number().optional(),
});

export const insertMaterialSchema = z.object({
  titulo: z.string(),
  descricao: z.string().optional(),
  arquivoUrl: z.string(),
  tipo: z.string().optional(),
});

export const insertPrayerRequestSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  pedido: z.string().min(10, "Pedido deve ter no mínimo 10 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

export const insertNotificationSchema = z.object({
  userId: z.number().optional(),
  titulo: z.string(),
  mensagem: z.string(),
  tipo: z.string(),
  link: z.string().optional(),
});

export const insertScheduleSchema = z.object({
  tipo: z.string(),
  data: z.string().min(1, "A data é obrigatória"), // Garante que a data não seja vazia
  observacoes: z.string().optional(),
  louvores: z.string().optional(),
});

export const insertScheduleAssignmentSchema = z.object({
  scheduleId: z.number(),
  userId: z.number().optional(),
  posicao: z.string(),
});

export const insertQuestionSchema = z.object({
  lessonId: z.number(),
  pergunta: z.string().min(10, "Pergunta deve ter no mínimo 10 caracteres"),
  opcaoA: z.string().min(1, "Opção A é obrigatória"),
  opcaoB: z.string().min(1, "Opção B é obrigatória"),
  opcaoC: z.string().min(1, "Opção C é obrigatória"),
  respostaCorreta: z.enum(["A", "B", "C"], { message: "Resposta correta deve ser A, B ou C" }),
  ordem: z.number().optional(),
});

export const insertLessonCompletionSchema = z.object({
  userId: z.number(),
  lessonId: z.number(),
  completed: z.boolean(),
  score: z.number(),
  tentativas: z.number(),
});

export const insertCourseEnrollmentSchema = z.object({
  userId: z.number(),
  courseId: z.number(),
});

// Visitors ZOD
export const insertVisitorSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  whatsapp: z.string().min(8, "Telefone inválido"),
  comoConheceu: z.string(),
  culto: z.string(),
  membrouSe: z.boolean(),
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
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;
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
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type LessonCompletion = typeof lessonCompletions.$inferSelect;
export type InsertLessonCompletion = z.infer<typeof insertLessonCompletionSchema>;
export type Visitor = typeof visitors.$inferSelect;
export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
