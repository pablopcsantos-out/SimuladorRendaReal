# Simulador de Renda Real

Webapp estático, sem dependências e pronto para GitHub Pages, inspirado no estudo comparativo entre:

1. retirada baseada no retorno real líquido estimado;
2. retirada de todo o rendimento nominal líquido estimado;
3. retirada fixa corrigida pela inflação.

## Modelo

O usuário pode informar uma taxa nominal ou um retorno real bruto. No segundo caso, o simulador converte primeiro para nominal:

`r_nominal = (1 + r_real) * (1 + inflação) - 1`

Em seguida aplica o IR simplificado sobre o ganho nominal e converte o resultado para termos reais:

`r_real_liquido = (1 + r_nominal_liquido) / (1 + inflação) - 1`

As evoluções mensais usam equivalência composta, e não divisão simples por 12. Na simulação, o patrimônio primeiro recebe o retorno do mês e a retirada ocorre no fim do mês; a retirada efetivamente realizada é limitada ao saldo disponível. A seção “Como o cálculo foi feito” mostra os números do cenário ativo.

## Estratégias

- **Retirada de referência:** usa o retorno real líquido do cenário como premissa de planejamento. Não é uma garantia de preservação nem uma taxa universalmente segura.
- **Viver do rendimento nominal:** retira o ganho nominal líquido estimado. O patrimônio nominal pode ficar estável enquanto o poder de compra diminui.
- **Retirada fixa:** pode ser nominal ou corrigida pela inflação. O total retirado e os patrimônios final nominal e real são exibidos separadamente.

Todas as projeções são determinísticas e usam retorno constante. Elas não representam uma previsão.

## Limitações

O IR é uma hipótese configurável do modelo, não uma regra universal. A tributação real depende do produto financeiro, prazo, regime e legislação. O simulador também não modela volatilidade, sequência de retornos, custos, mudanças de taxa, produtos específicos ou garantias de preservação. Um retorno médio real de 4% não implica uma trajetória anual de 4%, especialmente durante retiradas.

## Execução e testes

Abra `index.html` diretamente ou sirva a pasta com qualquer servidor HTTP estático. O projeto não possui backend nem dependências externas e continua compatível com GitHub Pages.

Para executar os testes do motor matemático:

```bash
node financial-model.test.js
```

O workflow em `.github/workflows/deploy-simulador-renda-real.yml` publica a raiz como artefato do GitHub Pages.

O workflow `.github/workflows/test.yml` executa validação de sintaxe, testes do motor financeiro e um teste de fumaça da interface a cada push e pull request.

