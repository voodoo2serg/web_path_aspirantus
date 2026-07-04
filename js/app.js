const SCREENS = [
  { id: "journey", label: "Мой путь" },
  { id: "interview", label: "Интервью" },
  { id: "topic", label: "Тема" },
  { id: "articles", label: "Статьи" },
  { id: "dissertation", label: "Диссертация" },
  { id: "companion", label: "Сопровождение" },
  { id: "docs", label: "Документы" },
];

let currentScreen = "journey";
let journeyCache = null;
let interviewSession = null;
let interviewRecorder = null;
let interviewRecordChunks = [];

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function statusPill(status) {
  if (status === "done") return '<span class="pill success">done</span>';
  if (status === "in_progress") return '<span class="pill accent">в работе</span>';
  return '<span class="pill">todo</span>';
}

async function pollInterviewSession(sessionId, prevQuestion, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const data = await PathApi.interviewGet(sessionId);
    if (data.completed || data.current_question !== prevQuestion) {
      return data;
    }
  }
  return PathApi.interviewGet(sessionId);
}

async function startInterviewRecording(sessionId, btn) {
  if (interviewRecorder?.state === "recording") {
    interviewRecorder.stop();
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  interviewRecordChunks = [];
  interviewRecorder = new MediaRecorder(stream);
  interviewRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) interviewRecordChunks.push(e.data);
  };
  interviewRecorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    btn.textContent = "Расшифровка…";
    btn.disabled = true;
    const blob = new Blob(interviewRecordChunks, { type: interviewRecorder.mimeType || "audio/webm" });
    const prevQ = interviewSession?.current_question;
    await PathApi.interviewVoice(sessionId, blob);
    interviewSession = await pollInterviewSession(sessionId, prevQ);
    renderInterview(document.getElementById("screen-root"));
  };
  interviewRecorder.start();
  btn.textContent = "Стоп";
}

async function renderInterview(root) {
  if (!interviewSession) {
    root.innerHTML = `
      <div class="card">
        <h2>Interview OS</h2>
        <p class="muted">Короткое интервью поможет зафиксировать тему, гипотезу и структуру статьи.</p>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px">
          <button class="btn primary" data-mode="quick">Quick · 3 мин</button>
          <button class="btn" data-mode="standard">Standard · 10–15 мин</button>
          <button class="btn" data-mode="deep">Deep · 60 мин</button>
        </div>
      </div>`;
    root.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        root.innerHTML = "<p class='muted'>Запуск интервью…</p>";
        interviewSession = await PathApi.interviewStart(btn.dataset.mode);
        renderInterview(root);
      });
    });
    return;
  }

  const s = interviewSession;
  const done = s.completed || ["COMPLETED", "STORAGE"].includes(s.state);
  const progress = s.max_questions
    ? Math.min(100, Math.round((s.question_index / s.max_questions) * 100))
    : 0;

  root.innerHTML = `
    <div class="card">
      <div class="row">
        <span class="pill accent">${esc(s.mode)}</span>
        <span class="muted">${esc(s.state)} · ${s.question_index}/${s.max_questions}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      ${s.current_question ? `<p class="interview-question">${esc(s.current_question)}</p>` : ""}
      ${done ? `
        <h3>Извлечено</h3>
        <p><strong>Тема:</strong> ${esc(s.extracted?.topic || "—")}</p>
        <p><strong>Гипотеза:</strong> ${esc(s.extracted?.hypothesis || "—")}</p>
        <button class="btn" id="interview-restart">Новое интервью</button>
      ` : `
        <textarea id="interview-answer" rows="4" placeholder="Ваш ответ…"></textarea>
        <div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
          <button class="btn primary" id="interview-send">Ответить</button>
          <button class="btn" id="interview-voice" title="Запись с микрофона">🎙 Запись</button>
          <button class="btn" id="interview-save">Сохранить сессию</button>
        </div>
        <p class="muted" style="margin-top:8px;font-size:0.8rem">Микрофон телефона или ноутбука — без привязки к конкретному диктофону.</p>
      `}
    </div>`;

  document.getElementById("interview-restart")?.addEventListener("click", () => {
    interviewSession = null;
    renderInterview(root);
  });

  document.getElementById("interview-save")?.addEventListener("click", async () => {
    interviewSession = await PathApi.interviewFinalize(s.session_id);
    renderInterview(root);
  });

  document.getElementById("interview-send")?.addEventListener("click", async () => {
    const ta = document.getElementById("interview-answer");
    const answer = ta?.value?.trim();
    if (!answer) return;
    root.querySelector(".card").innerHTML = "<p class='muted'>Обработка…</p>";
    interviewSession = await PathApi.interviewAnswer(s.session_id, answer);
    renderInterview(root);
  });

  document.getElementById("interview-voice")?.addEventListener("click", async (e) => {
    try {
      await startInterviewRecording(s.session_id, e.target);
    } catch (err) {
      alert(err.message || "Не удалось получить доступ к микрофону");
    }
  });
}

async function renderJourney(root) {
  const j = journeyCache || await PathApi.journey();
  journeyCache = j;
  const step = j.current_step || {};
  root.innerHTML = `
    <div class="card">
      <p class="muted">${esc(j.degree_intent)} · ${esc(j.current_stage.hint)}</p>
      <h2>${esc(j.current_stage.title)}</h2>
      <div class="progress-bar"><div class="progress-fill" style="width:${j.progress_percent}%"></div></div>
      <p class="muted">${j.progress_percent}% · непрочитанных: ${j.companion_unread_count}</p>
    </div>
    <div class="card">
      <div class="row"><h2 style="margin:0">Сейчас</h2>${step.due_date ? `<span class="pill warning">${esc(step.due_date)}</span>` : ""}</div>
      <p><strong>${esc(step.title)}</strong></p>
      <p class="muted">${esc(step.why)}</p>
      ${step.completable && step.task_id ? `<button class="btn primary" data-complete="${step.task_id}">Отметить выполненным</button>` : ""}
    </div>
    <div class="card">
      <h3>Ближайший месяц</h3>
      ${(j.horizon_30d || []).map((i) => `
        <div class="list-item row">
          ${statusPill(i.status)}
          <span>${esc(i.title)}</span>
          <span class="pill">${esc(i.tag)}</span>
        </div>`).join("")}
      <h3>3 месяца</h3>
      ${(j.horizon_90d || []).map((i) => `
        <div class="list-item row">
          <span>${esc(i.title)}</span>
          <span class="pill ${i.pro_feature ? "" : "accent"}">${i.pro_feature ? "Pro" : esc(i.tag)}</span>
        </div>`).join("")}
    </div>`;

  root.querySelector("[data-complete]")?.addEventListener("click", async (e) => {
    const id = Number(e.target.dataset.complete);
    await PathApi.completeTask(id);
    journeyCache = null;
    renderCurrent();
  });
}

async function renderTopic(root) {
  const t = await PathApi.topic();
  root.innerHTML = `
    <div class="card">
      <h2>${esc(t.topic_title)}</h2>
      <p class="muted">ВАК ${esc(t.vak_code)} · только просмотр</p>
      ${(t.terms || []).map((term) => `
        <div class="list-item">
          <strong>${esc(term.term)}</strong>
          <p class="muted">${esc(term.definition)}</p>
        </div>`).join("")}
    </div>`;
}

async function renderArticles(root) {
  const j = journeyCache || await PathApi.journey();
  journeyCache = j;
  const d = await PathApi.articleDraft();
  const recs = d.recommendations || [];
  const quotaNote = j.articles_design_quota_fulfilled
    ? `<p class="pill accent">Квота Path выполнена (${j.articles_tracked}/${j.articles_required} спроектировано). Новые черновики не генерируем — только мотивация и напоминания.</p>`
    : `<p class="muted">Статей в работе: ${j.articles_tracked}/${j.articles_required}</p>`;
  root.innerHTML = `
    <div class="card">
      ${quotaNote}
      <p class="pill accent">${esc(d.label)}</p>
      <h2>${esc(d.sections?.title)}</h2>
      <h3>Рекомендованные журналы</h3>
      ${recs.map((r) => `<div class="list-item"><strong>${r.rank}. ${esc(r.journal_name)}</strong><p class="muted">${esc(r.rationale)}</p></div>`).join("") || "<p class='muted'>Рекомендации появятся после анкеты</p>"}
      <h3>Разделы черновика</h3>
      ${Object.entries(d.sections || {}).filter(([k]) => k !== "title").map(([k, v]) => `<div class="list-item"><strong>${esc(k)}</strong><p class="muted">${esc(v)}</p></div>`).join("")}
      <button class="btn primary" id="export-article">Скачать черновик</button>
    </div>`;
  document.getElementById("export-article").onclick = async () => {
    const ex = await PathApi.exportDraft("article");
    window.open(ex.download_url, "_blank");
  };
}

async function renderDissertation(root) {
  const d = await PathApi.dissertationDraft();
  const s = d.sections || {};
  root.innerHTML = `
    <div class="card">
      <p class="pill accent">${esc(d.label)}</p>
      <h2>${esc(s.title)}</h2>
      <p class="muted">Статей требуется: ${s.articles_required}</p>
      <h3>Оглавление</h3>
      ${(s.toc || []).map((ch) => `<div class="list-item">${esc(ch)}</div>`).join("")}
      <h3>Введение</h3>
      <p class="muted">${esc(s.introduction)}</p>
      <button class="btn primary" id="export-diss">Скачать scaffold</button>
    </div>`;
  document.getElementById("export-diss").onclick = async () => {
    const ex = await PathApi.exportDraft("dissertation");
    window.open(ex.download_url, "_blank");
  };
}

async function renderCompanion(root) {
  const feed = await PathApi.companionFeed();
  root.innerHTML = `
    <div class="card">
      <h2>Лента сопровождения</h2>
      <p class="muted">5–6 касаний/мес + эссе · непрочитанных: ${feed.unread_count}</p>
      ${(feed.items || []).map((item) => `
        <div class="list-item" data-touch="${item.id}">
          <div class="row">
            <span class="pill accent">${esc(item.type_label)}</span>
            <span class="muted">${esc(item.created_at?.slice(0, 10))}</span>
            ${item.read ? "" : '<span class="pill warning">новое</span>'}
          </div>
          <strong>${esc(item.title)}</strong>
          <p class="muted">${esc(item.body)}</p>
        </div>`).join("") || "<p class='muted'>Пока нет касаний</p>"}
    </div>`;
  root.querySelectorAll("[data-touch]").forEach((el) => {
    el.addEventListener("click", async () => {
      await PathApi.markRead(Number(el.dataset.touch));
      renderCurrent();
    });
  });
}

async function renderDocs(root) {
  const [foundation, methodology] = await Promise.all([
    PathApi.scienceFoundation(),
    PathApi.contentAssets("methodology"),
  ]);
  root.innerHTML = `
    <div class="card">
      <h2>Научная основа</h2>
      <p>${esc(foundation.title)}</p>
      <pre style="white-space:pre-wrap;font-size:0.85rem;color:var(--muted)">${esc(foundation.body_md?.slice(0, 800))}</pre>
      <button class="btn primary" id="export-foundation">Скачать отчёт</button>
    </div>
    <div class="card">
      <h2>Методички</h2>
      ${(methodology || []).map((m) => `<div class="list-item"><strong>${esc(m.title)}</strong></div>`).join("") || "<p class='muted'>Нет методичек</p>"}
    </div>`;
  document.getElementById("export-foundation").onclick = async () => {
    const ex = await PathApi.exportFoundation();
    window.open(ex.download_url, "_blank");
  };
}

async function renderCurrent() {
  const root = document.getElementById("screen-root");
  root.innerHTML = "<p class='muted'>Загрузка…</p>";
  try {
    if (currentScreen === "journey") await renderJourney(root);
    else if (currentScreen === "interview") await renderInterview(root);
    else if (currentScreen === "topic") await renderTopic(root);
    else if (currentScreen === "articles") await renderArticles(root);
    else if (currentScreen === "dissertation") await renderDissertation(root);
    else if (currentScreen === "companion") await renderCompanion(root);
    else if (currentScreen === "docs") await renderDocs(root);
  } catch (err) {
    root.innerHTML = `<div class="card"><p class="error">${esc(err.message)}</p></div>`;
  }
}

function initTabs() {
  const tabs = document.getElementById("tabs");
  tabs.innerHTML = SCREENS.map((s) =>
    `<button type="button" class="tab ${s.id === currentScreen ? "active" : ""}" data-screen="${s.id}">${s.label}</button>`
  ).join("");
  tabs.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentScreen = btn.dataset.screen;
      initTabs();
      renderCurrent();
    });
  });
}

if (!PathApi.token()) location.href = "index.html";

document.getElementById("logout-btn").onclick = () => {
  localStorage.removeItem("path_token");
  location.href = "index.html";
};

document.getElementById("pro-link").href = PathConfig.proUrl;

initTabs();
renderCurrent();
