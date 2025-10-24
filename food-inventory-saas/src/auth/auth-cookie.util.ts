import type { Response } from "express";

type CookieDurations = {
  accessToken: number;
  refreshToken: number;
};

type TokenPayload = {
  accessToken: string;
  refreshToken?: string;
};

const DEFAULT_ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const DEFAULT_REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export function parseDurationToMs(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const match = value.trim().match(/^(\d+)([smhdw])$/i);
  if (!match) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric * 1000 : fallback;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const unitMultipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };

  return amount * (unitMultipliers[unit] ?? 1000);
}

function resolveCookieDurations(): CookieDurations {
  return {
    accessToken: parseDurationToMs(
      process.env.JWT_EXPIRES_IN,
      DEFAULT_ACCESS_TOKEN_MAX_AGE,
    ),
    refreshToken: parseDurationToMs(
      process.env.JWT_REFRESH_EXPIRES_IN,
      DEFAULT_REFRESH_TOKEN_MAX_AGE,
    ),
  };
}

export function setAuthCookies(res: Response, tokens: TokenPayload) {
  if (!tokens.accessToken) {
    return;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const domain = process.env.AUTH_COOKIE_DOMAIN || undefined;
  const sameSite = (process.env.AUTH_COOKIE_SAMESITE as
    | "lax"
    | "strict"
    | "none")
    ? (process.env.AUTH_COOKIE_SAMESITE as "lax" | "strict" | "none")
    : isProduction
      ? "lax"
      : "lax";
  const durations = resolveCookieDurations();

  res.cookie("sk_access_token", tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    domain,
    maxAge: durations.accessToken,
    path: "/",
  });

  if (tokens.refreshToken) {
    res.cookie("sk_refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite,
      domain,
      maxAge: durations.refreshToken,
      path: "/",
    });
  }
}

export function clearAuthCookies(res: Response) {
  const isProduction = process.env.NODE_ENV === "production";
  const domain = process.env.AUTH_COOKIE_DOMAIN || undefined;
  const sameSite = (process.env.AUTH_COOKIE_SAMESITE as
    | "lax"
    | "strict"
    | "none")
    ? (process.env.AUTH_COOKIE_SAMESITE as "lax" | "strict" | "none")
    : isProduction
      ? "lax"
      : "lax";

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    domain,
    path: "/",
  } as const;

  res.clearCookie("sk_access_token", cookieOptions);
  res.clearCookie("sk_refresh_token", cookieOptions);
}
