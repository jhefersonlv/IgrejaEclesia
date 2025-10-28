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
  isAdmin: boolean("is_admin").notNull().default(false),
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
export type LoginCredentials = z.infer<typeof loginSchema>;
