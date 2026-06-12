const jsonContentType = "application/json; charset=utf-8";
export const defaultJsonRequestBodyByteLimit = 4 * 1024 * 1024;

export class JsonRequestBodyTooLargeError extends Error {
  constructor(byteLimit) {
    super(`JSON request body exceeds ${byteLimit} byte limit.`);
    this.name = "JsonRequestBodyTooLargeError";
    this.statusCode = 413;
  }
}

export async function readJsonRequestBody(request, options = {}) {
  const body = await readRequestBody(request, options);
  return JSON.parse(String(body || "{}").replace(/^\uFEFF/, ""));
}

export function writeJsonResponse(response, payload) {
  response.writeHead(200, {
    "Content-Type": jsonContentType,
  });
  response.end(JSON.stringify(payload));
}

export function writeJsonErrorResponse(response, error) {
  const statusCode = getErrorStatusCode(error);
  response.writeHead(statusCode, {
    "Content-Type": jsonContentType,
  });
  response.end(JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
  }));
}

function readRequestBody(request, options = {}) {
  const byteLimit = normalizeByteLimit(options.maxBytes);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let receivedBytes = 0;
    let settled = false;

    const fail = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    request.on("data", (chunk) => {
      if (settled) {
        return;
      }

      const buffer = Buffer.from(chunk);
      receivedBytes += buffer.length;
      if (receivedBytes > byteLimit) {
        fail(new JsonRequestBodyTooLargeError(byteLimit));
        if (typeof request.destroy === "function") {
          request.destroy();
        }
        return;
      }

      chunks.push(buffer);
    });
    request.on("end", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", fail);
  });
}

function getErrorStatusCode(error) {
  const statusCode = Number(error?.statusCode);
  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
    return statusCode;
  }

  return 500;
}

function normalizeByteLimit(maxBytes) {
  if (maxBytes === undefined || maxBytes === null) {
    return defaultJsonRequestBodyByteLimit;
  }

  const byteLimit = Number(maxBytes);
  if (!Number.isFinite(byteLimit) || byteLimit <= 0) {
    return defaultJsonRequestBodyByteLimit;
  }

  return Math.floor(byteLimit);
}
