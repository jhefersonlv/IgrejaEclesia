CREATE TABLE "visitors" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "visitors_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"whatsapp" text NOT NULL,
	"como_conheceu" text NOT NULL,
	"culto" text NOT NULL,
	"membrou_se" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
