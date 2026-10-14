const fs = require("fs");
const { Pool } = require("pg");

const env = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const match = env.match(/^DATABASE_URL=(.*)$/m);
const connectionString = process.env.DATABASE_URL || (match && match[1].trim().replace(/^["']|["']$/g, ""));

const [code, months] = process.argv.slice(2);

if (!connectionString || !code || !months) {
  console.error("Usage: node scripts/extend-licence.js SACCOCODE months");
  process.exit(1);
}

const pool = new Pool({ connectionString });

pool
  .query(
    `UPDATE organizations
        SET licence_expires_at = greatest(coalesce(licence_expires_at, now()), now()) + make_interval(months => $2::int)
      WHERE upper(code) = upper($1)
      RETURNING name, licence_expires_at`,
    [code, Number(months)]
  )
  .then((result) => {
    if (!result.rowCount) {
      console.error("No SACCO has that code.");
      process.exitCode = 1;
      return;
    }
    const row = result.rows[0];
    console.log(`${row.name} is licensed until ${new Date(row.licence_expires_at).toDateString()}.`);
  })
  .catch((error) => {
    console.error("Could not extend the licence:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
