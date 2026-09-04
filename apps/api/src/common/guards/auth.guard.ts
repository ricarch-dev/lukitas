import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AppError } from "../errors.js";
import { verifyAccessToken } from "../crypto.js";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{
        headers: { authorization?: string };
        user?: { sub: string };
      }>();
    const value = request.headers.authorization;
    if (!value?.startsWith("Bearer "))
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    try {
      request.user = await verifyAccessToken(value.slice(7));
      return true;
    } catch {
      throw new AppError("UNAUTHORIZED", "Authentication required", 401);
    }
  }
}
