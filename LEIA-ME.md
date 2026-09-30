# Vale Refeição — Cabana Tôa Tôa

Controle de quem tem direito ao almoço de parceiros (guias, motoristas, Uber, taxistas e prefeitura) e de quantos almoços são liberados por dia. Mesmo molde dos outros sistemas: páginas estáticas no GitHub Pages + função e tabelas no Supabase (projeto `cotacoes-compras`, tabelas com prefixo `vr_`, função `vale`).

## Páginas

| Página | Quem usa | Para quê |
|---|---|---|
| `index.html?s=CÓDIGO` | Parceiro (celular) | Abre pelo QR/link do supervisor e escolhe: cadastro do vale ou adesivo no veículo |
| `cadastro.html?s=CÓDIGO` | Parceiro | Cadastro do vale: nome, telefone, empresa (opcional), categoria; prefeitura pede o setor, Uber/taxista pede a placa |
| `veiculo.html?s=CÓDIGO` | Uber/taxista, com o supervisor conferindo | Marketing de Veículo: nome, telefone, modelo, placa e foto do carro com o adesivo. Registra aplicação ou renovação |
| `caixa.html` | Caixa (PIN do caixa) | Busca por nome, placa ou telefone, vê a situação e libera o almoço do dia (1 por pessoa por dia) |
| `painel.html` | Supervisores e diretoria (PIN do supervisor) | Abas Uber e Taxistas / Guias e Motoristas / Prefeitura / Marketing de Veículo / Renovações / Almoços / Supervisores |

## Regras que o sistema aplica sozinho

- **Status de Uber e taxista é calculado**: Ativo se telefone + placa batem com um veículo com adesivo no prazo; Renovação se batem mas o adesivo venceu; Pendente se não há adesivo registrado para aquele telefone + placa.
- **Guia, motorista e prefeitura**: Ativo ao cadastrar; o supervisor pode inativar/reativar.
- **Adesivo vale 6 meses** a partir da data da aplicação ou renovação. Essa data só muda pelo formulário do adesivo (com foto); corrigir nome ou telefone não reinicia a contagem.
- **Vencimento bloqueia sozinho**: no dia seguinte ao vencimento o caixa já não consegue liberar.
- **1 almoço por dia** é garantido no banco (restrição única parceiro + data).
- **Relatório de almoços** conta só o que o caixa liberou, por dia e por categoria; nomes ficam gravados mesmo se o cadastro for excluído depois.
- **Aviso de renovação**: aba Renovações lista vencidos e vencendo em 15 dias, com botão de WhatsApp e mensagem pronta. O envio é manual (sem custo).

## Primeiro uso

1. Abrir `painel.html` → "Primeiro acesso do Supervisor": informar o PIN do setor de compras (o mesmo das cotações) e criar o PIN do supervisor.
2. Aba **Supervisores** → adicionar cada supervisor → baixar o QR (PNG) ou copiar o link. Cada supervisor usa o seu.
3. Abrir `caixa.html` no aparelho do caixa → criar o PIN do caixa (também com o PIN do setor de compras).
4. Parceiro lê o QR do supervisor → cadastro. Uber/taxista: primeiro o adesivo (com foto, supervisor conferindo), depois o cadastro.

## Onde fica cada coisa

- **Supabase** (`wughmiprdbycsmkjsslj`): tabelas `vr_supervisores`, `vr_parceiros`, `vr_veiculos`, `vr_adesivos` (histórico), `vr_almocos`; bucket privado `vr-adesivos` (fotos, com link assinado só para o painel); PINs em `config` (`vr_pin_caixa`, `vr_pin_supervisor`, guardados como hash).
- **Função** `vale` (`supabase/functions/vale/index.ts`): toda a regra de negócio. As páginas só chamam a API.
- **Migração**: `supabase/migracao_vale_refeicao.sql`.
