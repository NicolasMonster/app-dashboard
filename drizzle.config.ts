import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;

// Only throw error if actually running a drizzle command
// This allows the app to run without a database for development
if (!connectionString && process.argv.includes('drizzle-kit')) {
  console.warn("⚠️  DATABASE_URL not set. Database features will be disabled.");
  console.warn("   To use database features, set DATABASE_URL in your .env file");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString || "mysql://localhost:3306/placeholder",
  },
});
