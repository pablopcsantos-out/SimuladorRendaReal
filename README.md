# Simulador de Renda Real

Webapp estático, sem dependências e pronto para GitHub Pages, inspirado no estudo comparativo entre:

1. retirada baseada no retorno real líquido estimado;
2. retirada de todo o rendimento nominal líquido estimado;
3. retirada fixa corrigida pela inflação.

## Modelo

O simulador recebe patrimônio inicial, horizonte, juro real bruto, inflação, IR sobre o ganho nominal e uma retirada fixa inicial.

Para cada mês, calcula um retorno nominal compatível com o juro real e a inflação, desconta o IR sobre o ganho nominal e converte o resultado para poder de compra real. Os valores são uma simulação educacional, não uma projeção de mercado.

## Execução local

Abra `index.html` diretamente no navegador ou sirva a pasta com qualquer servidor HTTP estático.

## GitHub Pages

O workflow `.github/workflows/deploy-simulador-renda-real.yml` publica o conteúdo da raiz como artefato de GitHub Pages.
