const fs = require("fs");
const crypto = require("crypto");
const { Pool } = require("pg");

const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const match = env.match(/^DATABASE_URL=(.*)$/m);
const connectionString = process.env.DATABASE_URL || (match && match[1].trim().replace(/^["']|["']$/g, ""));

const [label, months = "12"] = process.argv.slice(2);

if (!connectionString || !label) {
  console.error('Usage: node scripts/create-activation-key.js "Customer name" [months]');
  process.exit(1);
}

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
let raw = "";
for (let i = 0; i < 16; i += 1) raw += alphabet[crypto.randomInt(alphabet.length)];

const display = raw.match(/.{4}/g).join("-");
const hash = crypto.createHash("sha256").update(raw).digest("hex");

const pool = new Pool({ connectionString });

pool
  .query("INSERT INTO activation_keys(key_hash, label, valid_months) VALUES($1,$2,$3)", [
    hash,
    label,
    Number(months),
  ])
  .then(() => {
    console.log(`Activation key for ${label} (${months} months):\n\n  ${display}\n`);
    console.log("Give this to the customer. It works once and is not stored in readable form.");
  })
  .catch((error) => {
    console.error("Could not create the key:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
