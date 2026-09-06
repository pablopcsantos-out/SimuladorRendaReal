const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('./app.js', 'utf8');

const ids = [
  'principal', 'years', 'rate', 'rateType', 'rateLabelText', 'rateHelp',
  'inflation', 'taxRate', 'fixedWithdrawal', 'withdrawalMode', 'resetBtn',
  'yearsOut', 'rateOut', 'inflationOut', 'taxRateOut', 'errorBox',
  'summaryCards', 'formulaText', 'calculationDetails', 'resultsTable', 'chart'
];

function createElement(id) {
  let currentValue = id === 'principal' ? '1000000'
      : id === 'years' ? '15'
      : id === 'rate' ? '4'
      : id === 'rateType' ? 'real'
      : id === 'inflation' ? '3'
      : id === 'taxRate' ? '15'
      : id === 'fixedWithdrawal' ? '9900'
      : id === 'withdrawalMode' ? 'real'
      : '';

  return {
    id,
    get value() { return currentValue; },
    set value(value) { currentValue = String(value); },
    textContent: '',
    innerHTML: '',
    hidden: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
}

const elements = Object.fromEntries(ids.map((id) => [id, createElement(id)]));
const document = {
  getElementById(id) {
    return elements[id] || null;
  }
};

const window = {
  RealFinance: require('./financial-model.js')
};

vm.runInNewContext(source, { document, window, Intl, Math, Number });

// A render inicial deve ter produzido as linhas do SVG.
assert.match(elements.chart.innerHTML, /<path class="line"/);
assert.equal((elements.chart.innerHTML.match(/class="grid-line/g) || []).length, 21);
const axisLabels = [...elements.chart.innerHTML.matchAll(/<text class="axis-text"[^>]*>(.*?)<\/text>/g)].map((match) => match[1]);
assert.equal(new Set(axisLabels).size, axisLabels.length);
assert.equal(elements.errorBox.hidden, true);

// Trocar o tipo da taxa não pode destruir os controles dentro do label.
assert.ok(elements.rateType);
assert.ok(elements.rate);
assert.ok(elements.rateHelp);
assert.equal(elements.rateLabelText.textContent, 'Retorno real bruto esperado');

elements.rateType.value = 'nominal';
elements.rateType.listeners.change();
assert.equal(elements.rateLabelText.textContent, 'Taxa nominal anual');
assert.ok(elements.rate);
assert.ok(elements.rateType);

// O reset deve restaurar todos os campos sem destruir os controles.
elements.principal.value = '250000';
elements.years.value = '30';
elements.rate.value = '10';
elements.rateType.value = 'nominal';
elements.inflation.value = '8';
elements.taxRate.value = '25';
elements.fixedWithdrawal.value = '12000';
elements.withdrawalMode.value = 'nominal';
elements.resetBtn.listeners.click();

assert.equal(elements.principal.value, '1000000');
assert.equal(elements.years.value, '15');
assert.equal(elements.rate.value, '4');
assert.equal(elements.rateType.value, 'real');
assert.equal(elements.inflation.value, '3');
assert.equal(elements.taxRate.value, '15');
assert.equal(elements.fixedWithdrawal.value, '9900');
assert.equal(elements.withdrawalMode.value, 'real');
assert.equal(elements.rateLabelText.textContent, 'Retorno real bruto esperado');
assert.match(elements.chart.innerHTML, /<path class="line"/);
assert.equal((elements.chart.innerHTML.match(/class="grid-line/g) || []).length, 21);

console.log('app-smoke: gráfico e restauração do cenário passaram');
