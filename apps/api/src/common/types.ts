export type AuthenticatedRequest = {
  user: { sub: string };
  headers: Record<string, string | string[] | undefined>;
};
