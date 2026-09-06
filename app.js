const $ = (id) => document.getElementById(id);
const defaults = { principal: 1000000, years: 15, rate: 4, rateType: 'real', inflation: 3, taxRate: 15, fixedWithdrawal: 9900, withdrawalMode: 'real' };
const finance = window.RealFinance;

const fmtBRL = (value, compact = false) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: compact ? 0 : 2,
  notation: compact ? 'compact' : 'standard', compactDisplay: 'short'
}).format(Math.max(0, value));
const fmtPct = (value, digits = 2) => `${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
const fmtMonths = (months) => months ? `${months} meses / ano ${Math.ceil(months / 12)}` : 'não esgota no horizonte';

function readInputs() {
  return {
    principal: Number($('principal').value), years: Number($('years').value),
    rate: Number($('rate').value) / 100, rateType: $('rateType').value,
    inflation: Number($('inflation').value) / 100, taxRate: Number($('taxRate').value) / 100,
    fixedWithdrawal: Number($('fixedWithdrawal').value), withdrawalMode: $('withdrawalMode').value
  };
}

function calculateScenario(input) {
  const errors = finance.validateInputs(input);
  if (errors.length) return { errors };
  const returns = finance.calculateReturns(input);
  const income = finance.calculateIncomeSummary(input.principal, returns);
  const fixedMode = input.withdrawalMode === 'real' ? 'real' : 'nominal';
  const strategies = [
    { key: 'reference', name: 'Retirada de referência (retorno real)', color: '#136f63', withdrawal: income.monthlyRealEquivalent, mode: 'real' },
    { key: 'income', name: 'Viver do rendimento nominal', color: '#d05b2d', withdrawal: input.principal * returns.monthlyNominalNet, mode: 'income' },
    { key: 'fixed', name: input.withdrawalMode === 'real' ? 'Retirada fixa em termos reais' : 'Retirada fixa nominal', color: '#4b5d9a', withdrawal: input.fixedWithdrawal, mode: fixedMode }
  ].map((strategy) => ({ ...strategy, ...finance.simulateStrategy({ principal: input.principal, years: input.years, returns, withdrawal: strategy.withdrawal, mode: strategy.mode }) }));
  return { input, returns, income, strategies };
}

function renderSummary(input, result) {
  const { returns, income, strategies } = result;
  const fixed = strategies[2];
  $('summaryCards').innerHTML = `
    <article class="metric metric-primary"><span class="metric-kicker">Rendimento nominal líquido</span><strong>${fmtBRL(income.netAnnual / 12, true)}<small>/mês</small></strong><span>${fmtPct(returns.nominalNetAnnual * 100)} a.a. após IR estimado</span></article>
    <article class="metric"><span class="metric-kicker">Poder de compra ganho</span><strong>${fmtBRL(income.realGain, true)}<small>/ano</small></strong><span>${fmtPct(returns.realNetAnnual * 100)} a.a. real líquido</span></article>
    <article class="metric metric-accent"><span class="metric-kicker">Retirada informada</span><strong>${fmtBRL(input.fixedWithdrawal, true)}<small>/mês</small></strong><span>${fixed.exhaustedAtMonth ? `Esgota em ${fmtMonths(fixed.exhaustedAtMonth)}` : 'Sobrevive ao horizonte'}</span></article>`;
  $('formulaText').innerHTML = `O cenário parte de <strong>${input.rateType === 'real' ? 'retorno real bruto' : 'taxa nominal'}</strong> de <strong>${fmtPct(input.rate * 100)}</strong>. O modelo calcula o rendimento nominal, aplica IR de <strong>${fmtPct(input.taxRate * 100, 1)}</strong> sobre esse ganho e só então desconta a inflação de <strong>${fmtPct(input.inflation * 100, 1)}</strong>. A retirada de referência é uma premissa de planejamento, não uma garantia de preservação.`;
}

function renderCalculation(input, result) {
  const { returns, income } = result;
  $('calculationDetails').innerHTML = `<div class="calc-grid">
    <span>Taxa nominal bruta anual</span><strong>${fmtPct(returns.nominalGrossAnnual * 100)}</strong>
    <span>Rendimento nominal bruto</span><strong>${fmtBRL(income.grossAnnual)}</strong>
    <span>IR estimado sobre o ganho</span><strong>${fmtBRL(income.taxAnnual)}</strong>
    <span>Rendimento nominal líquido</span><strong>${fmtBRL(income.netAnnual)}</strong>
    <span>Patrimônio nominal após 1 ano</span><strong>${fmtBRL(income.nominalFinal)}</strong>
    <span>Patrimônio em poder de compra inicial</span><strong>${fmtBRL(income.realFinal)}</strong>
    <span>Taxa real líquida anual</span><strong>${fmtPct(income.realNetAnnual * 100)}</strong>
    <span>Retirada real mensal equivalente</span><strong>${fmtBRL(income.monthlyRealEquivalent)}</strong>
  </div><p class="microcopy">Conversões mensais usam equivalência composta: taxa mensal = (1 + taxa anual)^(1/12) - 1. A tributação é uma hipótese simplificada e depende do produto, prazo e legislação.</p>`;
}

function renderTable(result) {
  $('resultsTable').innerHTML = result.strategies.map((strategy) => `<tr>
    <td><strong>${strategy.name}</strong></td><td>${fmtBRL(strategy.withdrawal, true)}/mês</td>
    <td>${fmtBRL(strategy.totalNominalWithdrawn, true)}</td><td>${fmtBRL(strategy.finalNominal, true)}<br><small>${fmtBRL(strategy.finalReal, true)} real</small></td>
    <td>${strategy.exhaustedAtMonth ? `Esgotado: ${fmtMonths(strategy.exhaustedAtMonth)}` : `${strategy.survivedPercent.toFixed(0)}% do horizonte`}</td>
  </tr>`).join('');
}

function renderChart(input, result) {
  const svg = $('chart');
  const width = 1000, height = 420, pad = { left: 72, right: 28, top: 24, bottom: 48 };
  const maxY = Math.max(input.principal * 1.05, ...result.strategies.flatMap((s) => s.data)) || 1;
  const xStep = (width - pad.left - pad.right) / (input.years * 12);
  const yFor = (value) => height - pad.bottom - value / maxY * (height - pad.top - pad.bottom);
  const grid = Array.from({ length: 6 }, (_, index) => {
    const value = maxY * index / 5; const y = yFor(value);
    return `<line class="grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/><text class="axis-text" x="8" y="${y + 5}">${fmtBRL(value, true)}</text>`;
  }).join('');
  const labels = Array.from({ length: Math.min(input.years, 6) + 1 }, (_, index) => {
    const year = Math.round(input.years * index / Math.min(input.years, 6));
    return `<text class="axis-text" x="${pad.left + year * 12 * xStep}" y="${height - 16}" text-anchor="middle">${year === 0 ? 'Hoje' : `Ano ${year}`}</text>`;
  }).join('');
  const lines = result.strategies.map((strategy) => {
    const path = strategy.data.map((value, index) => `${index ? 'L' : 'M'}${(pad.left + index * xStep).toFixed(2)},${yFor(value).toFixed(2)}`).join(' ');
    return `<path class="line" d="${path}" stroke="${strategy.color}"/>`;
  }).join('');
  svg.innerHTML = `${grid}${labels}${lines}`;
}

function render() {
  const input = readInputs();
  updateOutputs();
  const result = calculateScenario(input);
  $('errorBox').hidden = !result.errors;
  if (result.errors) { $('errorBox').textContent = result.errors.join(' '); return; }
  renderSummary(input, result); renderCalculation(input, result); renderTable(result); renderChart(input, result);
}

function updateOutputs() {
  $('yearsOut').textContent = `${$('years').value} anos`;
  $('rateOut').textContent = `${Number($('rate').value).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% a.a.`;
  $('inflationOut').textContent = `${Number($('inflation').value).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}% a.a.`;
  $('taxRateOut').textContent = `${Number($('taxRate').value).toLocaleString('pt-BR', { minimumFractionDigits: 1 })}%`;
}

function applyRateType() {
  const real = $('rateType').value === 'real';
  $('rateLabel').textContent = real ? 'Retorno real bruto esperado' : 'Taxa nominal anual';
  $('rateHelp').textContent = real ? 'Converte para nominal antes do IR' : 'Aplicada diretamente ao rendimento';
}

['principal', 'years', 'rate', 'inflation', 'taxRate', 'fixedWithdrawal', 'withdrawalMode'].forEach((id) => $(id).addEventListener('input', render));
$('rateType').addEventListener('change', () => { applyRateType(); render(); });
$('resetBtn').addEventListener('click', () => { Object.entries(defaults).forEach(([key, value]) => { $(key).value = value; }); applyRateType(); render(); });
applyRateType(); render();
