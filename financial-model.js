(() => {
const MONTHS_PER_YEAR = 12;

function annualToMonthly(rate) {
  if (rate <= -1) throw new RangeError('A taxa anual deve ser maior que -100%.');
  return Math.pow(1 + rate, 1 / MONTHS_PER_YEAR) - 1;
}

function monthlyToAnnual(rate) {
  if (rate <= -1) throw new RangeError('A taxa mensal deve ser maior que -100%.');
  return Math.pow(1 + rate, MONTHS_PER_YEAR) - 1;
}

function nominalFromReal(realRate, inflation) {
  return (1 + realRate) * (1 + inflation) - 1;
}

function applyTaxToNominal(nominalRate, taxRate) {
  return nominalRate * (1 - taxRate);
}

function realFromNominal(nominalRate, inflation) {
  return (1 + nominalRate) / (1 + inflation) - 1;
}

function calculateReturns({ rate, rateType, inflation, taxRate }) {
  const nominalGrossAnnual = rateType === 'real'
    ? nominalFromReal(rate, inflation)
    : rate;
  const nominalNetAnnual = applyTaxToNominal(nominalGrossAnnual, taxRate);
  const realNetAnnual = realFromNominal(nominalNetAnnual, inflation);
  const monthlyInflation = annualToMonthly(inflation);
  const monthlyNominalGross = annualToMonthly(nominalGrossAnnual);
  const monthlyNominalNet = annualToMonthly(nominalNetAnnual);
  const monthlyRealNet = realFromNominal(monthlyNominalNet, monthlyInflation);

  return {
    nominalGrossAnnual,
    nominalNetAnnual,
    realNetAnnual,
    taxRate,
    monthlyInflation,
    monthlyNominalGross,
    monthlyNominalNet,
    monthlyRealNet,
    monthlyRealWithdrawalRate: monthlyRealNet
  };
}

function calculateIncomeSummary(principal, returns) {
  const grossAnnual = principal * returns.nominalGrossAnnual;
  const taxAnnual = grossAnnual * returns.taxRate;
  const netAnnual = grossAnnual - taxAnnual;
  const nominalFinal = principal + netAnnual;
  const realFinal = nominalFinal / Math.pow(1 + returns.monthlyInflation, MONTHS_PER_YEAR);
  return {
    grossAnnual, taxAnnual,
    netAnnual,
    nominalFinal,
    realFinal,
    realGain: realFinal - principal,
    realNetAnnual: realFinal / principal - 1,
    monthlyRealEquivalent: principal * returns.monthlyRealNet
  };
}

function simulateStrategy({ principal, years, returns, withdrawal, mode }) {
  const months = years * MONTHS_PER_YEAR;
  const data = [principal];
  let totalNominalWithdrawn = 0;
  let totalRealWithdrawn = 0;
  let exhaustedAtMonth = null;

  for (let month = 1; month <= months; month += 1) {
    const previous = data[data.length - 1];
    if (previous <= 0) {
      data.push(0);
      continue;
    }

    const realWithdrawal = mode === 'real'
      ? withdrawal
      : mode === 'nominal'
        ? withdrawal / Math.pow(1 + returns.monthlyInflation, month - 1)
        : previous * (1 + returns.monthlyRealNet) - previous / (1 + returns.monthlyInflation);
    const nominalWithdrawal = mode === 'real'
      ? withdrawal * Math.pow(1 + returns.monthlyInflation, month - 1)
      : mode === 'nominal'
        ? withdrawal
        : realWithdrawal * Math.pow(1 + returns.monthlyInflation, month);
    const next = Math.max(0, previous * (1 + returns.monthlyRealNet) - realWithdrawal);
    data.push(next);
    totalNominalWithdrawn += nominalWithdrawal;
    totalRealWithdrawn += realWithdrawal;
    if (next === 0 && exhaustedAtMonth === null) exhaustedAtMonth = month;
  }

  const finalReal = data[data.length - 1];
  return {
    data,
    withdrawal,
    mode,
    totalNominalWithdrawn,
    totalRealWithdrawn,
    finalNominal: finalReal * Math.pow(1 + returns.monthlyInflation, months),
    finalReal,
    exhaustedAtMonth,
    survivedMonths: exhaustedAtMonth || months,
    survivedPercent: (exhaustedAtMonth || months) / months * 100
  };
}

function validateInputs(input) {
  const errors = [];
  if (!(input.principal > 0)) errors.push('O patrimônio inicial deve ser maior que zero.');
  if (!(input.years > 0)) errors.push('O horizonte deve ser maior que zero.');
  if (input.inflation < 0) errors.push('A inflação não pode ser negativa.');
  if (input.taxRate < 0 || input.taxRate > 1) errors.push('O IR deve estar entre 0% e 100%.');
  if (input.rate < -1 || input.rate > 2) errors.push('A taxa informada deve estar entre -100% e 200%.');
  if (input.fixedWithdrawal < 0) errors.push('A retirada não pode ser negativa.');
  return errors;
}

const api = { annualToMonthly, monthlyToAnnual, nominalFromReal, applyTaxToNominal, realFromNominal, calculateReturns, calculateIncomeSummary, simulateStrategy, validateInputs };

if (typeof module !== 'undefined') module.exports = api;
if (typeof window !== 'undefined') window.RealFinance = api;
})();
