const jsonContentType = "application/json; charset=utf-8";

export async function readJsonRequestBody(request) {
  const body = await readRequestBody(request);
  return JSON.parse(String(body || "{}").replace(/^\uFEFF/, ""));
}

export function writeJsonResponse(response, payload) {
  response.writeHead(200, {
    "Content-Type": jsonContentType,
  });
  response.end(JSON.stringify(payload));
}

export function writeJsonErrorResponse(response, error) {
  response.writeHead(500, {
    "Content-Type": jsonContentType,
  });
  response.end(JSON.stringify({
    error: error instanceof Error ? error.message : String(error),
  }));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", reject);
  });
}
