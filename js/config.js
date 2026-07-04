(function () {
  const host = window.location.hostname;
  const port = window.location.port;

  function defaultApiBase() {
    if (host === "213.171.9.30" || host === "disserta.ru" || host === "www.disserta.ru") {
      return "http://213.171.9.30:8002/api/v1";
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000/api/v1";
    }
    return `${window.location.protocol}//${host}:8002/api/v1`;
  }

  function defaultProUrl() {
    if (host === "213.171.9.30") return "http://213.171.9.30:3010";
    return "http://localhost:3002";
  }

  // Ignore stale localStorage pointing at localhost when opened on VPS
  const storedApi = localStorage.getItem("path_api_base");
  const apiBase =
    storedApi && !(host === "213.171.9.30" && storedApi.includes("localhost"))
      ? storedApi
      : defaultApiBase();

  window.PathConfig = {
    apiBase,
    proUrl: localStorage.getItem("path_pro_url") || defaultProUrl(),
  };
})();
