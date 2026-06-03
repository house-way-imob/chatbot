CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"telefone" text NOT NULL,
	"nome" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leads_telefone_unique" UNIQUE("telefone")
);
--> statement-breakpoint
CREATE TABLE "photographers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "photographers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"step" text DEFAULT 'START' NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lastMessageAt" timestamp DEFAULT now() NOT NULL,
	"leadId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"leadId" text NOT NULL,
	"photographerId" text NOT NULL,
	"startsAt" timestamp NOT NULL,
	"endsAt" timestamp NOT NULL,
	"propertyAddress" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"serviceType" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travel_time_cache" (
	"id" text PRIMARY KEY NOT NULL,
	"originLat" double precision NOT NULL,
	"originLng" double precision NOT NULL,
	"destLat" double precision NOT NULL,
	"destLng" double precision NOT NULL,
	"durationSeconds" integer NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_leadId_leads_id_fk" FOREIGN KEY ("leadId") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_photographerId_photographers_id_fk" FOREIGN KEY ("photographerId") REFERENCES "public"."photographers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "travel_time_cache_coords_idx" ON "travel_time_cache" USING btree ("originLat","originLng","destLat","destLng");