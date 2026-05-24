import fs from "fs";
import mongoose from "mongoose";

function loadEnvLocal() {
  const path = ".env.local";
  if (!fs.existsSync(path)) return;

  const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    process.env[key] = value;
  }
}

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hotleno";

await mongoose.connect(MONGODB_URI);

const admins = await mongoose.connection.db
  .collection("users")
  .find({ role: "admin" })
  .project({ email: 1, name: 1, role: 1, createdAt: 1 })
  .toArray();

console.log(JSON.stringify(admins, null, 2));

await mongoose.disconnect();
