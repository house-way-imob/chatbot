ALTER TABLE "conversations" RENAME COLUMN "phone" TO "jid";--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_phone_unique";--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_jid_unique" UNIQUE("jid");
