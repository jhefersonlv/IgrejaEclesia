import { db } from "./db";
import { users, events, courses, lessons, materials, prayerRequests, schedules, scheduleAssignments } from "@shared/schema";
import type { User, InsertUser, Event, InsertEvent, Course, InsertCourse, Lesson, InsertLesson, Material, InsertMaterial, PrayerRequest, InsertPrayerRequest, Schedule, InsertSchedule, ScheduleAssignment, InsertScheduleAssignment } from "@shared/schema";
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
  
  // Members with ministry filter
  getUsersByMinistry(ministerio: string): Promise<User[]>;
  updateUserMinistry(id: number, ministerio: string | null, isLider: boolean): Promise<User>;
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
    return await db.select().from(users).where(eq(users.ministerio, ministerio));
  }

  async updateUserMinistry(id: number, ministerio: string | null, isLider: boolean): Promise<User> {
    const result = await db.update(users)
      .set({ ministerio, isLider })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
