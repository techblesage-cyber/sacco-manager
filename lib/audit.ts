import { query } from "./db";

export async function audit(
  organizationId: string,
  actorId: string | null,
  eventType: string,
  entityType?: string,
  entityId?: string,
  metadata?: unknown
) {
  try {
    await query(
      `INSERT INTO audit_events(organization_id, actor_user_id, event_type, entity_type, entity_id, metadata)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [
        organizationId,
        actorId,
        eventType,
        entityType ?? null,
        entityId ?? null,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (error) {
    console.error("Audit event could not be recorded", error);
  }
}
