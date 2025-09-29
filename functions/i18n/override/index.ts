// Admin override: flips is_machine=false and updates value
export default async (req: Request): Promise<Response> => {
  // TODO: validate admin role via JWT, then PATCH content_translations row
  return new Response('not implemented', { status: 501 });
};