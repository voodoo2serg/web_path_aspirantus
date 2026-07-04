const PathApi = {
  token() {
    return localStorage.getItem("path_token");
  },

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.token()) headers.Authorization = `Bearer ${this.token()}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${PathConfig.apiBase}${path}`, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem("path_token");
      location.href = "index.html";
      throw new Error("Сессия истекла");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
  },

  async login(email, password) {
    const data = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("path_token", data.access_token);
    return data;
  },

  journey() { return this.request("/portal/journey"); },
  topic() { return this.request("/portal/topic"); },
  companionFeed() { return this.request("/portal/companion-feed?limit=10"); },
  articleDraft() { return this.request("/portal/drafts/article"); },
  dissertationDraft() { return this.request("/portal/drafts/dissertation"); },
  scienceFoundation() { return this.request("/portal/science-foundation"); },
  contentAssets(type) {
    const q = type ? `?asset_type=${encodeURIComponent(type)}` : "";
    return this.request(`/portal/content-assets${q}`);
  },

  completeTask(taskId) {
    return this.request("/portal/journey/current-step/complete", {
      method: "POST",
      body: JSON.stringify({ task_id: taskId }),
    });
  },

  exportDraft(type) {
    return this.request(`/portal/drafts/${type}/export`, { method: "POST" });
  },

  exportFoundation() {
    return this.request("/portal/science-foundation/export", { method: "POST" });
  },

  markRead(touchId) {
    return this.request(`/portal/companion-feed/${touchId}/read`, { method: "POST" });
  },

  interviewStart(mode = "quick") {
    return this.request("/portal/interview/sessions", {
      method: "POST",
      body: JSON.stringify({ mode, channel: "web" }),
    });
  },

  interviewAnswer(sessionId, answer) {
    const key = `ans-${sessionId}-${Date.now()}`;
    return this.request(`/portal/interview/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify({ answer }),
    });
  },

  interviewFinalize(sessionId) {
    return this.request(`/portal/interview/sessions/${sessionId}/finalize`, { method: "POST" });
  },

  async interviewVoice(sessionId, blob, filename = "voice.webm") {
    const form = new FormData();
    form.append("audio", blob, filename);
    const headers = {};
    if (this.token()) headers.Authorization = `Bearer ${this.token()}`;
    const res = await fetch(`${PathConfig.apiBase}/portal/interview/sessions/${sessionId}/voice`, {
      method: "POST",
      headers,
      body: form,
    });
    if (res.status === 401) {
      localStorage.removeItem("path_token");
      location.href = "index.html";
      throw new Error("Сессия истекла");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
  },

  interviewGet(sessionId) {
    return this.request(`/portal/interview/sessions/${sessionId}`);
  },
};

window.PathApi = PathApi;
