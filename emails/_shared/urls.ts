const rawBaseUrl = process.env.NEXT_PUBLIC_URL || "https://www.bailnotarie.fr";

export const EMAIL_BASE_URL = rawBaseUrl.endsWith("/")
  ? rawBaseUrl.slice(0, -1)
  : rawBaseUrl;

export const EMAIL_LOGO_URL = `${EMAIL_BASE_URL}/logoSans.png`;
