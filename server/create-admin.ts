import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash("B38adec6$@", 10);
    
    const [admin] = await db.insert(users).values({
      nome: "Jheferson",
      email: "jhefersonlv@hotmail.com",
      senha: hashedPassword,
      isAdmin: true,
    }).returning();
    
    console.log("✅ Usuário admin criado com sucesso!");
    console.log("Email:", admin.email);
    console.log("Nome:", admin.nome);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar admin:", error);
    process.exit(1);
  }
}

createAdmin();
