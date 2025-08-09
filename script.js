/**
 * SACCO Static Frontend
 * - Configure API_BASE to point at your backend (Laravel).
 * - Backend must expose:
 *    POST /auth/login  -> { user, token }
 *    GET  /savings    -> { balance }
 *    GET  /transactions -> [ { id,type,amount,created_at } ]
 *    POST /deposit -> { success } (optional)
 *    POST /loans/apply -> { loan }
 *    GET  /loans -> [ loans ]
 *    POST /loans/{id}/repay/initiate -> { checkoutRequestID, message } // initiates MPesa STK push
 *    GET  /payments/{checkoutRequestID}/status -> { status } (optional)
 *
 * NOTE: MPesa STK Push must be implemented server-side (Daraja). The frontend only calls /
 * loans/{id}/repay/initiate with phone and amount. Backend should send STK push and return an ID.
 */

const API_BASE = "https://your-backend-api.example.com/api"; // <<--- set your backend URL
const STORAGE_KEY = "sacco_auth_token_v1";

let authToken = localStorage.getItem(STORAGE_KEY) || null;
let currentUser = null;
let selectedLoanForRepay = null;

// ---- Element refs
const el = id => document.getElementById(id);

const showSection = id => {
  document.querySelectorAll("main section, .modal").forEach(s => s.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
};

const toggleNav = loggedIn => {
  el("nav-login").classList.toggle("hidden", loggedIn);
  el("nav-dashboard").classList.toggle("hidden", !loggedIn);
  el("nav-logout").classList.toggle("hidden", !loggedIn);
};

// Persist token
function saveToken(token){
  authToken = token;
  if (token) localStorage.setItem(STORAGE_KEY, token);
  else localStorage.removeItem(STORAGE_KEY);
}

// Basic fetch wrapper with auth
async function apiFetch(path, opts = {}){
  const headers = opts.headers || {};
  headers["Content-Type"] = "application/json";
  if (authToken) headers["Authorization"] = Bearer ${authToken};
  opts.headers = headers;
  const res = await fetch(${API_BASE}${path}, opts);
  // try parse
  let data;
  try { data = await res.json(); } catch(e){ data = null; }
  if (!res.ok) throw { status: res.status, data };
  return data;
}

// ---- Auth
async function login(email, password){
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

async function loadProfileAndDashboard(){
  // try load user if backend returns one on /auth/me or on login response store user
  // For simplicity we'll assume token contains /auth/me functionality or stored user in login response.
  // load savings and transactions, loans
  try {
    const savings = await apiFetch("/savings");
    el("savings-balance").textContent = savings.balance ? KES ${formatNumber(savings.balance)} : "KES 0.00";
  } catch(e) {
    console.warn("Could not load savings", e);
    el("savings-balance").textContent = "KES -";
  }

  try {
    const tx = await apiFetch("/transactions");
    renderTransactions(tx);
  } catch(e){
    console.warn("Transactions error", e);
    el("transactions-list").innerHTML = "<li class='muted'>Unable to load transactions.</li>";
  }

  try {
    const loans = await apiFetch("/loans");
    renderLoans(loans);
  } catch(e){
    console.warn("Loans error", e);
    el("loans-list").innerHTML = "<li class='muted'>Unable to load loans.</li>";
  }
}

// ---- UI Renders
function renderTransactions(tx = []){
  const ul = el("transactions-list");
  ul.innerHTML = "";
  if (!tx.length) return ul.innerHTML = "<li class='muted'>No transactions yet.</li>";
  tx.forEach(t => {
    const li = document.createElement("li");
    li.textContent = ${t.created_at ? prettyDate(t.created_at) + " — " : ""}${t.type.toUpperCase()} • KES ${formatNumber(t.amount)};
    ul.appendChild(li);
  });
}

function renderLoans(loans = []){
  const ul = el("loans-list");
  ul.innerHTML = "";
  if (!loans.length) return ul.innerHTML = "<li class='muted'>No loans found.</li>";
  loans.forEach(l => {
    const li = document.createElement("li");
    const status = l.status ? l.status : "pending";
    li.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div>
          <strong>KES ${formatNumber(l.principal)}</strong> • <small>${l.term_months} mo</small>
          <div class="muted">${status.toUpperCase()} • Applied ${l.created_at? prettyDate(l.created_at):''}</div>
        </div>
        <div style="text-align:right">
          <small class="muted">Outstanding</small>
          <div><strong>KES ${formatNumber(l.outstanding || 0)}</strong></div>
          <div style="margin-top:6px">
            ${status === "approved" ? <button class="btn small" data-loan-id="${l.id}" data-loan-out="${l.outstanding || l.principal}">Repay</button> : ""}
          </div>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  // attach repay click handlers
  ul.querySelectorAll("button[data-loan-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const loanId = btn.dataset.loanId;
      const out = btn.dataset.loanOut;
      openRepayModal(loanId, out);
    });
  });
}

// ---- Actions
async function doLoginHandler(){
  const email = el("login-email").value.trim();
  const password = el("login-password").value.trim();
  el("login-error").textContent = "";
  if (!email || !password) return el("login-error").textContent = "Email and password required.";
  try {
    const data = await login(email, password);
    if (data.token) {
      saveToken(data.token);
      currentUser = data.user || null;
      el("user-name").textContent = (data.user && data.user.name) ? data.user.name : "Member";
      toggleNav(true);
      showSection("dashboard-section");
      await loadProfileAndDashboard();
    } else {
      el("login-error").textContent = data.message || "Login failed";
    }
  } catch(err){
    console.error(err);
    el("login-error").textContent = (err.data && err.data.message) ? err.data.message : "Login failed (network/server).";
  }
}

// Deposit (simulate or call your backend)
async function depositHandler(){
  const amount = Number(el("deposit-amount").value);
  if (!amount || amount <= 0) { alert("Enter deposit amount"); return; }
  try {
    // If you have a backend deposit endpoint, call it. For demo we call /deposit
    await apiFetch("/deposit", { method: "POST", body: JSON.stringify({ amount }) });
    alert("Deposit submitted. Refreshing dashboard.");
    await loadProfileAndDashboard();
  } catch(e){
    console.error(e);
    alert("Deposit failed. Make sure backend supports /deposit or remove deposit action from UI.");
  }
}

// Loan apply
async function applyLoanHandler(){
  const amount = Number(el("loan-amount").value);
  const term = Number(el("loan-term").value);
  const purpose = el("loan-purpose").value.trim();

  if (!amount || amount < 1000) return el("loan-apply-msg").textContent = "Enter a valid amount (min KES 1,000).";
  if (!term || term < 1) return el("loan-apply-msg").textContent = "Enter a valid term.";
  el("loan-apply-msg").textContent = "Applying...";

  try {
    const loan = await apiFetch("/loans/apply", { method: "POST", body: JSON.stringify({ principal: amount, term_months: term, purpose }) });
    el("loan-apply-msg").textContent = "Loan application submitted.";
    // refresh loans
    await loadProfileAndDashboard();
  } catch(e){
    console.error("Loan apply error", e);
    el("loan-apply-msg").textContent = "Loan application failed.";
  }
}

// ---- Repay modal & MPesa flow
function openRepayModal(loanId, outstanding){
  selectedLoanForRepay = loanId;
  el("repay-loan-info").textContent = Loan #${loanId} — Outstanding KES ${formatNumber(outstanding)};
  el("repay-amount").value = outstanding || "";
  el("repay-phone").value = "";
  el("repay-msg").textContent = "";
  el("repay-modal").classList.remove("hidden");
}
el("repay-close").addEventListener("click", ()=> el("repay-modal").classList.add("hidden"));

async function repayHandler(){
  const amount = Number(el("repay-amount").value);
  const phone = el("repay-phone").value.trim();
  if (!selectedLoanForRepay) return alert("Loan not selected.");
  if (!amount || amount <= 0) return el("repay-msg").textContent = "Enter a repayment amount.";
  if (!/^2547\d{8}$/.test(phone)) return el("repay-msg").textContent = "Phone must be in format 2547XXXXXXXX.";

  el("repay-msg").textContent = "Initiating MPesa payment (STK Push)...";

  try {
    // Backend endpoint should implement Daraja STK push and return a checkoutRequestID or similar reference.
    const res = await apiFetch(/loans/${selectedLoanForRepay}/repay/initiate, {
      method: "POST",
      body: JSON.stringify({ amount, phone })
    });

    // Example expected response: { checkoutRequestID: 'ABC123', message: 'STK push sent' }
    if (res.checkoutRequestID) {
      el("repay-msg").textContent = res.message || "STK Push sent. Check your phone to complete payment.";
      // Optionally poll for status or provide UI hook to check payment status.
      pollPaymentStatus(res.checkoutRequestID);
    } else {
      el("repay-msg").textContent = res.message || "Payment initiation response unexpected.";
    }
  } catch(err){
    console.error("repay error", err);
    el("repay-msg").textContent = err.data?.message || "Failed to initiate payment. Check backend logs.";
  }
}

// Poll payment status (optional — backend needs an endpoint to check)
async function pollPaymentStatus(checkoutRequestID){
  el("repay-msg").textContent += " Waiting for confirmation...";
  const start = Date.now();
  const timeout = 60_000; // 60s
  const interval = 3000;
  const check = async () => {
    try {
      const statusRes = await apiFetch(/payments/${checkoutRequestID}/status);
      if (statusRes && statusRes.status === "success") {
        el("repay-msg").textContent = "Payment successful. Updating dashboard...";
        el("repay-modal").classList.add("hidden");
        await loadProfileAndDashboard();
        return;
      } else if (statusRes && statusRes.status === "failed") {
        el("repay-msg").textContent = "Payment failed or cancelled.";
        return;
      }
    } catch(e){
      console.warn("poll error", e);
    }

    if (Date.now() - start < timeout) setTimeout(check, interval);
    else el("repay-msg").textContent = "Payment pending. If your phone completed payment, refresh dashboard later.";
  };
  setTimeout(check, interval);
}

// ---- Utilities
function formatNumber(n){
  if (n === null || n === undefined) return "0.00";
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function prettyDate(iso){
  try { return new Date(iso).toLocaleString(); } catch(e) { return iso; }
}

// ---- Event wiring
(function init(){
  // nav
  el("nav-login").addEventListener("click", () => showSection("login-section"));
  el("nav-dashboard").addEventListener("click", () => showSection("dashboard-section"));
  el("nav-logout").addEventListener("click", () => {
    saveToken(null);
    currentUser = null;
    toggleNav(false);
    showSection("login-section");
  });

  // login flow
  el("login-btn").addEventListener("click", doLoginHandler);

  // deposit
  el("deposit-btn").addEventListener("click", depositHandler);

  // loan apply
  el("loan-apply-btn").addEventListener("click", applyLoanHandler);

  // repay
  el("repay-btn").addEventListener("click", repayHandler);

  // if token present attempt auto-login flow (we'll just show dashboard)
  if (authToken) {
    toggleNav(true);
    showSection("dashboard-section");
    // ideally we call /auth/me to confirm token. If your backend supports /auth/me call it here and set currentUser.
    (async () => {
      try {
        // optional: fetch user info if backend supports
        const me = await apiFetch("/auth/me"); // implement /auth/me on backend
        currentUser = me;
        el("user-name").textContent = me.name || "Member";
      } catch(e) {
        // ignore
      } finally {
        loadProfileAndDashboard();
      }
    })();
  } else {
    toggleNav(false);
    showSection("login-section");
  }
})();
