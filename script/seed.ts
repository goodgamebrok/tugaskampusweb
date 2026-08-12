import { db } from "./server/db";
import { packages, showcase, gameSupport } from "./shared/schema";
import "dotenv/config";

async function seed() {
  console.log("Seeding dummy data...");

  // Seed Packages
  await db.insert(packages).values([
    {
      title: "Starter",
      durationDays: 7,
      price: "50000",
      description: "Paket mingguan",
      isPopular: 0,
      feature1: "Akses Semua Game",
      feature2: "Support 24/7",
      feature3: "Anti Ban Protection",
    },
    {
      title: "Pro",
      durationDays: 30,
      price: "150000",
      description: "Paket bulanan",
      isPopular: 1,
      feature1: "Akses Semua Game",
      feature2: "Prioritas Support",
      feature3: "Anti Ban Protection",
      feature4: "Private Script Request",
    },
    {
      title: "Lifetime",
      durationDays: 3650, // "Lifetime" roughly
      price: "500000",
      description: "Paket selamanya",
      isPopular: 0,
      feature1: "Akses Semua Game",
      feature2: "Prioritas Support VIP",
      feature3: "Anti Ban Protection",
      feature4: "Semua Fitur Premium",
    }
  ]);

  // Seed Games
  await db.insert(gameSupport).values([
    { gameName: "Blox Fruits", status: "full", logoUrl: "" },
    { gameName: "Pet Simulator X", status: "full", logoUrl: "" },
    { gameName: "Arsenal", status: "partial", logoUrl: "" },
    { gameName: "Jailbreak", status: "full", logoUrl: "" },
    { gameName: "Adopt Me", status: "not_supported", logoUrl: "" },
    { gameName: "Tower of Hell", status: "full", logoUrl: "" },
  ]);

  // Seed Showcase
  await db.insert(showcase).values([
    {
      scriptName: "Auto Farm OP",
      gameName: "Blox Fruits",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      views: 0
    },
    {
      scriptName: "Auto Hatch",
      gameName: "Pet Simulator X",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      views: 0
    },
    {
      scriptName: "Aimbot + ESP",
      gameName: "Arsenal",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      views: 0
    }
  ]);

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Error seeding:", err);
  process.exit(1);
});
