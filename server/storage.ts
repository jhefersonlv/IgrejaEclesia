import { db } from "./db";
import { users, events, courses, lessons, materials, prayerRequests, schedules, scheduleAssignments, questions, lessonCompletions, courseEnrollments, visitors, ministerios, userMinisterios, cultosRecorrentes, scheduleRequests, modulos, permissoes } from "@shared/schema";
import type { User, InsertUser, Event, InsertEvent, Course, InsertCourse, Lesson, InsertLesson, Material, InsertMaterial, PrayerRequest, InsertPrayerRequest, Schedule, InsertSchedule, ScheduleAssignment, InsertScheduleAssignment, Question, InsertQuestion, LessonCompletion, InsertLessonCompletion, CourseEnrollment, Visitor, InsertVisitor, Ministerio, InsertMinisterio, CultoRecorrente, InsertCultoRecorrente, ScheduleRequest, InsertScheduleRequest, Modulo, InsertModulo, Permissao } from "@shared/schema";
import { eq, and, gte, ne, sql, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Definição da interface que será usada no retorno
export interface ScheduleWithAssignments extends Schedule {
  assignments: (ScheduleAssignment & { user: User | null })[];
}

export interface CultoRecorrenteOcorrencia extends CultoRecorrente {
  dataCulto: string; // data específica da ocorrência no mês
  pendingRequests: ScheduleRequest[];
}

export interface ScheduleRequestWithDetails extends ScheduleRequest {
  evento?: Event | null;
  cultoRecorrente?: CultoRecorrente | null;
  ministerio?: Ministerio | null;
}

export interface IStorage {
  // Auth
  getUserByEmail(email: string): Promise<User | null>;
  createUser(data: InsertUser): Promise<User>;
  
  // Members
  getAllUsers(): Promise<User[]>;
  getUserById(id: number): Promise<User | null>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  updateUserAdmin(id: number, isAdmin: boolean): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Visitors
  getAllVisitors(): Promise<Visitor[]>;
  createVisitor(data: InsertVisitor): Promise<Visitor>;
  updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<Visitor>;
  deleteVisitor(id: number): Promise<void>;
  
  // Visitors Analytics
  getVisitorAnalytics(): Promise<{
    totalVisitors: number;
    visitorsByCulto: { culto: string; count: number }[];
    visitorsByOrigem: { origem: string; count: number }[];
    visitorsMembrouSe: number;
    recentVisitorsCount: number;
  }>;

  // General Analytics (Members + Visitors)
  getGeneralAnalytics(): Promise<{
    totalPeople: number;
    totalMembers: number;
    totalVisitors: number;
    visitorsMembrouSe: number;
  }>;
  
  // Events
  getAllEvents(): Promise<Event[]>;
  getPublicEvents(): Promise<Event[]>;
  createEvent(data: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  checkEventLocationConflict(local: string, data: string, excludeId?: number): Promise<{ hasConflict: boolean; conflictEvent?: { id: number; titulo: string; data: string } }>;
  getAgenda(month: number, year: number, userId: number, isAdmin: boolean, ministerioIds: number[]): Promise<{ events: Event[]; schedules: ScheduleWithAssignments[]; cultosRecorrentes: CultoRecorrenteOcorrencia[] }>;
  
  // Courses
  getAllCourses(): Promise<Course[]>;
  getCourseById(id: number): Promise<Course | null>;
  createCourse(data: InsertCourse): Promise<Course>;
  updateCourse(id: number, data: Partial<InsertCourse>): Promise<Course>;
  deleteCourse(id: number): Promise<void>;
  
  // Lessons
  getLessonsByCourseId(courseId: number): Promise<Lesson[]>;
  createLesson(data: InsertLesson): Promise<Lesson>;
  deleteLesson(id: number): Promise<void>;
  
  // Materials
  getAllMaterials(): Promise<Material[]>;
  createMaterial(data: InsertMaterial): Promise<Material>;
  deleteMaterial(id: number): Promise<void>;
  
  // Prayer Requests
  getAllPrayerRequests(): Promise<PrayerRequest[]>;
  getPublicPrayerRequests(): Promise<PrayerRequest[]>;
  createPrayerRequest(data: InsertPrayerRequest): Promise<PrayerRequest>;
  updatePrayerRequestStatus(id: number, status: string, isPublic: boolean): Promise<PrayerRequest>;
  deletePrayerRequest(id: number): Promise<void>;
  
  // Analytics
  getMemberAnalytics(): Promise<{
    totalMembers: number;
    membersByAge: { ageGroup: string; count: number }[];
    membersByNeighborhood: { neighborhood: string; count: number }[];
    membersByProfession: { profession: string; count: number }[];
    recentMembersCount: number;
  }>;
  
  // Schedules
  getAllSchedules(): Promise<ScheduleWithAssignments[]>;
  getSchedulesByMonth(mes: number, ano: number): Promise<ScheduleWithAssignments[]>;
  getUpcomingSchedules(): Promise<ScheduleWithAssignments[]>;
  getScheduleById(id: number): Promise<Schedule | null>;
  createSchedule(data: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, data: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  // Utility for debugging/admin
  getAllRawSchedules(): Promise<Schedule[]>;
  
  // Schedule Assignments
  getAssignmentsBySchedule(scheduleId: number): Promise<ScheduleAssignment[]>;
  createAssignment(data: InsertScheduleAssignment): Promise<ScheduleAssignment>;
  updateAssignment(id: number, userId: number | null): Promise<ScheduleAssignment>;
  deleteAssignment(id: number): Promise<void>;
  deleteAssignmentsBySchedule(scheduleId: number): Promise<void>;
  
  // Members with ministry filter
  getUsersByMinistry(ministerio: string): Promise<User[]>;
  updateUserMinistry(id: number, ministerio: string | null, isLider: boolean): Promise<User>;

  // Questions
  getQuestionsByLessonId(lessonId: number): Promise<Question[]>;
  createQuestion(data: InsertQuestion): Promise<Question>;
  deleteQuestion(id: number): Promise<void>;
  deleteQuestionsByLessonId(lessonId: number): Promise<void>;
  
  // Lesson Completions
  getLessonCompletion(userId: number, lessonId: number): Promise<LessonCompletion | null>;
  createOrUpdateLessonCompletion(userId: number, lessonId: number, score: number, completed: boolean): Promise<LessonCompletion>;
  getCourseProgress(userId: number, courseId: number): Promise<{ totalLessons: number, completedLessons: number, progress: number }>;
  getAllUsersProgress(courseId: number): Promise<{ userId: number; userName: string; progress: number; completedLessons: number }[]>;
  
  // Course Analytics
  getCourseAnalytics(): Promise<{
    totalCourses: number;
    totalLessons: number;
    totalCompletions: number;
    averageCompletionRate: number;
    courseStats: {
      courseId: number;
      courseName: string;
      totalLessons: number;
      totalCompletions: number;
      completionRate: number;
      studentsStarted: number;
      studentsCompleted: number;
    }[];
  }>;

  // Course Enrollments
  enrollUserInCourse(userId: number, courseId: number): Promise<CourseEnrollment>;
  unenrollUserFromCourse(userId: number, courseId: number): Promise<void>;
  getEnrolledUsers(courseId: number): Promise<User[]>;
  getEnrolledCourses(userId: number): Promise<Course[]>;

  // Aniversariantes
  getAniversariantesByMonth(mes: number): Promise<any[]>;

  // Ministerios
  getAllMinisterios(): Promise<Ministerio[]>;
  getMinisterioById(id: number): Promise<Ministerio | null>;
  createMinisterio(data: InsertMinisterio): Promise<Ministerio>;
  deleteMinisterio(id: number): Promise<void>;
  seedDefaultMinisterios(): Promise<void>;
  getUserMinisterios(userId: number): Promise<(Ministerio & { isLider: boolean })[]>;
  addUserToMinisterio(userId: number, ministerioId: number, isLider?: boolean): Promise<void>;
  removeUserFromMinisterio(userId: number, ministerioId: number): Promise<void>;
  setUserMinisterioLider(userId: number, ministerioId: number, isLider: boolean): Promise<void>;
  getUsersByMinisterioId(ministerioId: number): Promise<User[]>;
  getUserLeaderMinisterios(userId: number): Promise<Ministerio[]>;
  isUserLeaderOfMinisterio(userId: number, ministerioId: number): Promise<boolean>;

  // Conflict check
  checkScheduleConflict(userId: number, date: string, excludeAssignmentId?: number): Promise<{
    hasConflict: boolean;
    conflictInfo?: { scheduleId: number; tipo: string; data: string };
  }>;

  // Cultos Recorrentes
  getAllCultosRecorrentes(): Promise<CultoRecorrente[]>;
  getCultoRecorrenteById(id: number): Promise<CultoRecorrente | null>;
  createCultoRecorrente(data: InsertCultoRecorrente): Promise<CultoRecorrente>;
  updateCultoRecorrente(id: number, data: Partial<InsertCultoRecorrente>): Promise<CultoRecorrente>;
  deleteCultoRecorrente(id: number): Promise<void>;
  getCultosOcorrenciasNoMes(month: number, year: number): Promise<CultoRecorrenteOcorrencia[]>;

  // Schedule Requests
  getPendingRequestsForMinisterios(ministerioIds: number[]): Promise<ScheduleRequestWithDetails[]>;
  createScheduleRequest(data: InsertScheduleRequest): Promise<ScheduleRequest>;
  fulfillScheduleRequest(id: number, scheduleId: number): Promise<ScheduleRequest>;
  deleteScheduleRequest(id: number): Promise<void>;
  createMultipleScheduleRequests(requests: InsertScheduleRequest[]): Promise<ScheduleRequest[]>;

  // Módulos e Permissões
  getAllModulos(): Promise<Modulo[]>;
  getModuloByChave(chave: string): Promise<Modulo | null>;
  createModulo(data: InsertModulo): Promise<Modulo>;
  updateModulo(id: number, data: Partial<InsertModulo>): Promise<Modulo>;
  deleteModulo(id: number): Promise<void>;
  getPermissoesByModulo(moduloId: number): Promise<Permissao[]>;
  addPermissao(moduloId: number, cargoChave: string): Promise<Permissao>;
  removePermissao(moduloId: number, cargoChave: string): Promise<void>;
  checkUserHasAccess(userId: number, moduloChave: string): Promise<boolean>;
  getUserCargos(userId: number): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async createUser(data: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.senha, 10);
    const result = await db.insert(users).values({
      ...data,
      senha: hashedPassword,
    }).returning();
    return result[0];
  }

  // Members
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] || null;
  }

  async updateUserAdmin(id: number, isAdmin: boolean): Promise<User> {
    const result = await db.update(users)
      .set({ isAdmin })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    // Se a senha for fornecida, faça o hash
    const updateData = { ...data };
    if (updateData.senha) {
      updateData.senha = await bcrypt.hash(updateData.senha, 10);
    }
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Visitors
  async getAllVisitors(): Promise<Visitor[]> {
    return await db.select().from(visitors).orderBy(visitors.createdAt);
  }

  async createVisitor(data: InsertVisitor): Promise<Visitor> {
    const result = await db.insert(visitors).values(data).returning();
    return result[0];
  }

  async updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<Visitor> {
    const result = await db.update(visitors)
      .set(data)
      .where(eq(visitors.id, id))
      .returning();
    return result[0];
  }

  async deleteVisitor(id: number): Promise<void> {
    await db.delete(visitors).where(eq(visitors.id, id));
  }

  // Visitors Analytics
  async getVisitorAnalytics() {
    const allVisitors = await db.select().from(visitors);

    const totalVisitors = allVisitors.length;

    const byCultoMap: Record<string, number> = {};
    const byOrigemMap: Record<string, number> = {};
    let membrouSe = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let recentVisitorsCount = 0;

    for (const v of allVisitors) {
      if (v.culto) byCultoMap[v.culto] = (byCultoMap[v.culto] || 0) + 1;
      if (v.comoConheceu) byOrigemMap[v.comoConheceu] = (byOrigemMap[v.comoConheceu] || 0) + 1;
      if (v.membrouSe) membrouSe++;
      if (new Date(v.createdAt) >= thirtyDaysAgo) recentVisitorsCount++;
    }

    const visitorsByCulto = Object.entries(byCultoMap)
      .map(([culto, count]) => ({ culto, count }))
      .sort((a, b) => b.count - a.count);

    const visitorsByOrigem = Object.entries(byOrigemMap)
      .map(([origem, count]) => ({ origem, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalVisitors,
      visitorsByCulto,
      visitorsByOrigem,
      visitorsMembrouSe: membrouSe,
      recentVisitorsCount,
    };
  }

  // General Analytics (Members + Visitors)
  async getGeneralAnalytics() {
    const memberAgg = await this.getMemberAnalytics();
    const visitorAgg = await this.getVisitorAnalytics();

    const totalMembers = memberAgg.totalMembers;
    const totalVisitors = visitorAgg.totalVisitors;

    return {
      totalPeople: totalMembers + totalVisitors,
      totalMembers,
      totalVisitors,
      visitorsMembrouSe: visitorAgg.visitorsMembrouSe,
    };
  }

  // Events
  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(events.data);
  }

  async getPublicEvents(): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.isPublico, true)).orderBy(events.data);
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(data).returning();
    return result[0];
  }

  async updateEvent(id: number, data: Partial<InsertEvent>): Promise<Event> {
    const result = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async checkEventLocationConflict(
    local: string,
    data: string,
    excludeId?: number
  ): Promise<{ hasConflict: boolean; conflictEvent?: { id: number; titulo: string; data: string } }> {
    const conditions = [eq(events.local, local), eq(events.data, data)];
    if (excludeId) conditions.push(ne(events.id, excludeId));

    const conflicts = await db
      .select({ id: events.id, titulo: events.titulo, data: events.data })
      .from(events)
      .where(and(...conditions))
      .limit(1);

    if (conflicts.length > 0) return { hasConflict: true, conflictEvent: conflicts[0] };
    return { hasConflict: false };
  }

  async getAgenda(
    month: number,
    year: number,
    userId: number,
    isAdmin: boolean,
    ministerioIds: number[]
  ): Promise<{ events: Event[]; schedules: ScheduleWithAssignments[]; cultosRecorrentes: CultoRecorrenteOcorrencia[] }> {
    // Escalas do mês
    const scheduleRows = await this.getSchedulesByMonth(month, year);

    // Escalas filtradas por ministério (admin vê todas)
    const filteredSchedules = isAdmin
      ? scheduleRows
      : scheduleRows.filter(s => s.ministerioId && ministerioIds.includes(s.ministerioId));

    // Eventos: públicos + privados do ministério do usuário + admin vê todos
    let eventRows: Event[];
    if (isAdmin) {
      eventRows = await db.select().from(events)
        .where(and(sql`EXTRACT(MONTH FROM ${events.data}::date) = ${month}`, sql`EXTRACT(YEAR FROM ${events.data}::date) = ${year}`))
        .orderBy(events.data);
    } else {
      eventRows = await db.select().from(events)
        .where(and(
          sql`EXTRACT(MONTH FROM ${events.data}::date) = ${month}`,
          sql`EXTRACT(YEAR FROM ${events.data}::date) = ${year}`,
          sql`(${events.isPublico} = true OR ${events.ministerioId} IN ${ministerioIds.length > 0 ? sql`(${sql.join(ministerioIds.map(id => sql`${id}`), sql`, `)})` : sql`(NULL)`})`
        ))
        .orderBy(events.data);
    }

    // Cultos recorrentes com ocorrências no mês
    const cultosOcorrencias = await this.getCultosOcorrenciasNoMes(month, year);

    return { events: eventRows, schedules: filteredSchedules, cultosRecorrentes: cultosOcorrencias };
  }

  // Courses
  async getAllCourses(): Promise<Course[]> {
    return await db.select().from(courses);
  }

  async getCourseById(id: number): Promise<Course | null> {
    const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
    return result[0] || null;
  }

  async createCourse(data: InsertCourse): Promise<Course> {
    const result = await db.insert(courses).values(data).returning();
    return result[0];
  }

  async updateCourse(id: number, data: Partial<InsertCourse>): Promise<Course> {
    const result = await db.update(courses)
      .set(data)
      .where(eq(courses.id, id))
      .returning();
    return result[0];
  }

  async deleteCourse(id: number): Promise<void> {
    // Delete as lições dependentes primeiro (assumindo que o delete em cascata não está configurado)
    await db.delete(lessons).where(eq(lessons.cursoId, id));
    await db.delete(courses).where(eq(courses.id, id));
  }

  // Lessons
  async getLessonsByCourseId(courseId: number): Promise<Lesson[]> {
    return await db.select().from(lessons)
      .where(eq(lessons.cursoId, courseId))
      .orderBy(lessons.ordem);
  }

  async createLesson(data: InsertLesson): Promise<Lesson> {
    const result = await db.insert(lessons).values(data).returning();
    return result[0];
  }

  async deleteLesson(id: number): Promise<void> {
    await db.delete(lessons).where(eq(lessons.id, id));
  }

  // Materials
  async getAllMaterials(): Promise<Material[]> {
    return await db.select().from(materials);
  }

  async createMaterial(data: InsertMaterial): Promise<Material> {
    const result = await db.insert(materials).values(data).returning();
    return result[0];
  }

  async deleteMaterial(id: number): Promise<void> {
    await db.delete(materials).where(eq(materials.id, id));
  }

  // Prayer Requests
  async getAllPrayerRequests(): Promise<PrayerRequest[]> {
    return await db.select().from(prayerRequests).orderBy(prayerRequests.createdAt);
  }

  async getPublicPrayerRequests(): Promise<PrayerRequest[]> {
    return await db.select().from(prayerRequests)
      .where(eq(prayerRequests.isPublic, true))
      .orderBy(prayerRequests.createdAt);
  }

  async createPrayerRequest(data: InsertPrayerRequest): Promise<PrayerRequest> {
    const result = await db.insert(prayerRequests).values(data).returning();
    return result[0];
  }

  async updatePrayerRequestStatus(id: number, status: string, isPublic: boolean): Promise<PrayerRequest> {
    const result = await db.update(prayerRequests)
      .set({ status, isPublic })
      .where(eq(prayerRequests.id, id))
      .returning();
    return result[0];
  }

  async deletePrayerRequest(id: number): Promise<void> {
    await db.delete(prayerRequests).where(eq(prayerRequests.id, id));
  }

  // Analytics
  async getMemberAnalytics() {
    const allUsers = await db.select().from(users);
    
    const totalMembers = allUsers.length;
    
    // Calcula grupos de idade
    const ageGroups: Record<string, number> = {
      "18-25": 0,
      "26-35": 0,
      "36-45": 0,
      "46-55": 0,
      "56-65": 0,
      "66+": 0,
    };
    
    const now = new Date();
    allUsers.forEach(user => {
      if (user.dataNascimento) {
        const birthDate = new Date(user.dataNascimento);
        const age = now.getFullYear() - birthDate.getFullYear();
        
        if (age >= 18 && age <= 25) ageGroups["18-25"]++;
        else if (age >= 26 && age <= 35) ageGroups["26-35"]++;
        else if (age >= 36 && age <= 45) ageGroups["36-45"]++;
        else if (age >= 46 && age <= 55) ageGroups["46-55"]++;
        else if (age >= 56 && age <= 65) ageGroups["56-65"]++;
        else if (age >= 66) ageGroups["66+"]++;
      }
    });
    
    const membersByAge = Object.entries(ageGroups).map(([ageGroup, count]) => ({
      ageGroup,
      count,
    }));
    
    // Contagem por bairro
    const neighborhoodCounts: Record<string, number> = {};
    allUsers.forEach(user => {
      if (user.bairro) {
        neighborhoodCounts[user.bairro] = (neighborhoodCounts[user.bairro] || 0) + 1;
      }
    });
    
    const membersByNeighborhood = Object.entries(neighborhoodCounts)
      .map(([neighborhood, count]) => ({ neighborhood, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Contagem por profissão
    const professionCounts: Record<string, number> = {};
    allUsers.forEach(user => {
      if (user.profissao) {
        professionCounts[user.profissao] = (professionCounts[user.profissao] || 0) + 1;
      }
    });
    
    const membersByProfession = Object.entries(professionCounts)
      .map(([profession, count]) => ({ profession, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Conta membros que entraram nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMembersCount = allUsers.filter(user => 
      new Date(user.createdAt) >= thirtyDaysAgo
    ).length;
    
    return {
      totalMembers,
      membersByAge,
      membersByNeighborhood,
      membersByProfession,
      recentMembersCount,
    };
  }

  // Schedules
  async getAllSchedules(): Promise<ScheduleWithAssignments[]> {
    const rows = await db
      .select({
        schedule: schedules,
        assignment: scheduleAssignments,
        user: users,
      })
      .from(schedules)
      .leftJoin(scheduleAssignments, eq(schedules.id, scheduleAssignments.scheduleId))
      .leftJoin(users, eq(scheduleAssignments.userId, users.id))
      .orderBy(schedules.data);

    const scheduleMap: Record<number, ScheduleWithAssignments> = {};

    for (const row of rows) {
      const { schedule, assignment, user } = row;
      if (!scheduleMap[schedule.id]) {
        scheduleMap[schedule.id] = {
          ...schedule,
          assignments: [],
        };
      }

      if (assignment) {
        // Remove a senha do objeto de usuário antes de atribuir
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { senha, ...userWithoutPassword } = user || {};
        scheduleMap[schedule.id].assignments.push({
          ...assignment,
          // Convertemos para User, pois todos os campos necessários estão presentes, mesmo que 'senha' esteja faltando
          user: user ? (userWithoutPassword as User) : null,
        });
      }
    }

    return Object.values(scheduleMap);
  }

  // ⭐ ÚNICA MUDANÇA: Usa eq() nos campos mes e ano ao invés de EXTRACT
  async getSchedulesByMonth(mes: number, ano: number): Promise<ScheduleWithAssignments[]> {
    const rows = await db
      .select({
        schedule: schedules,
        assignment: scheduleAssignments,
        user: users,
      })
      .from(schedules)
      .leftJoin(scheduleAssignments, eq(schedules.id, scheduleAssignments.scheduleId))
      .leftJoin(users, eq(scheduleAssignments.userId, users.id))
      .where(
        and(
          eq(schedules.mes, mes),
          eq(schedules.ano, ano)
        )
      )
      .orderBy(schedules.data);

    // Mapeamento (lógica idêntica ao getAllSchedules)
    const scheduleMap: Record<number, ScheduleWithAssignments> = {};
    for (const row of rows) {
      const { schedule, assignment, user } = row;
      if (!scheduleMap[schedule.id]) {
        scheduleMap[schedule.id] = { ...schedule, assignments: [] };
      }
      if (assignment) {
        const { senha, ...userWithoutPassword } = user || {};
        scheduleMap[schedule.id].assignments.push({
          ...assignment,
          user: user ? (userWithoutPassword as User) : null,
        });
      }
    }
    return Object.values(scheduleMap);
  }

  // CORRIGIDO: Retorna `ScheduleWithAssignments[]` para consistência.
  async getUpcomingSchedules(): Promise<ScheduleWithAssignments[]> {
    const todayDateString = new Date().toISOString().split('T')[0];

    const rows = await db
      .select({
        schedule: schedules,
        assignment: scheduleAssignments,
        user: users,
      })
      .from(schedules)
      .leftJoin(scheduleAssignments, eq(schedules.id, scheduleAssignments.scheduleId))
      .leftJoin(users, eq(scheduleAssignments.userId, users.id))
      .where(gte(schedules.data, todayDateString))
      .orderBy(schedules.data);

    // Mapeamento (lógica idêntica ao getAllSchedules)
    const scheduleMap: Record<number, ScheduleWithAssignments> = {};
    for (const row of rows) {
      const { schedule, assignment, user } = row;
      if (!scheduleMap[schedule.id]) {
        scheduleMap[schedule.id] = { ...schedule, assignments: [] };
      }
      if (assignment) {
        const { senha, ...userWithoutPassword } = user || {};
        scheduleMap[schedule.id].assignments.push({
          ...assignment,
          user: user ? (userWithoutPassword as User) : null,
        });
      }
    }
    return Object.values(scheduleMap);
  }

  async getScheduleById(id: number): Promise<Schedule | null> {
    const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return result[0] || null;
  }

  async createSchedule(data: InsertSchedule): Promise<Schedule> {
    const [year, month] = data.data.split('-').map(Number);

    let tipo = data.tipo || "outro";
    if (data.ministerioId) {
      const ministerio = await this.getMinisterioById(data.ministerioId);
      if (ministerio) tipo = ministerio.tipo;
    }

    const result = await db.insert(schedules).values({
      ...data,
      tipo,
      mes: month,
      ano: year,
    }).returning();
    return result[0];
  }

  async updateSchedule(id: number, data: Partial<InsertSchedule>): Promise<Schedule> {
    const updateData: any = { ...data };

    // Se a data for alterada, recalcula mês e ano
    if (data.data) {
      const [year, month] = data.data.split('-').map(Number);
      updateData.mes = month;
      updateData.ano = year;
    }

    const result = await db.update(schedules)
      .set(updateData)
      .where(eq(schedules.id, id))
      .returning();
    return result[0];
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  // Utility for debugging/admin
  async getAllRawSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(schedules.data);
  }

  // Schedule Assignments
  async getAssignmentsBySchedule(scheduleId: number): Promise<ScheduleAssignment[]> {
    return await db.select().from(scheduleAssignments)
      .where(eq(scheduleAssignments.scheduleId, scheduleId));
  }

  async createAssignment(data: InsertScheduleAssignment): Promise<ScheduleAssignment> {
    const result = await db.insert(scheduleAssignments).values(data).returning();
    return result[0];
  }

  async updateAssignment(id: number, userId: number | null): Promise<ScheduleAssignment> {
    const result = await db.update(scheduleAssignments)
      .set({ userId })
      .where(eq(scheduleAssignments.id, id))
      .returning();
    return result[0];
  }

  async deleteAssignment(id: number): Promise<void> {
    await db.delete(scheduleAssignments).where(eq(scheduleAssignments.id, id));
  }

  async deleteAssignmentsBySchedule(scheduleId: number): Promise<void> {
    await db.delete(scheduleAssignments).where(eq(scheduleAssignments.scheduleId, scheduleId));
  }

  // Members with ministry filter
  async getUsersByMinistry(ministerio: string): Promise<User[]> {
    if (ministerio === "louvor") {
      return await db.select().from(users).where(eq(users.ministerioLouvor, true));
    }
    if (ministerio === "obreiro") {
      return await db.select().from(users).where(eq(users.ministerioObreiro, true));
    }
    return await db.select().from(users);
  }

  async updateUserMinistry(id: number, ministerio: string | null, isLider: boolean): Promise<User> {
    const updateData: any = { isLider };
    if (ministerio === "louvor") {
      updateData.ministerioLouvor = true;
      updateData.ministerioObreiro = false;
    } else if (ministerio === "obreiro") {
      updateData.ministerioLouvor = false;
      updateData.ministerioObreiro = true;
    } else {
      updateData.ministerioLouvor = false;
      updateData.ministerioObreiro = false;
    }

    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // Questions
  async getQuestionsByLessonId(lessonId: number): Promise<Question[]> {
    return await db.select().from(questions)
      .where(eq(questions.lessonId, lessonId))
      .orderBy(questions.ordem);
  }

  async createQuestion(data: InsertQuestion): Promise<Question> {
    const result = await db.insert(questions).values(data).returning();
    return result[0];
  }

  async deleteQuestion(id: number): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async deleteQuestionsByLessonId(lessonId: number): Promise<void> {
    await db.delete(questions).where(eq(questions.lessonId, lessonId));
  }

  // Lesson Completions
  async getLessonCompletion(userId: number, lessonId: number): Promise<LessonCompletion | null> {
    const result = await db.select().from(lessonCompletions)
      .where(and(
        eq(lessonCompletions.userId, userId),
        eq(lessonCompletions.lessonId, lessonId)
      ))
      .limit(1);
    return result[0] || null;
  }

  async createOrUpdateLessonCompletion(userId: number, lessonId: number, score: number, completed: boolean): Promise<LessonCompletion> {
    const existing = await this.getLessonCompletion(userId, lessonId);
    
    if (existing) {
      const result = await db.update(lessonCompletions)
        .set({
          score,
          completed,
          tentativas: existing.tentativas + 1,
          completedAt: completed ? new Date() : null,
        })
        .where(eq(lessonCompletions.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(lessonCompletions)
        .values({
          userId,
          lessonId,
          score,
          completed,
          completedAt: completed ? new Date() : null,
        })
        .returning();
      return result[0];
    }
  }

  async getCourseProgress(userId: number, courseId: number): Promise<{ totalLessons: number, completedLessons: number, progress: number }> {
    const courseLessons = await this.getLessonsByCourseId(courseId);
    const totalLessons = courseLessons.length;

    if (totalLessons === 0) {
      return { totalLessons: 0, completedLessons: 0, progress: 0 };
    }

    const completions = await db.select()
      .from(lessonCompletions)
      .where(and(
        eq(lessonCompletions.userId, userId),
        eq(lessonCompletions.completed, true)
      ));

    const completedLessonIds = new Set(completions.map(c => c.lessonId));
    // Filtra as conclusões para incluir apenas lições pertencentes ao curso fornecido
    const completedLessons = courseLessons.filter(l => completedLessonIds.has(l.id)).length;
    const progress = Math.round((completedLessons / totalLessons) * 100);

    return { totalLessons, completedLessons, progress };
  }

  async getAllUsersProgress(courseId: number): Promise<{ userId: number; userName: string; progress: number; completedLessons: number }[]> {
    const courseLessons = await this.getLessonsByCourseId(courseId);
    const totalLessons = courseLessons.length;

    if (totalLessons === 0) {
      return [];
    }

    const allUsers = await this.getAllUsers();
    const lessonIds = courseLessons.map(l => l.id);

    const results = await Promise.all(
      allUsers.map(async (user) => {
        // Busca todas as conclusões para o usuário, independentemente do curso
        const completions = await db.select()
          .from(lessonCompletions)
          .where(and(
            eq(lessonCompletions.userId, user.id),
            eq(lessonCompletions.completed, true)
          ));

        const completedLessonIds = new Set(completions.map(c => c.lessonId));
        // Conta quantas lições do curso estão no conjunto de concluídas
        const completedLessons = lessonIds.filter(id => completedLessonIds.has(id)).length;
        const progress = Math.round((completedLessons / totalLessons) * 100);

        return {
          userId: user.id,
          userName: user.nome,
          progress,
          completedLessons,
        };
      })
    );

    return results.filter(r => r.completedLessons > 0); // Retorna apenas usuários com progresso
  }

  async getCourseAnalytics() {
    const allCourses = await this.getAllCourses();
    const totalCourses = allCourses.length;
    
    // Busca todas as lições e todas as conclusões UMA VEZ para eficiência
    const allLessons = await db.select().from(lessons);
    const allCompletions = await db.select()
      .from(lessonCompletions)
      .where(eq(lessonCompletions.completed, true));
    
    // Agrupa lições por ID do curso para pesquisa O(1)
    const lessonsByCourse = new Map<number, typeof allLessons>();
    const lessonToCourse = new Map<number, number>();
    
    allLessons.forEach(lesson => {
      if (!lessonsByCourse.has(lesson.cursoId)) {
        lessonsByCourse.set(lesson.cursoId, []);
      }
      lessonsByCourse.get(lesson.cursoId)!.push(lesson);
      lessonToCourse.set(lesson.id, lesson.cursoId);
    });
    
    // Agrupa conclusões por ID do curso em UMA passagem
    const completionsByCourse = new Map<number, typeof allCompletions>();
    allCompletions.forEach(completion => {
      const courseId = lessonToCourse.get(completion.lessonId);
      if (courseId !== undefined) {
        if (!completionsByCourse.has(courseId)) {
          completionsByCourse.set(courseId, []);
        }
        completionsByCourse.get(courseId)!.push(completion);
      }
    });
    
    const totalLessons = allLessons.length;
    const totalCompletions = allCompletions.length;
    const courseStats = [];

    // Agora itera os cursos e usa mapas pré-calculados para acesso rápido
    for (const course of allCourses) {
      const courseLessons = lessonsByCourse.get(course.id) || [];

      if (courseLessons.length === 0) {
        courseStats.push({
          courseId: course.id,
          courseName: course.nome,
          totalLessons: 0,
          totalCompletions: 0,
          completionRate: 0,
          studentsStarted: 0,
          studentsCompleted: 0,
        });
        continue;
      }

      const courseCompletions = completionsByCourse.get(course.id) || [];

      // Conta usuários únicos que completaram pelo menos uma lição neste curso
      const userCompletionMap = new Map<number, number>();
      courseCompletions.forEach(c => {
        userCompletionMap.set(c.userId, (userCompletionMap.get(c.userId) || 0) + 1);
      });

      const studentsStarted = userCompletionMap.size;
      const studentsCompleted = Array.from(userCompletionMap.values())
        .filter(count => count === courseLessons.length).length;

      const completionRate = studentsStarted > 0 
        ? Math.round((studentsCompleted / studentsStarted) * 100)
        : 0;

      courseStats.push({
        courseId: course.id,
        courseName: course.nome,
        totalLessons: courseLessons.length,
        totalCompletions: courseCompletions.length,
        completionRate,
        studentsStarted,
        studentsCompleted,
      });
    }

    const averageCompletionRate = courseStats.length > 0
      ? Math.round(courseStats.reduce((sum, c) => sum + c.completionRate, 0) / courseStats.length)
      : 0;

    return {
      totalCourses,
      totalLessons,
      totalCompletions,
      averageCompletionRate,
      courseStats,
    };
  }

  // Course Enrollments
  async enrollUserInCourse(userId: number, courseId: number): Promise<CourseEnrollment> {
    const result = await db.insert(courseEnrollments).values({
      userId,
      courseId,
    }).returning();
    return result[0];
  }

  async unenrollUserFromCourse(userId: number, courseId: number): Promise<void> {
    await db.delete(courseEnrollments).where(and(
      eq(courseEnrollments.userId, userId),
      eq(courseEnrollments.courseId, courseId)
    ));
  }

  async getEnrolledUsers(courseId: number): Promise<User[]> {
    const enrollments = await db.select()
      .from(courseEnrollments)
      .where(eq(courseEnrollments.courseId, courseId))
      .leftJoin(users, eq(courseEnrollments.userId, users.id));

    // Exclui o campo sensível 'senha' manualmente, se necessário
    // Uma vez que o join seleciona todos os campos de 'users', confiamos que o consumidor não exporá 'senha'.
    return enrollments.map(e => e.users).filter((u): u is User => u !== null);
  }

  async getEnrolledCourses(userId: number): Promise<Course[]> {
    const enrollments = await db.select({ course: courses })
      .from(courseEnrollments)
      .where(eq(courseEnrollments.userId, userId))
      .leftJoin(courses, eq(courseEnrollments.courseId, courses.id));

    return enrollments.map(e => e.course).filter((c): c is Course => c !== null);
  }

  async getAniversariantesByMonth(mes: number): Promise<any[]> {
    const allUsers = await db.select().from(users);
    
    const aniversariantes = allUsers
      .filter(user => {
        if (!user.dataNascimento) return false;
        const birthDate = new Date(user.dataNascimento);
        return birthDate.getMonth() + 1 === mes;
      })
      .map(user => {
        const birthDate = new Date(user.dataNascimento!);
        return {
          id: user.id,
          nome: user.nome,
          fotoUrl: user.fotoUrl || null,
          dataNascimento: user.dataNascimento,
          dia: birthDate.getDate(),
          mes: birthDate.getMonth() + 1,
        };
      });
    
    return aniversariantes;
  }

  // Ministerios
  async getAllMinisterios(): Promise<Ministerio[]> {
    return await db.select().from(ministerios).orderBy(ministerios.nome);
  }

  async getMinisterioById(id: number): Promise<Ministerio | null> {
    const result = await db.select().from(ministerios).where(eq(ministerios.id, id)).limit(1);
    return result[0] || null;
  }

  async createMinisterio(data: InsertMinisterio): Promise<Ministerio> {
    const result = await db.insert(ministerios).values(data).returning();
    return result[0];
  }

  async deleteMinisterio(id: number): Promise<void> {
    await db.delete(ministerios).where(eq(ministerios.id, id));
  }

  async seedDefaultMinisterios(): Promise<void> {
    const existing = await db.select().from(ministerios).limit(1);
    if (existing.length > 0) return;

    const [louvor, obreiros] = await db.insert(ministerios).values([
      { nome: "Ministério de Louvor", tipo: "louvor", descricao: "Equipe de música e adoração" },
      { nome: "Ministério de Obreiros", tipo: "obreiros", descricao: "Equipe de recepção e serviço" },
    ]).returning();

    // Vincula escalas existentes ao ministério correto
    await db.execute(
      sql`UPDATE schedules SET ministerio_id = ${louvor.id} WHERE tipo = 'louvor' AND ministerio_id IS NULL`
    );
    await db.execute(
      sql`UPDATE schedules SET ministerio_id = ${obreiros.id} WHERE tipo = 'obreiros' AND ministerio_id IS NULL`
    );

    // Migra membros das flags booleanas para a junction table
    await db.execute(
      sql`INSERT INTO user_ministerios (user_id, ministerio_id, is_lider)
          SELECT id, ${louvor.id}, is_lider FROM users WHERE ministerio_louvor = true
          ON CONFLICT DO NOTHING`
    );
    await db.execute(
      sql`INSERT INTO user_ministerios (user_id, ministerio_id, is_lider)
          SELECT id, ${obreiros.id}, false FROM users WHERE ministerio_obreiro = true
          ON CONFLICT DO NOTHING`
    );
  }

  async getUserMinisterios(userId: number): Promise<(Ministerio & { isLider: boolean })[]> {
    const rows = await db
      .select({ ministerio: ministerios, isLider: userMinisterios.isLider })
      .from(userMinisterios)
      .innerJoin(ministerios, eq(userMinisterios.ministerioId, ministerios.id))
      .where(eq(userMinisterios.userId, userId));
    return rows.map(r => ({ ...r.ministerio, isLider: r.isLider }));
  }

  async addUserToMinisterio(userId: number, ministerioId: number, isLider = false): Promise<void> {
    await db.insert(userMinisterios).values({ userId, ministerioId, isLider }).onConflictDoNothing();
  }

  async removeUserFromMinisterio(userId: number, ministerioId: number): Promise<void> {
    await db.delete(userMinisterios).where(
      and(eq(userMinisterios.userId, userId), eq(userMinisterios.ministerioId, ministerioId))
    );
  }

  async setUserMinisterioLider(userId: number, ministerioId: number, isLider: boolean): Promise<void> {
    await db.update(userMinisterios)
      .set({ isLider })
      .where(and(eq(userMinisterios.userId, userId), eq(userMinisterios.ministerioId, ministerioId)));
  }

  async getUsersByMinisterioId(ministerioId: number): Promise<User[]> {
    const rows = await db
      .select({ user: users })
      .from(userMinisterios)
      .innerJoin(users, eq(userMinisterios.userId, users.id))
      .where(eq(userMinisterios.ministerioId, ministerioId));
    return rows.map(r => r.user);
  }

  async getUserLeaderMinisterios(userId: number): Promise<Ministerio[]> {
    const rows = await db
      .select({ ministerio: ministerios })
      .from(userMinisterios)
      .innerJoin(ministerios, eq(userMinisterios.ministerioId, ministerios.id))
      .where(and(eq(userMinisterios.userId, userId), eq(userMinisterios.isLider, true)));
    return rows.map(r => r.ministerio);
  }

  async isUserLeaderOfMinisterio(userId: number, ministerioId: number): Promise<boolean> {
    const rows = await db.select().from(userMinisterios).where(
      and(
        eq(userMinisterios.userId, userId),
        eq(userMinisterios.ministerioId, ministerioId),
        eq(userMinisterios.isLider, true)
      )
    ).limit(1);
    return rows.length > 0;
  }

  async checkScheduleConflict(
    userId: number,
    date: string,
    excludeAssignmentId?: number
  ): Promise<{ hasConflict: boolean; conflictInfo?: { scheduleId: number; tipo: string; data: string } }> {
    const conditions = [
      eq(scheduleAssignments.userId, userId),
      eq(schedules.data, date),
    ];
    if (excludeAssignmentId) {
      conditions.push(ne(scheduleAssignments.id, excludeAssignmentId));
    }

    const conflicts = await db
      .select({
        scheduleId: schedules.id,
        tipo: schedules.tipo,
        data: schedules.data,
      })
      .from(scheduleAssignments)
      .innerJoin(schedules, eq(scheduleAssignments.scheduleId, schedules.id))
      .where(and(...conditions))
      .limit(1);

    if (conflicts.length > 0) {
      return { hasConflict: true, conflictInfo: conflicts[0] };
    }
    return { hasConflict: false };
  }

  // Cultos Recorrentes
  async getAllCultosRecorrentes(): Promise<CultoRecorrente[]> {
    return await db.select().from(cultosRecorrentes).orderBy(cultosRecorrentes.diaSemana);
  }

  async getCultoRecorrenteById(id: number): Promise<CultoRecorrente | null> {
    const result = await db.select().from(cultosRecorrentes).where(eq(cultosRecorrentes.id, id)).limit(1);
    return result[0] || null;
  }

  async createCultoRecorrente(data: InsertCultoRecorrente): Promise<CultoRecorrente> {
    const result = await db.insert(cultosRecorrentes).values(data).returning();
    return result[0];
  }

  async updateCultoRecorrente(id: number, data: Partial<InsertCultoRecorrente>): Promise<CultoRecorrente> {
    const result = await db.update(cultosRecorrentes).set(data).where(eq(cultosRecorrentes.id, id)).returning();
    return result[0];
  }

  async deleteCultoRecorrente(id: number): Promise<void> {
    await db.delete(cultosRecorrentes).where(eq(cultosRecorrentes.id, id));
  }

  async getCultosOcorrenciasNoMes(month: number, year: number): Promise<CultoRecorrenteOcorrencia[]> {
    const todos = await this.getAllCultosRecorrentes();
    const ocorrencias: CultoRecorrenteOcorrencia[] = [];

    // Busca todas as schedule_requests pendentes para cultos recorrentes
    const pendingReqs = await db.select().from(scheduleRequests)
      .where(and(
        eq(scheduleRequests.status, "pendente"),
        sql`${scheduleRequests.cultoRecorrenteId} IS NOT NULL`
      ));

    const daysInMonth = new Date(year, month, 0).getDate();

    for (const culto of todos) {
      const inicio = new Date(culto.dataInicio + "T12:00:00");
      const fim = culto.dataFim ? new Date(culto.dataFim + "T12:00:00") : null;

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() !== culto.diaSemana) continue;
        if (date < inicio) continue;
        if (fim && date > fim) continue;

        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const relevantRequests = pendingReqs.filter(
          r => r.cultoRecorrenteId === culto.id && r.dataCulto === dateStr
        );

        ocorrencias.push({
          ...culto,
          dataCulto: dateStr,
          pendingRequests: relevantRequests,
        });
      }
    }

    return ocorrencias.sort((a, b) => a.dataCulto.localeCompare(b.dataCulto));
  }

  // Schedule Requests
  async getPendingRequestsForMinisterios(ministerioIds: number[]): Promise<ScheduleRequestWithDetails[]> {
    if (ministerioIds.length === 0) return [];

    const rows = await db.select().from(scheduleRequests)
      .where(and(
        eq(scheduleRequests.status, "pendente"),
        inArray(scheduleRequests.ministerioId, ministerioIds)
      ))
      .orderBy(scheduleRequests.createdAt);

    const results: ScheduleRequestWithDetails[] = [];
    for (const row of rows) {
      const detail: ScheduleRequestWithDetails = { ...row };
      if (row.eventoId) {
        const ev = await db.select().from(events).where(eq(events.id, row.eventoId)).limit(1);
        detail.evento = ev[0] || null;
      }
      if (row.cultoRecorrenteId) {
        const culto = await db.select().from(cultosRecorrentes).where(eq(cultosRecorrentes.id, row.cultoRecorrenteId)).limit(1);
        detail.cultoRecorrente = culto[0] || null;
      }
      const min = await db.select().from(ministerios).where(eq(ministerios.id, row.ministerioId)).limit(1);
      detail.ministerio = min[0] || null;
      results.push(detail);
    }
    return results;
  }

  async createScheduleRequest(data: InsertScheduleRequest): Promise<ScheduleRequest> {
    const result = await db.insert(scheduleRequests).values(data).returning();
    return result[0];
  }

  async fulfillScheduleRequest(id: number, scheduleId: number): Promise<ScheduleRequest> {
    const result = await db.update(scheduleRequests)
      .set({ status: "cumprida", scheduleId })
      .where(eq(scheduleRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduleRequest(id: number): Promise<void> {
    await db.delete(scheduleRequests).where(eq(scheduleRequests.id, id));
  }

  async createMultipleScheduleRequests(requests: InsertScheduleRequest[]): Promise<ScheduleRequest[]> {
    if (requests.length === 0) return [];
    const result = await db.insert(scheduleRequests).values(requests).returning();
    return result;
  }

  // ── Módulos e Permissões ────────────────────────────────────────────────────

  async getAllModulos(): Promise<Modulo[]> {
    return await db.select().from(modulos).orderBy(modulos.nome);
  }

  async getModuloByChave(chave: string): Promise<Modulo | null> {
    const r = await db.select().from(modulos).where(eq(modulos.chave, chave)).limit(1);
    return r[0] || null;
  }

  async createModulo(data: InsertModulo): Promise<Modulo> {
    const r = await db.insert(modulos).values(data).returning();
    return r[0];
  }

  async updateModulo(id: number, data: Partial<InsertModulo>): Promise<Modulo> {
    const r = await db.update(modulos).set(data).where(eq(modulos.id, id)).returning();
    return r[0];
  }

  async deleteModulo(id: number): Promise<void> {
    await db.delete(modulos).where(eq(modulos.id, id));
  }

  async getPermissoesByModulo(moduloId: number): Promise<Permissao[]> {
    return await db.select().from(permissoes).where(eq(permissoes.moduloId, moduloId));
  }

  async addPermissao(moduloId: number, cargoChave: string): Promise<Permissao> {
    const r = await db.insert(permissoes).values({ moduloId, cargoChave }).onConflictDoNothing().returning();
    if (r.length === 0) {
      const existing = await db.select().from(permissoes)
        .where(and(eq(permissoes.moduloId, moduloId), eq(permissoes.cargoChave, cargoChave))).limit(1);
      return existing[0];
    }
    return r[0];
  }

  async removePermissao(moduloId: number, cargoChave: string): Promise<void> {
    await db.delete(permissoes).where(
      and(eq(permissoes.moduloId, moduloId), eq(permissoes.cargoChave, cargoChave))
    );
  }

  /**
   * Retorna os cargos efetivos do usuário:
   * - "admin" se isAdmin
   * - "lider" se é líder de qualquer ministério
   * - "membro" sempre (usuário autenticado)
   * - "ministerio:NOME" para cada ministério do qual o usuário faz parte
   */
  async getUserCargos(userId: number): Promise<string[]> {
    const cargos: string[] = ["membro"];

    const user = await this.getUserById(userId);
    if (!user) return cargos;

    if (user.isAdmin) cargos.push("admin");

    const userMins = await db
      .select({ isLider: userMinisterios.isLider, nome: ministerios.nome })
      .from(userMinisterios)
      .innerJoin(ministerios, eq(userMinisterios.ministerioId, ministerios.id))
      .where(eq(userMinisterios.userId, userId));

    let isAnyLider = false;
    for (const m of userMins) {
      cargos.push(`ministerio:${m.nome}`);
      if (m.isLider) isAnyLider = true;
    }
    if (isAnyLider || user.isLider) cargos.push("lider");

    return cargos;
  }

  /**
   * Verifica se o usuário tem acesso ao módulo consultando as permissões no banco.
   * Admin sempre tem acesso.
   */
  async checkUserHasAccess(userId: number, moduloChave: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;
    if (user.isAdmin) return true;

    const modulo = await this.getModuloByChave(moduloChave);
    if (!modulo || !modulo.ativo) return false;

    const perms = await this.getPermissoesByModulo(modulo.id);
    if (perms.length === 0) return false;

    const userCargos = await this.getUserCargos(userId);

    return perms.some(p => userCargos.includes(p.cargoChave));
  }
}

export const storage = new DatabaseStorage();