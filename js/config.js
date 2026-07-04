(function () {
  const host = window.location.hostname;
  const proto = window.location.protocol;

  function defaultApiBase() {
    if (host === "path.disserta.ru" || host.endsWith(".disserta.ru")) {
      return `${proto}//api.disserta.ru/api/v1`;
    }
    if (host === "213.171.9.30" || host === "disserta.ru" || host === "www.disserta.ru") {
      return `${proto}//api.disserta.ru/api/v1`;
    }
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8000/api/v1";
    }
    return `${proto}//${host}:8002/api/v1`;
  }

  function defaultProUrl() {
    if (host.endsWith("disserta.ru")) return `${proto}//app.disserta.ru/login`;
    if (host === "213.171.9.30") return "http://213.171.9.30:3010/login";
    return "http://localhost:3002/login";
  }

  const storedApi = localStorage.getItem("path_api_base");
  const apiBase =
    storedApi && !(host.includes("disserta.ru") && storedApi.includes("213.171.9.30:8002"))
      ? storedApi
      : defaultApiBase();

  window.PathConfig = {
    apiBase,
    proUrl: localStorage.getItem("path_pro_url") || defaultProUrl(),
  };
})();
