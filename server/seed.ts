import { db } from "./db";
import { users, events, courses, lessons, materials } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const [admin] = await db.insert(users).values({
      nome: "Administrador",
      email: "admin@igreja.com",
      senha: hashedPassword,
      dataNascimento: "1980-01-01",
      profissao: "Pastor",
      endereco: "Rua da Igreja, 100",
      bairro: "Centro",
      cidade: "São Paulo",
      isAdmin: true,
    }).returning();
    console.log("✅ Admin user created:", admin.email);

    // Create regular member
    const memberPassword = await bcrypt.hash("membro123", 10);
    const [member] = await db.insert(users).values({
      nome: "João Silva",
      email: "joao@email.com",
      senha: memberPassword,
      dataNascimento: "1990-05-15",
      profissao: "Engenheiro",
      endereco: "Rua das Flores, 50",
      bairro: "Jardins",
      cidade: "São Paulo",
      isAdmin: false,
    }).returning();
    console.log("✅ Member user created:", member.email);

    // Create events
    const eventsData = [
      {
        titulo: "Culto de Celebração",
        descricao: "Culto especial de celebração com louvor e adoração",
        data: "2025-01-15",
        local: "Igreja Principal",
        imagem: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=800&q=80",
      },
      {
        titulo: "Retiro Espiritual",
        descricao: "Fim de semana de renovação espiritual nas montanhas",
        data: "2025-02-20",
        local: "Retiro Betânia",
        imagem: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80",
      },
      {
        titulo: "Conferência de Jovens",
        descricao: "Encontro de jovens com palestras e atividades",
        data: "2025-03-10",
        local: "Salão de Eventos",
        imagem: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
      },
    ];

    for (const event of eventsData) {
      await db.insert(events).values(event);
    }
    console.log(`✅ Created ${eventsData.length} events`);

    // Create courses
    const [curso1] = await db.insert(courses).values({
      nome: "Fundamentos da Fé",
      descricao: "Curso básico sobre os fundamentos da fé cristã",
      imagem: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    }).returning();

    const [curso2] = await db.insert(courses).values({
      nome: "Liderança Cristã",
      descricao: "Desenvolvimento de líderes segundo princípios bíblicos",
      imagem: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&q=80",
    }).returning();
    console.log("✅ Created 2 courses");

    // Create lessons for curso1
    await db.insert(lessons).values([
      {
        cursoId: curso1.id,
        titulo: "Introdução à Fé",
        descricao: "Entendendo os primeiros passos na fé cristã",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ordem: 1,
      },
      {
        cursoId: curso1.id,
        titulo: "A Palavra de Deus",
        descricao: "Conhecendo a Bíblia e sua importância",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ordem: 2,
      },
      {
        cursoId: curso1.id,
        titulo: "Vida de Oração",
        descricao: "Desenvolvendo uma vida de oração consistente",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ordem: 3,
      },
    ]);

    // Create lessons for curso2
    await db.insert(lessons).values([
      {
        cursoId: curso2.id,
        titulo: "O Chamado do Líder",
        descricao: "Entendendo o chamado para a liderança",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ordem: 1,
      },
      {
        cursoId: curso2.id,
        titulo: "Servindo com Excelência",
        descricao: "Princípios de excelência no serviço",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        ordem: 2,
      },
    ]);
    console.log("✅ Created 5 lessons");

    // Create materials
    await db.insert(materials).values([
      {
        titulo: "Manual do Novo Convertido",
        descricao: "Guia completo para novos membros",
        arquivoUrl: "https://example.com/manual.pdf",
        tipo: "pdf",
      },
      {
        titulo: "Estudo Bíblico - Romanos",
        descricao: "Apostila de estudo do livro de Romanos",
        arquivoUrl: "https://example.com/romanos.pdf",
        tipo: "pdf",
      },
      {
        titulo: "Mensagem do Pastor",
        descricao: "Palavra especial do pastor para os membros",
        arquivoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        tipo: "video",
      },
    ]);
    console.log("✅ Created 3 materials");

    console.log("\n🎉 Seeding completed successfully!");
    console.log("\n📝 Test credentials:");
    console.log("Admin: admin@igreja.com / admin123");
    console.log("Member: joao@email.com / membro123");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

seed();
