// Utility functions
const fmt = (n)=> {
  n = Number(n||0);
  return n.toLocaleString('en-IN', {minimumFractionDigits:2, maximumFractionDigits:2});
};
const parseNum = (v)=> isNaN(parseFloat(v)) ? 0 : parseFloat(v);
function computeEMI(P, annualRatePct, nMonths){
  P = parseNum(P); nMonths = parseInt(nMonths||0,10);
  const r = parseNum(annualRatePct)/12/100;
  if(P<=0 || r<=0 || nMonths<=0) return 0;
  const pow = Math.pow(1+r, nMonths);
  return P * r * pow / (pow - 1);
}
function currentMonthInterest(remainingPrincipal, annualRatePct){
  const r = parseNum(annualRatePct)/12/100;
  return parseNum(remainingPrincipal) * r;
}
function payOneEMI(member){
  const emi = parseNum(member.emi);
  if(emi<=0) return null;
  const interest = currentMonthInterest(member.remaining, member.rate);
  const principalPaid = Math.min(emi - interest, member.remaining);
  const newRemaining = Math.max(0, member.remaining - principalPaid);
  const monthsPaid = Math.min(member.months, member.monthsPaid + 1);
  return {interest, principalPaid, newRemaining, monthsPaid};
}

// State
const STORE_KEY = 'kummari_sangham_members_v1';
let members = [];
function save(){ localStorage.setItem(STORE_KEY, JSON.stringify(members)); }
function load(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw){ members = JSON.parse(raw); }
  }catch(e){ members = []; }
}
load();

// DOM references
const els = {
  body: document.getElementById('body'),
  checkAll: document.getElementById('check-all'),
  addBtn: document.getElementById('add-member'),
  inputs:{
    name: document.getElementById('m-name'),
    share: document.getElementById('m-share'),
    amount: document.getElementById('m-amount'),
    loan: document.getElementById('m-loan'),
    rate: document.getElementById('m-rate'),
    tenor: document.getElementById('m-tenor'),
  },
  sumMembers: document.getElementById('sum-members'),
  sumShare: document.getElementById('sum-share'),
  sumAmount: document.getElementById('sum-amount'),
  sumEmiPaid: document.getElementById('sum-emi-paid'),
  sumTotal: document.getElementById('sum-total'),
  btnDelete: document.getElementById('delete-selected'),
  btnCloseMonth: document.getElementById('close-month'),
  btnWhatsApp: document.getElementById('send-whatsapp'),
  waPhone: document.getElementById('wa-phone'),
  exportBtn: document.getElementById('export-json'),
  importInput: document.getElementById('import-json'),
};

// Rendering
function newRowTemplate(m){
  const id = m.id;
  return `
    <tr data-id="${id}">
      <td><input type="checkbox" class="row-check" /></td>
      <td><input class="cell name" value="${m.name||''}" /></td>
      <td><input type="number" class="cell amount" min="0" step="0.01" value="${m.amount||0}"/></td>
      <td><input type="number" class="cell share" min="0" step="0.01" value="${m.share||0}"/></td>
      <td><input type="number" class="cell loan" min="0" step="0.01" value="${m.loan||0}"/></td>
      <td><input type="number" class="cell rate" min="0" step="0.01" value="${m.rate||0}"/></td>
      <td><input type="number" class="cell months" min="1" step="1" value="${m.months||0}"/></td>
      <td><span class="pill mono monthsPaid">${m.monthsPaid||0}</span></td>
      <td><span class="pill mono emi">${fmt(m.emi||0)}</span></td>
      <td><span class="pill mono interest">${fmt(m.thisMonthInterest||0)}</span></td>
      <td><span class="pill mono remaining">${fmt(m.remaining||0)}</span></td>
      <td>
        <div class="actions">
          <button class="btn secondary pay-emi">Pay EMI</button>
          <button class="btn ghost recalc">Recalculate</button>
          <button class="btn ghost reset-loan">Reset loan</button>
        </div>
      </td>
    </tr>
  `;
}
function render(){
  els.body.innerHTML = members.map(newRowTemplate).join('');
  bindRowEvents();
  updateSummary();
}
function updateSummary(){
  const sumMembers = members.length;
  const sumShare = members.reduce((s,m)=> s + parseNum(m.share||0),0);
  const sumAmount = members.reduce((s,m)=> s + parseNum(m.amount||0),0);
  const sumEmiPaid = members.reduce((s,m)=> s + parseNum(m.emiPaidThisMonth||0),0);
  const sumTotal = sumShare + sumAmount + sumEmiPaid;
  els.sumMembers.textContent = sumMembers;
  els.sumShare.textContent = fmt(sumShare);
  els.sumAmount.textContent = fmt(sumAmount);
  els.sumEmiPaid.textContent = fmt(sumEmiPaid);
  els.sumTotal.textContent = fmt(sumTotal);
}

// Row helpers
function recalcMember(m){
  m.emi = computeEMI(m.loan, m.rate, m.months);
  m.thisMonthInterest = currentMonthInterest(m.remaining, m.rate);
}
function ensureDerived(m){
  if(typeof m.monthsPaid !== 'number') m.monthsPaid = 0;
  if(typeof m.emiPaidThisMonth !== 'number') m.emiPaidThisMonth = 0;
  if(typeof m.remaining !== 'number') m.remaining = parseNum(m.loan);
  m.emi = computeEMI(m.loan, m.rate, m.months);
  m.thisMonthInterest = currentMonthInterest(m.remaining, m.rate);
}
function bindRowEvents(){
  els.body.querySelectorAll('tr').forEach(tr=>{
    const id = tr.dataset.id;
    const m = members.find(x=> x.id === id);
    if(!m) return;
    const q = (sel)=> tr.querySelector(sel);

    q('input.cell.name').addEventListener('input', e=>{ m.name = e.target.value; save(); });
    q('input.cell.amount').addEventListener('input', e=>{ m.amount = parseNum(e.target.value); save(); updateSummary(); });
    q('input.cell.share').addEventListener('input', e=>{ m.share = parseNum(e.target.value); save(); updateSummary(); });
    q('input.cell.loan').addEventListener('input', e=>{
      m.loan = parseNum(e.target.value);
      m.remaining = m.loan; recalcMember(m); refreshRow(tr, m); save();
    });
    q('input.cell.rate').addEventListener('input', e=>{ m.rate = parse
