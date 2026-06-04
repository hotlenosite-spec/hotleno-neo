import { readFile } from "node:fs/promises";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import process from "node:process";
import { GoogleAuth } from "google-auth-library";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

async function loadEnvFile(filePath) {
  try {
    const content = await readFile(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const users = [
  {
    email: "admin@hotleno.com",
    password: "Admin@123456",
    name: "HOTLENO Admin",
    role: "admin",
    accountType: "admin",
    supplierScope: null,
  },
  {
    email: "tbo.tester@hotleno.com",
    password: "Tbo@123456",
    name: "TBO Tester",
    role: "supplier_tester",
    accountType: "supplier_test",
    supplierScope: "tbo",
  },
  {
    email: "hotelbeds.tester@hotleno.com",
    password: "Hotelbeds@123456",
    name: "Hotelbeds Tester",
    role: "supplier_tester",
    accountType: "supplier_test",
    supplierScope: "hotelbeds",
  },
];

function resolveServiceAccountPath(credentialsPath) {
  if (existsSync(credentialsPath)) return credentialsPath;

  const fallback = readdirSync(dirname(credentialsPath)).find(
    (fileName) =>
      fileName.includes("firebase-adminsdk") && fileName.endsWith(".json"),
  );

  if (fallback) return join(dirname(credentialsPath), fallback);

  throw new Error("Firebase service account file was not found");
}

function looksLikeBase64(value) {
  const compact = value.trim();
  return (
    !compact.startsWith("{") &&
    /^[A-Za-z0-9+/=_-]+$/.test(compact) &&
    compact.length > 40
  );
}

function parseInlineServiceAccount(value) {
  const trimmed = value.trim();
  const jsonText = looksLikeBase64(trimmed)
    ? Buffer.from(trimmed.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    : trimmed;
  const parsed = JSON.parse(jsonText);
  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service account fields");
  }
  return parsed;
}

function getServiceAccountKeyFile() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) {
    const directory = mkdtempSync(join(tmpdir(), "hotleno-firebase-"));
    const keyFile = join(directory, "service-account.json");
    writeFileSync(
      keyFile,
      JSON.stringify(parseInlineServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
      { mode: 0o600 },
    );
    return keyFile;
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "Firebase service account is required. Set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel or GOOGLE_APPLICATION_CREDENTIALS locally.",
    );
  }

  return resolveServiceAccountPath(process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function getAuth(keyFile) {
  return new GoogleAuth({
    keyFile,
    scopes: [
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/cloud-platform",
    ],
  });
}

async function getFirestoreMongoInfo(keyFile) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const databaseId = process.env.FIREBASE_DATABASE_ID || "default";
  const authClient = await getAuth(keyFile).getClient();
  const response = await authClient.request({
    url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}`,
  });

  if (!response.data.uid || !response.data.locationId) {
    throw new Error("Unable to resolve Firestore MongoDB compatibility endpoint");
  }

  return {
    uid: response.data.uid,
    locationId: response.data.locationId,
    databaseId,
  };
}

async function getClient(keyFile) {
  const info = await getFirestoreMongoInfo(keyFile);
  const auth = getAuth(keyFile);
  const uri = `mongodb://${info.uid}.${info.locationId}.firestore.goog:443/${info.databaseId}?loadBalanced=true&authMechanism=MONGODB-OIDC&tls=true&retryWrites=false`;
  const client = new MongoClient(uri, {
    authMechanismProperties: {
      ALLOWED_HOSTS: ["*.firestore.goog"],
      OIDC_CALLBACK: async () => ({
        accessToken: await auth.getAccessToken(),
        expiresInSeconds: 300,
      }),
    },
  });

  await client.connect();
  return { client, db: client.db(info.databaseId) };
}

async function main() {
  await loadEnvFile(".env.local");

  const serviceAccountPath = getServiceAccountKeyFile();
  const { client, db } = await getClient(serviceAccountPath);
  const usersCollection = db.collection("users");

  for (const user of users) {
    const password = await bcrypt.hash(user.password, 10);
    const now = new Date();
    await usersCollection.updateOne(
      { _id: user.email },
      {
        $set: {
          email: user.email,
          name: user.name,
          password,
          role: user.role,
          accountType: user.accountType,
          supplierScope: user.supplierScope,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          avatar: "",
          agencyId: null,
          agencyRole: null,
          hotelPartnerId: null,
          hotelRole: null,
          phone: "",
          nationality: "",
          preferences: {
            currency: "USD",
            language: "en",
            emailNotifications: true,
            priceAlerts: false,
            newsletter: true,
            theme: "system",
          },
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  const defaults = [
    { supplier: "tbo", enabled: true, environment: "staging" },
    { supplier: "hotelbeds", enabled: false, environment: "test" },
    { supplier: "travellanda", enabled: false, environment: "staging" },
    { supplier: "mock", enabled: false, environment: "mock" },
  ];

  for (const setting of defaults) {
    await db.collection("supplier_settings").updateOne(
      { _id: setting.supplier },
      {
        $set: {
          ...setting,
          updatedBy: "seed-local-accounts",
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  for (const collectionName of ["bookings", "logs"]) {
    await db.collection(collectionName).updateOne(
      { _id: "_meta" },
      { $set: { initialized: true, updatedAt: new Date() } },
      { upsert: true },
    );
  }

  await client.close();

  console.log(
    JSON.stringify(
      {
        success: true,
        users: users.map((user) => ({
          email: user.email,
          role: user.role,
          supplierScope: user.supplierScope,
        })),
        supplierSettingsSeeded: true,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
