const fs = require("fs");
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");

const env = fs.readFileSync(".env.local", "utf8");

function read(name) {
  const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!match) throw new Error(`${name} is missing from .env.local`);
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const client = new S3Client({
  region: "auto",
  endpoint: `https://${read("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: read("R2_ACCESS_KEY_ID"),
    secretAccessKey: read("R2_SECRET_ACCESS_KEY"),
  },
});

client
  .send(new ListObjectsV2Command({ Bucket: read("R2_BUCKET_NAME"), MaxKeys: 1 }))
  .then(() => console.log("Document storage is reachable."))
  .catch((error) => {
    console.error("Document storage check failed:", error.name || error.message);
    process.exit(1);
  });
