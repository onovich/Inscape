import {
  resolveEditorBackendDevHostRoute,
} from "./EditorBackendTransport.js";

export class SelfHostedEditorHttpBackendTransport {
  #baseUrl;
  #fetchImpl;

  constructor(options = {}) {
    this.#baseUrl = options.baseUrl || "";
    this.#fetchImpl = options.fetchImpl || globalThis.fetch;
  }

  async invoke(command, payload = {}) {
    return await this.postJson(resolveEditorBackendDevHostRoute(command), payload);
  }

  async postJson(path, payload = {}) {
    if (typeof this.#fetchImpl !== "function") {
      throw new Error("SelfHostedEditor backend transport requires a fetch implementation.");
    }

    const response = await this.#fetchImpl(`${this.#baseUrl}${path}`, {
      body: JSON.stringify(payload || {}),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const errorText = typeof response.text === "function" ? await response.text() : "";
      throw new Error(`SelfHostedEditor backend request failed: ${path} (${response.status}) ${errorText}`.trim());
    }

    if (typeof response.json !== "function") {
      return {};
    }

    return await response.json();
  }
}
