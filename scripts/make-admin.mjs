import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/hotleno";

async function makeAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const email = process.argv[2]; // Get email from command line

    if (!email) {
      console.log("Usage: node make-admin.js your-email@example.com");
      process.exit(1);
    }

    const result = await mongoose.connection
      .collection("users")
      .updateOne({ email: email }, { $set: { role: "admin" } });

    if (result.matchedCount === 0) {
      console.log(`User with email ${email} not found`);
    } else if (result.modifiedCount === 1) {
      console.log(`✅ User ${email} is now an admin!`);
    } else {
      console.log("No changes made (user might already be admin)");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

makeAdmin();
