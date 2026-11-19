import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import connectToDB from "../src/config/database.js";
import User from "../src/models/User.js";

dotenv.config();

/**
 * Task J: Create initial Admin user from environment variables.
 * Do not hardcode credentials.
 */
async function createFirstAdmin() {
  try {
    await connectToDB();

    const fullName = process.env.ADMIN_NAME || process.env.ADMIN_FULL_NAME || "UptoSkills Admin";
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.error("[createAdmin] Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.");
      process.exit(1);
    }

    if (password.length < 8) {
      console.error("[createAdmin] Error: ADMIN_PASSWORD must be at least 8 characters long.");
      process.exit(1);
    }

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      console.log(`[createAdmin] Admin account already exists for ${email}. No action needed.`);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: "admin",
      passwordSetAt: new Date()
    });

    console.log("========================================");
    console.log(" Initial Admin created successfully!");
    console.log(` Name: ${admin.fullName}`);
    console.log(` Email: ${admin.email}`);
    console.log(` Role: ${admin.role}`);
    console.log(" (Password was hashed with bcrypt and not logged)");
    console.log("========================================");

    process.exit(0);
  } catch (error) {
    console.error("[createAdmin] Error creating admin:", error.message || error);
    process.exit(1);
  }
}

createFirstAdmin();
