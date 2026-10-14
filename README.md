# SACCO Manager

Member services and financial records for a SACCO: members, savings, shares, loans with repayment schedules, complaints, documents and announcements. Built with Next.js, PostgreSQL (Neon) and Cloudflare R2 for file storage.

## Getting started

1. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`. Add the `R2_*` values if you want document uploads.
2. Create the tables: `set -a; source .env.local; set +a; ./scripts/migrate.sh`. The script is safe to run again.
3. `npm install`, then `npm run dev`.
4. Issue an activation key for a customer: `node scripts/create-activation-key.js "Customer name" 12` (the number is the licence length in months).
5. The customer opens `/register`, enters the key, and creates their SACCO. They receive a SACCO code, which everyone in that SACCO uses to sign in.

Useful commands: `npm run build`, `npm test`, `npm run typecheck`, `node scripts/check-storage.js` (tests the R2 connection), `node scripts/extend-licence.js SACCOCODE 12` (renews a licence).

## Signing in

There is one sign-in page for everyone. Each person enters the SACCO code, their member number (members) or username (staff), and their password or PIN. The sign-in slip printed after registering a member includes the web address and the SACCO code.

## Installing and updating

The app can be installed from the browser on phones and computers (an install button appears, or use Add to Home Screen on iPhone). When a new version has been deployed, signed-in users see a banner on their next visit and update with one tap. Each build gets a new version number automatically.

## Licence

Each SACCO has a licence period set by its activation key and shown under Settings. During the last 30 days staff see a reminder. For 30 days after expiry everything still works. After that, records become read-only: everything can still be viewed and exported, but new entries are blocked until the licence is renewed. SACCOs created before licensing was added have no expiry.

## How it works

**Members.** Registering a member also creates their savings account, share account and a sign-in. The member signs in with their member number and a temporary PIN shown once to staff. They must choose their own PIN at first sign-in. Staff with the right role can reset a PIN or suspend a member from the member's page.

**Savings and shares.** Posted entries are never edited. Mistakes are corrected with a reversal, which is recorded alongside the original and in the audit log.

**Loans.** A loan officer records an application, an approver approves or rejects it, and a treasurer disburses it. Disbursement creates the repayment schedule (flat rate, reducing balance with equal installments, or reducing balance with equal principal). Repayments are applied to the oldest unpaid installment first, interest before principal. Overdue installments show as arrears on the dashboard, the loan list and the member's own screen.

**Roles.**

| Role | Can do |
| --- | --- |
| Teller | Register members, post savings, shares and repayments |
| Loan officer | Record loan applications, post repayments, answer complaints |
| Approver | Approve or reject loans, answer complaints, view reports |
| Treasurer | Disburse loans, post transactions and repayments, reverse entries, view reports |
| Administrator | Everything above except managing staff accounts |
| Super administrator | Everything, including staff accounts |

Permissions live in one place: `lib/permissions.ts`.

**Documents.** Files are stored in R2 and served through a signed-in route, so members only see what has been published. The constitution is written in the built-in editor and shown under Constitution in the member portal.

**Branding.** The name and main colour in Settings apply to every screen after sign-in.

## Before going live

- Use a managed PostgreSQL database with automated backups.
- Serve the app over HTTPS only.
- Have someone independent check the loan figures against your own workbook for a few real loans.
- The sign-in limiter keeps its counters in memory. If you run several server instances, move it to a shared store.
