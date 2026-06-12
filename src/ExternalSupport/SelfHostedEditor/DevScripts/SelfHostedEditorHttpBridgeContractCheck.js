import { Readable } from "node:stream";
import {
  defaultJsonRequestBodyByteLimit,
  JsonRequestBodyTooLargeError,
  readJsonRequestBody,
  writeJsonErrorResponse,
} from "./SelfHostedEditorHttpBridge.js";

assertEqual(defaultJsonRequestBodyByteLimit, 4 * 1024 * 1024, "default JSON request body byte limit");

const bomPayload = await readJsonRequestBody(createRequest("\uFEFF{\"ok\":true}"));
assertEqual(bomPayload.ok, true, "JSON request body strips UTF-8 BOM before parsing");

let rejectedError = null;
try {
  await readJsonRequestBody(createRequest("{\"text\":\"too large\"}"), {
    maxBytes: 8,
  });
} catch (error) {
  rejectedError = error;
}

assertEqual(rejectedError instanceof JsonRequestBodyTooLargeError, true, "oversized JSON request body rejects with typed error");
assertEqual(rejectedError?.statusCode, 413, "oversized JSON request body maps to 413");

const response = createResponse();
writeJsonErrorResponse(response, rejectedError);
assertEqual(response.statusCode, 413, "oversized JSON error writes 413 response");
assertIncludes(response.body, "byte limit", "oversized JSON error response explains limit");

const detailedResponse = createResponse();
writeJsonErrorResponse(detailedResponse, {
  details: {
    format: "inscape.self-hosted-editor.process-error",
    timedOut: true,
  },
  message: "process failed",
  statusCode: 500,
});
const detailedBody = JSON.parse(detailedResponse.body);
assertEqual(detailedBody.error, "process failed", "detailed JSON error preserves error message");
assertEqual(detailedBody.details.format, "inscape.self-hosted-editor.process-error", "detailed JSON error exposes structured details");
assertEqual(detailedBody.details.timedOut, true, "detailed JSON error exposes timeout state");

console.log("SelfHostedEditor HTTP bridge contract ok");

function createRequest(body) {
  return Readable.from([Buffer.from(body, "utf8")]);
}

function createResponse() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(body) {
      this.body = String(body || "");
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text, expected, label) {
  if (!String(text || "").includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(text)} to include ${JSON.stringify(expected)}`);
  }
}
