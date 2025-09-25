(function(){
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const cfg = window.DBP_CONFIG || {};
  const API = cfg.API_BASE || "";
  const AUTH_KEY = cfg.AUTH_KEY || "";
  const headers = AUTH_KEY ? { "Authorization": "Bearer " + AUTH_KEY } : {};

  function fmt(n){
    if (n === null || n === undefined) return "-";
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n);
    return num.toLocaleString();
  }

  // REST처럼 보이는 경로를 Apps Script의 ?action=… 쿼리로 변환
  function toQuery(path){
    const [p, qs] = path.split("?");
    const params = new URLSearchParams(qs || "");
    let action = "";
    if (p === "/inventory/summary") action = "inventory.summary";
    else if (p === "/activation/summary") action = "activation.summary";
    else if (p === "/activation/recent") action = "activation.recent";
    else if (p === "/tasks/pending") action = "tasks.pending";
    else if (p === "/inventory/intake") action = "inventory.intake";
    else throw new Error("Unknown path: " + p);

    const q = new URLSearchParams();
    q.set("action", action);
    // 기존 쿼리파라미터(예: limit) 그대로 전달
    for (const [k,v] of params.entries()) q.set(k, v);
    return "?" + q.toString();
  }

  async function apiGet(path){
    const url = API + toQuery(path);
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) throw new Error("GET " + path + " → " + res.status);
    return res.json();
  }
  async function apiPost(path, body){
    const url = API + toQuery(path);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body||{})
    });
    if (!res.ok) throw new Error("POST " + path + " → " + res.status);
    return res.json();
  }

  async function loadKPIs(){
    try{
      const inv = await apiGet("/inventory/summary");
      const invData = inv?.data || { total:0, inboundToday:0, outboundToday:0, lowStock:0 };
      $("#kpi-total").textContent = fmt(invData.total);
      $("#kpi-io").textContent = `오늘 입고 ${fmt(invData.inboundToday)} · 출고 ${fmt(invData.outboundToday)}`;
      $("#kpi-low").textContent = fmt(invData.lowStock);
    }catch(e){
      $("#kpi-total").textContent = "-";
      $("#kpi-io").textContent = "불러오기 실패";
      console.error(e);
    }

    try{
      const act = await apiGet("/activation/summary");
      const a = act?.data || { today:0, pending:0, rejected:0, byAgent:[] };
      $("#kpi-activation-today").textContent = fmt(a.today);
      $("#kpi-activation-sub").textContent = `대기 ${fmt(a.pending)} · 반려 ${fmt(a.rejected)}`;
      const top = (a.byAgent && a.byAgent[0]) || null;
      $("#kpi-top-agent").textContent = top ? top.name : "-";
      $("#kpi-top-count").textContent = top ? `${fmt(top.count)}건` : "";
    }catch(e){
      $("#kpi-activation-today").textContent = "-";
      $("#kpi-activation-sub").textContent = "불러오기 실패";
      console.error(e);
    }
  }

  function fillTable(tbody, rows, keys){
    tbody.innerHTML = "";
    if(!rows || !rows.length){
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = keys.length;
      td.textContent = "데이터가 없습니다";
      td.style.color = "#6b7280";
      td.style.padding = "12px";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    rows.forEach(r=>{
      const tr = document.createElement("tr");
      keys.forEach(k=>{
        const td = document.createElement("td");
        td.textContent = r[k] ?? "-";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  async function loadTables(){
    try{
      const recent = await apiGet("/activation/recent?limit=20");
      const rows = Array.isArray(recent?.data) ? recent.data : [];
      fillTable($("#tbl-recent tbody"), rows, ["처리일자","이름","전화","모델명","요금제","처리자","상태"]);
    }catch(e){
      console.error(e);
      fillTable($("#tbl-recent tbody"), [], ["처리일자","이름","전화","모델명","요금제","처리자","상태"]);
    }

    try{
      const pend = await apiGet("/tasks/pending?limit=20");
      const rows = Array.isArray(pend?.data) ? pend.data : [];
      fillTable($("#tbl-pending tbody"), rows, ["createdAt","type","title","assignee","status"]);
    }catch(e){
      console.error(e);
      fillTable($("#tbl-pending tbody"), [], ["createdAt","type","title","assignee","status"]);
    }
  }

  async function handleIntake(){
    const vendor = $("#vendor").value.trim();
    const branch = $("#branch").value.trim();
    const barcode = $("#barcode").value.trim();
    const msg = $("#intake-msg");
    const parsed = $("#intake-parsed");
    msg.textContent = "";
    parsed.textContent = "";
    if(!barcode){ msg.textContent = "바코드를 입력하세요."; msg.style.color = "#b91c1c"; return; }
    try{
      const res = await apiPost("/inventory/intake", { 거래처: vendor, 입고지점: branch, 바코드: barcode });
      if(res?.ok){
        msg.textContent = "입고 완료";
        msg.style.color = "#065f46";
        const p = res.parsed || {};
        parsed.textContent = `모델명: ${p.모델명||"-"} / 색상: ${p.색상||"-"} / 일련번호: ${p.일련번호||"-"}`;
        $("#barcode").value = "";
        // KPI/테이블 갱신
        loadKPIs();
      }else{
        msg.textContent = res?.error || "처리에 실패했습니다.";
        msg.style.color = "#b91c1c";
      }
    }catch(e){
      msg.textContent = e.message;
      msg.style.color = "#b91c1c";
    }
  }

  function bind(){
    $("#year").textContent = new Date().getFullYear();
    $("#btn-refresh").addEventListener("click", ()=>{
      loadKPIs(); loadTables();
    });
    $$(".qa").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const target = btn.getAttribute("data-target");
        if(target){ document.querySelector(target)?.scrollIntoView({behavior:"smooth"}); }
        else { alert(btn.getAttribute("data-note") || "준비중"); }
      });
    });
    $("#btn-intake").addEventListener("click", handleIntake);
    $("#barcode").addEventListener("keydown", (e)=>{
      if(e.key === "Enter"){ handleIntake(); }
    });
  }

  async function init(){
    if(!API){
      alert("config.js에 API_BASE를 설정하세요.");
      return;
    }
    bind();
    await loadKPIs();
    await loadTables();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
