// Kummari Sangham Community Society - front-end app
// LocalStorage key
const STORE_KEY = "kummari_sangham_members_v2";

let members = [];

// Helpers
const parseNum = v => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
const INR = n => Number(n||0).toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});

function computeEMI(P, annualRatePct, months){
  const r = parseNum(annualRatePct) / 12 / 100;
  P = parseNum(P); months = parseInt(months||0,10);
  if(P<=0 || r<=0 || months<=0) return 0;
  const pow = Math.pow(1+r, months);
  return P * r * pow / (pow - 1);
}

function outstandingAfterMonths(P, annualRatePct, months, monthsPaid){
  const emi = computeEMI(P, annualRatePct, months);
  const r = parseNum(annualRatePct)/12/100;
  let bal = parseNum(P);
  for(let i=0; i<monthsPaid; i++){
    const interest = bal * r;
    const principal = emi - interest;
    bal = Math.max(0, bal - principal);
  }
  return bal;
}

// Storage
function load(){ try{ members = JSON.parse(localStorage.getItem(STORE_KEY)) || []; }catch(e){ members = [] } }
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(members)); }

// DOM
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

// Init
window.addEventListener("load", () => {
  load();
  bindUI();
  render();
  autoMonthlyTasks();
});

function bindUI(){
  $("#btnAdd").addEventListener("click", addMember);
  $("#btnExport").addEventListener("click", exportCSV);
  $("#btnWhatsApp").addEventListener("click", sendToWhatsApp);
  $("#btnClearAll").addEventListener("click", () => {
    if(confirm("This clears all saved data on this device. Continue?")){
      members = [];
      save();
      render();
    }
  });
}

function addMember(){
  const name = $("#memberName").value.trim();
  if(!name){ alert("Please enter member name"); return; }

  const share = parseNum($("#shareAmount").value);
  const addition = parseNum($("#amountAddition").value);
  const loan = parseNum($("#loanAmount").value);
  const rate = parseNum($("#interestRate").value);
  const tenor = parseInt($("#tenor").value||0,10);
  const monthsPaid = parseInt($("#monthsPaid").value||0,10);

  const emi = computeEMI(loan, rate, tenor);
  const outstanding = outstandingAfterMonths(loan, rate, tenor, monthsPaid);

  members.push({ name, share, addition, loan, rate, tenor, monthsPaid, emi, outstanding });
  save();
  render();
  clearForm();
}

function clearForm(){ $$(".form-section input").forEach(i => i.value = ""); }

function render(){
  const tbody = $("#membersTable tbody");
  tbody.innerHTML = "";
  let totalShare = 0, totalAdditions = 0, totalEMI = 0;

  members.forEach((m, idx) => {
    totalShare += parseNum(m.share);
    totalAdditions += parseNum(m.addition);
    totalEMI += parseNum(m.emi);
    const remaining = Math.max(0, parseInt(m.tenor) - parseInt(m.monthsPaid||0));
    const nextEMI = remaining > 0 ? m.emi : 0;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.name}</td>
      <td>₹${INR(m.share)}</td>
      <td>₹${INR(m.addition)}</td>
      <td>₹${INR(m.loan)}</td>
      <td>${INR(m.rate)}</td>
      <td>${m.tenor}</td>
      <td>${m.monthsPaid}</td>
      <td>${remaining}</td>
      <td>₹${INR(m.emi)}</td>
      <td>₹${INR(m.outstanding)}</td>
      <td>₹${INR(nextEMI)}</td>
      <td>
        <button class="btn remove-btn" data-idx="${idx}">Remove</button>
        <button class="btn pay-btn" data-idx="${idx}">Pay EMI</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  $("#totalMembers").textContent = members.length;
  $("#totalShare").textContent = INR(totalShare);
  $("#totalAdditions").textContent = INR(totalAdditions);
  $("#totalEMI").textContent = INR(totalEMI);

  // Bind row actions
  $$("#membersTable .remove-btn").forEach(b => b.addEventListener("click", e => {
    const i = parseInt(e.currentTarget.dataset.idx,10);
    removeMember(i);
  }));
  $$("#membersTable .pay-btn").forEach(b => b.addEventListener("click", e => {
    const i = parseInt(e.currentTarget.dataset.idx,10);
    payEMI(i);
  }));
}

function removeMember(index){
  if(index<0 || index>=members.length) return;
  if(confirm("Remove this member?")){
    members.splice(index,1);
    save();
    render();
  }
}

function payEMI(index){
  const m = members[index];
  if(!m) return;
  if(m.monthsPaid >= m.tenor){
    alert("All EMIs already paid.");
    return;
  }
  m.monthsPaid += 1;
  m.outstanding = outstandingAfterMonths(m.loan, m.rate, m.tenor, m.monthsPaid);
  // EMI remains constant in standard amortization
  m.emi = computeEMI(m.loan, m.rate, m.tenor);
  save();
  render();
}

// CSV Export
function exportCSV(){
  if(members.length===0){ alert("No members to export."); return; }
  let csv = "Member Name,Share,Addition,Loan,Interest %,Tenor,EMIs Paid,EMIs Remaining,EMI,Outstanding,Next EMI Due\n";
  members.forEach(m => {
    const remaining = Math.max(0, parseInt(m.tenor) - parseInt(m.monthsPaid||0));
    const nextEMI = remaining>0 ? m.emi : 0;
    csv += [
      m.name,
      parseNum(m.share),
      parseNum(m.addition),
      parseNum(m.loan),
      parseNum(m.rate),
      parseInt(m.tenor||0,10),
      parseInt(m.monthsPaid||0,10),
      remaining,
      parseNum(m.emi).toFixed(2),
      parseNum(m.outstanding).toFixed(2),
      parseNum(nextEMI).toFixed(2)
    ].join(",") + "\n";
  });
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = `kummari_sangham_report_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// WhatsApp Summary
function sendToWhatsApp(){
  if(members.length===0){ alert("No members to send."); return; }
  const phone = $("#waPhone").value.trim(); // optional
  let message = `📋 Kummari Sangham Summary (${new Date().toLocaleDateString()}):\n\n`;
  members.forEach(m => {
    const remaining = Math.max(0, parseInt(m.tenor) - parseInt(m.monthsPaid||0));
    const nextEMI = remaining>0 ? m.emi.toFixed(2) : "0.00";
    message += `👤 ${m.name}\nShare: ₹${INR(m.share)}\nAddition: ₹${INR(m.addition)}\nLoan: ₹${INR(m.loan)}\nEMIs Paid: ${m.monthsPaid}/${m.tenor}\nOutstanding: ₹${INR(m.outstanding)}\nNext EMI Due: ₹${nextEMI}\n\n`;
  });
  message += `Totals → Members: ${members.length} | Share/month: ₹${$("#totalShare").textContent} | Additions/month: ₹${$("#totalAdditions").textContent} | EMI sum: ₹${$("#totalEMI").textContent}`;

  const base = phone ? `https://wa.me/${encodeURIComponent(phone)}` : `https://wa.me/`;
  const url = `${base}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// Automation: run on 1st of month (once/day)
function autoMonthlyTasks(){
  const now = new Date();
  const day = now.getDate();
  const key = `${now.getFullYear()}-${now.getMonth()+1}-${day}`;
  const last = localStorage.getItem("lastAutoRun");
  if(day === 1 && last !== key){
    exportCSV();
    sendToWhatsApp();
    localStorage.setItem("lastAutoRun", key);
  }
}
