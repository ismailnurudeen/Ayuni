import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, createParamDecorator } from "@nestjs/common";
import { AuthService } from "./auth.service";

/**
 * Guard that validates access tokens and ensures the request is authenticated
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing or invalid authorization header");
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const userId = await this.authService.validateAccessToken(token);

    if (!userId) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    // Attach userId to request for use in controllers
    request.userId = userId;
    return true;
  }
}

/**
 * Decorator to extract the authenticated user ID from the request
 * Usage: @UserId() userId: string
 */
export const UserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.userId;
});
