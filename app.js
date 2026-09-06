const $ = (id) => document.getElementById(id);
const defaults = { principal: 1000000, years: 15, realRate: 4, inflation: 3, taxRate: 15, fixedWithdrawal: 9900 };
const fields = Object.keys(defaults);

const fmtBRL = (n, compact = false) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: compact ? 0 : 2,
  notation: compact ? 'compact' : 'standard', compactDisplay: 'short'
}).format(Math.max(0, n));
const fmtPct = (n) => `${n.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 2})}%`;

function values() {
  return Object.fromEntries(fields.map(k => [k, Number($(k).value)]));
}

function financialModel(v) {
  const realAnnual = v.realRate / 100;
  const inflationAnnual = v.inflation / 100;
  const tax = v.taxRate / 100;
  const nominalAnnual = (1 + realAnnual) * (1 + inflationAnnual) - 1;
  const monthlyInflation = Math.pow(1 + inflationAnnual, 1 / 12) - 1;
  const monthlyNominalGross = Math.pow(1 + nominalAnnual, 1 / 12) - 1;
  const monthlyNominalNet = monthlyNominalGross * (1 - tax);
  const monthlyRealNet = (1 + monthlyNominalNet) / (1 + monthlyInflation) - 1;
  const annualRealNet = Math.pow(1 + monthlyRealNet, 12) - 1;
  return { realAnnual, inflationAnnual, tax, nominalAnnual, monthlyInflation, monthlyNominalGross, monthlyNominalNet, monthlyRealNet, annualRealNet };
}

function simulate(v) {
  const m = financialModel(v);
  const months = v.years * 12;
  const sustainableWithdrawal = v.principal * m.monthlyRealNet;
  const incomeWithdrawal = v.principal * m.monthlyNominalNet / (1 + m.monthlyInflation);
  const fixedWithdrawal = v.fixedWithdrawal;
  const strategies = [
    { key: 'sustainable', name: 'Regra real', color: '#207c8d', withdrawal: sustainableWithdrawal, mode: 'constant', data: [v.principal] },
    { key: 'income', name: 'Vive do rendimento', color: '#b95a00', withdrawal: incomeWithdrawal, mode: 'income', data: [v.principal] },
    { key: 'fixed', name: 'Retirada fixa', color: '#ec6b61', withdrawal: fixedWithdrawal, mode: 'constant', data: [v.principal] }
  ];

  for (let month = 1; month <= months; month++) {
    for (const s of strategies) {
      const previous = s.data[s.data.length - 1];
      let next;
      if (previous <= 0) next = 0;
      else if (s.mode === 'income') next = previous / (1 + m.monthlyInflation);
      else next = Math.max(0, previous * (1 + m.monthlyRealNet) - s.withdrawal);
      s.data.push(next);
    }
  }
  return { m, strategies };
}

function durationYears(data) {
  const zero = data.findIndex((x, i) => i > 0 && x <= 0.01);
  return zero === -1 ? null : zero / 12;
}

function renderCards(v, result) {
  const { m, strategies } = result;
  const sustainable = strategies[0];
  const income = strategies[1];
  const fixed = strategies[2];
  const fixedDuration = durationYears(fixed.data);
  $('summaryCards').innerHTML = `
    <article class="card teal"><span class="label">Renda real sustentável estimada</span><strong class="value">${fmtBRL(sustainable.withdrawal, true)}/mês</strong><span class="detail">${fmtPct(m.annualRealNet * 100)} a.a. líquido em termos reais no modelo</span></article>
    <article class="card orange"><span class="label">"Viver do rendimento" no início</span><strong class="value">${fmtBRL(income.withdrawal, true)}/mês</strong><span class="detail">Retira o ganho líquido estimado, mas não preserva automaticamente o poder de compra</span></article>
    <article class="card coral"><span class="label">Retirada fixa informada</span><strong class="value">${fmtBRL(fixed.withdrawal, true)}/mês</strong><span class="detail">${fixedDuration ? `Patrimônio zera em cerca de ${fixedDuration.toLocaleString('pt-BR',{maximumFractionDigits:1})} anos` : 'Patrimônio não zera dentro do horizonte'}</span></article>`;
  $('formulaText').innerHTML = `Com juro real bruto de <strong>${fmtPct(v.realRate)}</strong>, inflação de <strong>${fmtPct(v.inflation)}</strong> e IR de <strong>${fmtPct(v.taxRate)}</strong> sobre o ganho nominal, o modelo estima um retorno líquido de <strong>${fmtPct(m.annualRealNet * 100)} ao ano em poder de compra</strong>. Para ${fmtBRL(v.principal, true)}, isso corresponde a aproximadamente <strong>${fmtBRL(sustainable.withdrawal, true)} por mês</strong> como retirada real de referência.`;
}

function renderTable(v, result) {
  const { strategies } = result;
  $('resultsTable').innerHTML = strategies.map((s) => {
    const finalValue = s.data[s.data.length - 1];
    const duration = durationYears(s.data);
    let diagnosis;
    if (s.key === 'sustainable') diagnosis = 'Retirada alinhada ao retorno real líquido do modelo';
    if (s.key === 'income') diagnosis = 'O principal nominal pode ficar, mas o poder de compra diminui';
    if (s.key === 'fixed') diagnosis = duration ? 'A retirada consome o principal no cenário' : 'Ainda não zera no horizonte escolhido';
    return `<tr><td><strong>${s.name}</strong></td><td>${fmtBRL(s.withdrawal, true)}/mês</td><td>${fmtBRL(finalValue, true)}</td><td>${duration ? `${duration.toLocaleString('pt-BR',{maximumFractionDigits:1})} anos` : `${v.years} anos+`}</td><td class="status">${diagnosis}</td></tr>`;
  }).join('');
}

function pathFor(data, width, height, pad, maxY, xStep) {
  return data.map((value, i) => {
    const x = pad.left + i * xStep;
    const y = height - pad.bottom - (value / maxY) * (height - pad.top - pad.bottom);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}

function renderChart(v, result) {
  const svg = $('chart');
  const width = 1000, height = 430, pad = { left: 68, right: 118, top: 24, bottom: 48 };
  const maxY = Math.max(v.principal * 1.05, ...result.strategies.flatMap(s => s.data)) || 1;
  const xStep = (width - pad.left - pad.right) / (v.years * 12);
  const grid = [];
  for (let i = 0; i <= 5; i++) {
    const value = maxY * i / 5;
    const y = height - pad.bottom - (value / maxY) * (height - pad.top - pad.bottom);
    grid.push(`<line class="grid-line" x1="${pad.left}" y1="${y}" x2="${width-pad.right}" y2="${y}"/><text class="axis-text" x="8" y="${y+5}">${fmtBRL(value,true)}</text>`);
  }
  for (let year = 0; year <= v.years; year += Math.max(1, Math.ceil(v.years / 6))) {
    const x = pad.left + year * 12 * xStep;
    grid.push(`<text class="axis-text" x="${x}" y="${height-16}" text-anchor="middle">${year === 0 ? 'Hoje' : `Ano ${year}`}</text>`);
  }
  const lines = result.strategies.map(s => `<path class="line" d="${pathFor(s.data,width,height,pad,maxY,xStep)}" stroke="${s.color}"/>`).join('');
  const labels = result.strategies.map((s, idx) => {
    const final = s.data[s.data.length - 1];
    const x = width - pad.right + 12;
    const baseY = height - pad.bottom - (final / maxY) * (height - pad.top - pad.bottom);
    const y = Math.max(pad.top + 18, Math.min(height - pad.bottom - 5, baseY + (idx === 0 ? -12 : idx === 1 ? 0 : 16)));
    return `<text class="end-label" x="${x}" y="${y}" fill="${s.color}">${fmtBRL(final,true)}</text>`;
  }).join('');
  svg.innerHTML = `${grid.join('')}${lines}${labels}`;
}

function render() {
  const v = values();
  const result = simulate(v);
  renderCards(v, result);
  renderTable(v, result);
  renderChart(v, result);
}

function updateOutputs() {
  $('yearsOut').textContent = `${$('years').value} anos`;
  $('realRateOut').textContent = `${Number($('realRate').value).toLocaleString('pt-BR',{minimumFractionDigits:1})}% a.a.`;
  $('inflationOut').textContent = `${Number($('inflation').value).toLocaleString('pt-BR',{minimumFractionDigits:1})}% a.a.`;
  $('taxRateOut').textContent = `${Number($('taxRate').value).toLocaleString('pt-BR',{minimumFractionDigits:1})}%`;
}

fields.forEach(id => $(id).addEventListener('input', () => { updateOutputs(); render(); }));
$('resetBtn').addEventListener('click', () => { Object.entries(defaults).forEach(([k,v]) => $(k).value = v); updateOutputs(); render(); });
updateOutputs(); render();
