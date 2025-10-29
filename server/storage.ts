import { db } from "./db";
import { users, events, courses, lessons, materials, prayerRequests, schedules, scheduleAssignments, questions, lessonCompletions } from "@shared/schema";
import type { User, InsertUser, Event, InsertEvent, Course, InsertCourse, Lesson, InsertLesson, Material, InsertMaterial, PrayerRequest, InsertPrayerRequest, Schedule, InsertSchedule, ScheduleAssignment, InsertScheduleAssignment, Question, InsertQuestion, LessonCompletion, InsertLessonCompletion } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  
  // Events
  getAllEvents(): Promise<Event[]>;
  getPublicEvents(): Promise<Event[]>;
  createEvent(data: InsertEvent): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  
  // Courses
  getAllCourses(): Promise<Course[]>;
  getCourseById(id: number): Promise<Course | null>;
  createCourse(data: InsertCourse): Promise<Course>;
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
  getAllSchedules(): Promise<Schedule[]>;
  getSchedulesByMonth(mes: number, ano: number): Promise<Schedule[]>;
  getScheduleById(id: number): Promise<Schedule | null>;
  createSchedule(data: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, data: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;
  
  // Schedule Assignments
  getAssignmentsBySchedule(scheduleId: number): Promise<ScheduleAssignment[]>;
  createAssignment(data: InsertScheduleAssignment): Promise<ScheduleAssignment>;
  updateAssignment(id: number, userId: number | null): Promise<ScheduleAssignment>;
  deleteAssignment(id: number): Promise<void>;
  deleteAssignmentsBySchedule(scheduleId: number): Promise<void>;
  
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
    // If password is provided, hash it
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

  // Events
  async getAllEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(events.data);
  }

  async getPublicEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(events.data);
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(data).returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
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

  async deleteCourse(id: number): Promise<void> {
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
    
    // Calculate age groups
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
    
    // Count by neighborhood
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
    
    // Count by profession
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
    
    // Count members joined in last 30 days
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
  async getAllSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).orderBy(schedules.data);
  }

  async getSchedulesByMonth(mes: number, ano: number): Promise<Schedule[]> {
    return await db.select().from(schedules)
      .where(and(eq(schedules.mes, mes), eq(schedules.ano, ano)))
      .orderBy(schedules.data);
  }

  async getScheduleById(id: number): Promise<Schedule | null> {
    const result = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    return result[0] || null;
  }

  async createSchedule(data: InsertSchedule): Promise<Schedule> {
    const result = await db.insert(schedules).values(data).returning();
    return result[0];
  }

  async updateSchedule(id: number, data: Partial<InsertSchedule>): Promise<Schedule> {
    const result = await db.update(schedules)
      .set(data)
      .where(eq(schedules.id, id))
      .returning();
    return result[0];
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  // Schedule Assignments
  async getAssignmentsBySchedule(scheduleId: number): Promise<ScheduleAssignment[]> {
    return await db.select().from(scheduleAssignments)
      .where(eq(scheduleAssignments.scheduleId, scheduleId));
  }

  async createAssignment(data: InsertScheduleAssignment): Promise<ScheduleAssignment> {
    if (data.userId) {
      const user = await this.getUserById(data.userId);
      const schedule = await this.getScheduleById(data.scheduleId);
      if (!user || !schedule) throw new Error("Usuário ou escala não encontrados.");

      if (schedule.tipo === "louvor" && !user.ministerioLouvor) {
        throw new Error("Usuário não pertence ao ministério de louvor.");
      }
      if (schedule.tipo === "obreiros" && !user.ministerioObreiro) {
        throw new Error("Usuário não pertence ao ministério de obreiros.");
      }
    }
    const result = await db.insert(scheduleAssignments).values(data).returning();
    return result[0];
  }

  async updateAssignment(id: number, userId: number | null): Promise<ScheduleAssignment> {
    const assignment = (await db.select().from(scheduleAssignments).where(eq(scheduleAssignments.id, id)).limit(1))[0];
    if (!assignment) throw new Error("Atribuição não encontrada.");

    if (userId) {
      const user = await this.getUserById(userId);
      const schedule = await this.getScheduleById(assignment.scheduleId);
      if (!user || !schedule) throw new Error("Usuário ou escala não encontrados.");

      if (schedule.tipo === "louvor" && !user.ministerioLouvor) {
        throw new Error("Usuário não pertence ao ministério de louvor.");
      }
      if (schedule.tipo === "obreiros" && !user.ministerioObreiro) {
        throw new Error("Usuário não pertence ao ministério de obreiros.");
      }
    }
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
        const completions = await db.select()
          .from(lessonCompletions)
          .where(and(
            eq(lessonCompletions.userId, user.id),
            eq(lessonCompletions.completed, true)
          ));

        const completedLessonIds = new Set(completions.map(c => c.lessonId));
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

    return results.filter(r => r.completedLessons > 0); // Only return users with progress
  }

  async getCourseAnalytics() {
    const allCourses = await this.getAllCourses();
    const totalCourses = allCourses.length;
    
    // Fetch all lessons and all completions ONCE
    const allLessons = await db.select().from(lessons);
    const allCompletions = await db.select()
      .from(lessonCompletions)
      .where(eq(lessonCompletions.completed, true));
    
    // Group lessons by course ID for O(1) lookup
    const lessonsByCourse = new Map<number, typeof allLessons>();
    const lessonToCourse = new Map<number, number>();
    
    allLessons.forEach(lesson => {
      if (!lessonsByCourse.has(lesson.cursoId)) {
        lessonsByCourse.set(lesson.cursoId, []);
      }
      lessonsByCourse.get(lesson.cursoId)!.push(lesson);
      lessonToCourse.set(lesson.id, lesson.cursoId);
    });
    
    // Group completions by course ID in ONE pass (O(n) instead of O(n*m))
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

    // Now iterate courses and use precomputed maps for O(1) access
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

      // Count unique users who completed at least one lesson
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
}

export const storage = new DatabaseStorage();
