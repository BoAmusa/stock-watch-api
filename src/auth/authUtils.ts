import { HttpRequest } from "@azure/functions";

export const verifyUserEmail = (request: HttpRequest): string | null => {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  try {
    // JWT format: header.payload.signature
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf-8")
    );
    const email =
      decoded.preferred_username || decoded.upn || decoded.email || null;
    return email;
  } catch (err) {
    console.error("Failed to decode token:", err);
    return null;
  }
};
