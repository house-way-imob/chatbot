ALTER TABLE "leads" RENAME COLUMN "telefone" TO "jid";--> statement-breakpoint
ALTER TABLE "leads" DROP CONSTRAINT "leads_telefone_unique";--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_jid_unique" UNIQUE("jid");--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "size" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "serviceType" text;
