export class RequestBodyTooLargeError extends Error {
  readonly status = 413;
  constructor() {
    super("Request too large");
  }
}

/** Bound bytes while reading; Content-Length can be absent or dishonest. */
export async function readRequestText(
  request: Request,
  maxBytes: number,
): Promise<string> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new RequestBodyTooLargeError();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return text + decoder.decode();
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
