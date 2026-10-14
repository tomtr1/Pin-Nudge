import type { UserRepository } from "@/lib/data";
import type { SessionUser } from "@/types/domain";

/**
 * Operations are the shared business actions behind both the website's
 * Server Actions and the mobile JSON API. They receive an authenticated
 * context, validate untrusted input with Zod, and return an ActionResult.
 * Errors thrown by services are mapped by the caller (withUser / apiRoute).
 */
export interface OpCtx {
  user: SessionUser;
  repo: UserRepository;
}
