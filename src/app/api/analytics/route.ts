import { analyticsEnabled, analyticsEvents } from "@/lib/analytics";
import { assertSameOrigin } from "@/services/auth/security";
import {
  readRequestText,
  RequestBodyTooLargeError,
} from "@/services/http/request-body";

export async function POST(request: Request) {
  if (!analyticsEnabled) return new Response(null, { status: 404 });

  try {
    assertSameOrigin(request);
  } catch {
    return new Response(null, { status: 403 });
  }

  try {
    const event = await readRequestText(request, 32);
    if (!analyticsEvents.some((allowed) => allowed === event)) {
      return new Response(null, { status: 400 });
    }
    console.info(JSON.stringify({ source: "axyro-workout-analytics", event }));
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response(null, {
      status: error instanceof RequestBodyTooLargeError ? 413 : 400,
    });
  }
}
