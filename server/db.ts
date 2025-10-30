// server/db.ts
import 'dotenv/config'; // garante que o .env será carregado
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';
import { types } from 'pg';

// Força o node-postgres a não converter datas para objetos Date do JS.
// Em vez disso, elas serão retornadas como strings (ex: '2025-10-25').
// Isso evita completamente os problemas de fuso horário.
types.setTypeParser(types.builtins.DATE, (val) => val);

// Configura WebSocket para Neon
neonConfig.webSocketConstructor = ws;

// Verifica se a variável de ambiente existe
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Cria a conexão com o Neon
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Inicializa o Drizzle
export const db = drizzle(pool, { schema });
