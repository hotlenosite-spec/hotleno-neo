import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { GoogleAuth } from "google-auth-library";
import { MongoClient, type Db } from "mongodb";

type FirestoreDatabaseInfo = {
  uid: string;
  locationId: string;
  databaseId: string;
};

let client: MongoClient | null = null;
let db: Db | null = null;
let databaseInfo: FirestoreDatabaseInfo | null = null;
let serviceAccountKeyFile: string | null = null;

type FirebaseServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

function looksLikeBase64(value: string) {
  const compact = value.trim();
  return (
    !compact.startsWith("{") &&
    /^[A-Za-z0-9+/=_-]+$/.test(compact) &&
    compact.length > 40
  );
}

function parseServiceAccountJson(value: string): FirebaseServiceAccount {
  const trimmed = value.trim();
  const jsonText = looksLikeBase64(trimmed)
    ? Buffer.from(trimmed.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
    : trimmed;
  const parsed = JSON.parse(jsonText) as FirebaseServiceAccount;

  if (typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service account fields");
  }

  return parsed;
}

function getServiceAccountKeyFile() {
  if (serviceAccountKeyFile) return serviceAccountKeyFile;

  const inlineServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineServiceAccount?.trim()) {
    const serviceAccount = parseServiceAccountJson(inlineServiceAccount);
    const directory = mkdtempSync(join(tmpdir(), "hotleno-firebase-"));
    const keyFile = join(directory, "service-account.json");
    writeFileSync(keyFile, JSON.stringify(serviceAccount), { mode: 0o600 });
    serviceAccountKeyFile = keyFile;
    return serviceAccountKeyFile;
  }

  serviceAccountKeyFile = getServiceAccountPath();
  return serviceAccountKeyFile;
}

function getServiceAccountPath() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error(
      "Firebase service account is required. Set FIREBASE_SERVICE_ACCOUNT_JSON on Vercel or GOOGLE_APPLICATION_CREDENTIALS locally.",
    );
  }

  if (existsSync(credentialsPath)) return credentialsPath;

  const fallback = readdirSync(dirname(credentialsPath)).find(
    (fileName) =>
      fileName.includes("firebase-adminsdk") && fileName.endsWith(".json"),
  );

  if (fallback) return join(dirname(credentialsPath), fallback);

  throw new Error("Firebase service account file was not found");
}

function getAuth() {
  return new GoogleAuth({
    keyFile: getServiceAccountKeyFile(),
    scopes: [
      "https://www.googleapis.com/auth/datastore",
      "https://www.googleapis.com/auth/cloud-platform",
    ],
  });
}

async function getAccessToken() {
  const accessToken = await getAuth().getAccessToken();
  if (!accessToken) throw new Error("Unable to get Firebase access token");

  return accessToken;
}

async function getDatabaseInfo(): Promise<FirestoreDatabaseInfo> {
  if (databaseInfo) return databaseInfo;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const databaseId = process.env.FIREBASE_DATABASE_ID || "default";
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required");

  const authClient = await getAuth().getClient();
  const response = await authClient.request<{
    uid?: string;
    locationId?: string;
  }>({
    url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}`,
  });

  if (!response.data.uid || !response.data.locationId) {
    throw new Error("Unable to resolve Firestore MongoDB compatibility endpoint");
  }

  databaseInfo = {
    uid: response.data.uid,
    locationId: response.data.locationId,
    databaseId,
  };
  return databaseInfo;
}

export async function getFirestoreMongoDb() {
  if (db) return db;

  const info = await getDatabaseInfo();
  const uri = `mongodb://${info.uid}.${info.locationId}.firestore.goog:443/${info.databaseId}?loadBalanced=true&authMechanism=MONGODB-OIDC&tls=true&retryWrites=false`;
  client = new MongoClient(uri, {
    authMechanismProperties: {
      ALLOWED_HOSTS: ["*.firestore.goog"],
      OIDC_CALLBACK: async () => ({
        accessToken: await getAccessToken(),
        expiresInSeconds: 300,
      }),
    },
  });

  await client.connect();
  db = client.db(info.databaseId);
  return db;
}
