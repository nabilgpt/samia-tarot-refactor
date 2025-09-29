// Upsert machine translations via PostgREST with Prefer: resolution=merge-duplicates
// Keep code short; secrets via backend/Vault only (not in FE/n8n)
export default async (req: Request): Promise<Response> => {
  // TODO: call Google Translation v3 (server-side), then POST to /rest/v1/content_translations
  // with headers: Authorization: Bearer <SERVICE_ROLE_KEY>, Prefer: resolution=merge-duplicates
  return new Response('not implemented', { status: 501 });
};