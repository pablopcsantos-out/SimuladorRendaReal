const assert = require('node:assert/strict');
const model = require('./financial-model.js');

const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

const nominal = model.calculateReturns({ rate: 0.14, rateType: 'nominal', inflation: 0.05, taxRate: 0.225 });
const nominalSummary = model.calculateIncomeSummary(1000000, nominal);
close(nominalSummary.grossAnnual, 140000, 1e-6);
close(nominalSummary.taxAnnual, 31500, 1e-6);
close(nominalSummary.netAnnual, 108500, 1e-6);
close(nominalSummary.realFinal, 1055714.285714, 1e-3);
close(nominalSummary.realNetAnnual, 0.055714285714, 1e-9);

const real = model.calculateReturns({ rate: 0.04, rateType: 'real', inflation: 0.03, taxRate: 0.15 });
close(real.nominalGrossAnnual, 0.0712, 1e-12);
close(real.realNetAnnual, 0.029631067961, 1e-9);

const inflationResults = [0.03, 0.045, 0.06].map((inflation) => model.calculateReturns({ rate: 0.04, rateType: 'real', inflation, taxRate: 0.15 }));
assert.ok(inflationResults[0].realNetAnnual > inflationResults[1].realNetAnnual);
assert.ok(inflationResults[1].realNetAnnual > inflationResults[2].realNetAnnual);

const base = { principal: 1000000, years: 15, returns: real };
const exhausted = model.simulateStrategy({ ...base, withdrawal: 100000, mode: 'real' });
assert.ok(exhausted.exhaustedAtMonth > 0);
assert.ok(exhausted.data.every((value) => value >= 0));
const noWithdrawal = model.simulateStrategy({ ...base, withdrawal: 0, mode: 'real' });
assert.ok(noWithdrawal.data.every((value) => value >= 0));
assert.ok(noWithdrawal.finalReal >= base.principal);

const zeroInflation = model.calculateReturns({ rate: 0.04, rateType: 'real', inflation: 0, taxRate: 0 });
close(zeroInflation.realNetAnnual, 0.04, 1e-12);
const zeroTax = model.calculateReturns({ rate: 0.14, rateType: 'nominal', inflation: 0.05, taxRate: 0 });
close(zeroTax.realNetAnnual, (1.14 / 1.05) - 1, 1e-12);
const zeroNominal = model.calculateReturns({ rate: 0, rateType: 'nominal', inflation: 0.05, taxRate: 0 });
close(zeroNominal.realNetAnnual, 1 / 1.05 - 1, 1e-12);

const validationErrors = model.validateInputs({
  principal: 0,
  years: 0,
  rate: 0,
  rateType: 'invalid',
  inflation: -1,
  taxRate: 1.1,
  fixedWithdrawal: -1,
  withdrawalMode: 'invalid'
});
assert.equal(validationErrors.length, 7);
assert.ok(Number.isFinite(real.monthlyRealNet));

// Ao esgotar o patrimônio, a retirada efetivamente realizada não pode
// exceder o saldo disponível naquele mês.
const quickExhaustion = model.simulateStrategy({
  principal: 1000,
  years: 1,
  returns: model.calculateReturns({ rate: 0, rateType: 'nominal', inflation: 0, taxRate: 0 }),
  withdrawal: 5000,
  mode: 'nominal'
});
assert.equal(quickExhaustion.exhaustedAtMonth, 1);
assert.equal(quickExhaustion.totalNominalWithdrawn, 1000);
assert.equal(quickExhaustion.finalReal, 0);

console.log('financial-model: todos os testes passaram');
