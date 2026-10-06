# Vale Refeição — Cabana Tôa Tôa

Controle de quem tem direito ao almoço de parceiros (guias, motoristas, aplicativo, taxistas e prefeitura) e de quantos almoços são liberados por dia. Mesmo molde dos outros sistemas: páginas estáticas no GitHub Pages + função e tabelas no Supabase (projeto `cotacoes-compras`, tabelas com prefixo `vr_`, função `vale`).

## Como funciona (vale que gira)

O parceiro se cadastra uma vez pelo QR do supervisor. Na hora do almoço, quem libera busca o nome, clica em **Liberar almoço de hoje** e entrega o **vale físico**; o parceiro troca o vale pelo almoço. O vale não é de ninguém: circula.

| Quem libera | Categorias | Tela | PIN |
|---|---|---|---|
| **Supervisor** (confere o grupo do dia) | Guia, Motorista | `supervisor.html` | PIN único do supervisor |
| **Caixa** | Prefeitura, Aplicativo, Taxista | `caixa.html` | PIN do caixa |
| **Administrativo** | tudo (painel) | `painel.html` | PIN administrativo (também entra nas duas telas acima) |

Cada tela só mostra as próprias categorias na busca. Se a busca encontra alguém da outra tela, avisa ("Na tela do Caixa: Fulano (Aplicativo)") sem deixar liberar.

## Conferência pós-almoço (auditoria dos vales)

Os vales físicos são iguais para todas as categorias e voltam juntos ao fim do almoço, então a conferência é feita na **tela do Caixa**:

- "Almoços de hoje" no caixa mostra o **total do dia** com a quebra (caixa · supervisores · desfeitos) e os nomes em dois blocos. O bloco dos supervisores é só leitura: liberar e desfazer continuam só nas categorias de cada tela.
- **Conferir vales recebidos**: o caixa digita a quantidade de vales que voltou; o sistema compara com os almoços ativos e grava data, hora, perfil, número do sistema, vales, diferença (bateu / falta / sobra) e observação. Uma conferência por dia; refazer substitui.
- **Corte**: a conferência guarda o número do sistema naquele momento. Almoços liberados depois aparecem à parte ("2 liberados depois da conferência").
- **Desfazer não apaga**: o almoço fica marcado com hora e perfil de quem desfez, sai do total e aparece riscado na lista e no relatório.
- **Painel**: card "Conferência de hoje" (bateu / falta N / sobra N / não feita), e na aba Almoços cada dia mostra vales conferidos e diferença; o administrativo lança ou corrige a conferência de qualquer dia. A planilha exportada traz situação (ativo/desfeito), vales conferidos e diferença.
- Preparado para vales diferentes por tela: a tabela já tem `vales_caixa` e `vales_supervisor` (sem uso por enquanto).

## Páginas

| Página | Quem usa | Para quê |
|---|---|---|
| `index.html` | Equipe | Entrada com os três acessos (Supervisor, Caixa, Administrativo). Um link antigo `?s=CÓDIGO` segue para o cadastro |
| `cadastro.html?s=CÓDIGO` | Parceiro (QR Vale refeição do supervisor) | Cadastro do vale: nome, telefone, empresa (opcional), categoria; prefeitura pede o setor, aplicativo/taxista pede a placa |
| `veiculo.html?s=CÓDIGO` | Taxista/aplicativo, com o supervisor conferindo (QR Marketing de Veículo) | Marketing de Veículo: nome, telefone, **taxista ou motorista de aplicativo**, modelo, placa e foto do carro com o adesivo. Registra aplicação ou renovação |
| `supervisor.html` | Supervisores (PIN único) | Busca guias e motoristas, libera o almoço do dia e entrega o vale |
| `caixa.html` | Caixa (PIN do caixa) | Busca prefeitura, aplicativo e taxista, libera o almoço do dia e entrega o vale. Vê o total do dia e faz a conferência dos vales |
| `painel.html` | Administrativo (PIN administrativo) | Abas Aplicativo e Taxistas / Guias e Motoristas / Prefeitura / Marketing de Veículo / Renovações e, destacadas, Almoços / Supervisores. Cards de resumo filtram as listas; cada aba exporta planilha Excel |

Arquivos compartilhados: `comum.js` / `comum.css` (API, PIN, máscaras, estilos), `liberar.js` (lógica das telas do supervisor e do caixa), `xlsx.js` (gera o Excel no navegador, sem biblioteca externa), `qrcode.min.js`.

## Regras que o sistema aplica sozinho

- **Status de aplicativo e taxista é calculado**: Ativo se telefone + placa batem com um veículo com adesivo no prazo; Renovação se batem mas o adesivo venceu; Pendente se não há adesivo registrado para aquele telefone + placa.
- **Guia, motorista e prefeitura**: Ativo ao cadastrar; o administrativo pode inativar/reativar. Inativo não aparece como liberável em nenhuma tela.
- **Adesivo vale 6 meses** a partir da aplicação ou renovação. Essa data só muda pelo formulário do adesivo (com foto).
- **Vencimento bloqueia sozinho**: no dia seguinte ao vencimento ninguém consegue liberar.
- **1 almoço ativo por dia** é garantido no banco (índice único parceiro + data, ignorando os desfeitos).
- **Telefone único**: um segundo cadastro com o mesmo número recebe "Já tem cadastro nesse número" (sem mostrar o nome de quem já está cadastrado).
- **Relatório de almoços** por dia e por categoria, com quem liberou (Supervisor/Caixa); nomes ficam gravados mesmo se o cadastro for excluído depois.
- **Aviso de renovação**: aba Renovações lista vencidos e vencendo em 15 dias, com WhatsApp e mensagem pronta. A planilha da aba traz os telefones para disparo em lote.

## Painel administrativo

- **Cards de resumo são botões**: "ativos no vale", "vencendo", "precisam renovar" e "pendentes" filtram a aba atual (ou levam à aba onde o número faz sentido); "almoços hoje" abre a aba Almoços já com o dia de hoje. Clicar de novo tira o filtro.
- **Exportar planilha** em cada aba: baixa um `.xlsx` com o que está na tela (respeita busca e filtro). Telefone em duas colunas: formatado e "para disparo" (55 + DDD + número).
- **Marketing de Veículo**: mostra se é taxista ou aplicativo; corrigível em "Corrigir dados". Veículos antigos sem categoria aparecem como "sem categoria" até serem corrigidos.

## PINs

- Três PINs, criados ou trocados com o PIN do setor de compras (o mesmo das cotações): na tela de entrada, "Criar ou trocar o PIN".
- O PIN administrativo entra também nas telas do Supervisor e do Caixa (vê as categorias daquela tela). O PIN do caixa e o do supervisor só entram na própria tela.
- Guardados em `config` como hash (`vr_pin_supervisor`, `vr_pin_caixa`, `vr_pin_admin`); depois do primeiro acesso ficam salvos no aparelho.

## Primeiro uso

1. Abrir `painel.html` → PIN administrativo.
2. Aba **Supervisores** → adicionar cada supervisor → baixar os dois QRs (PNG) ou copiar os links. Imprimir ou mandar para o celular do supervisor.
3. Abrir `supervisor.html` no celular dos supervisores → "Primeiro acesso do Supervisor": informar o PIN do setor de compras e criar o PIN único. Depois, cada aparelho novo só pede esse PIN.
4. Abrir `caixa.html` no aparelho do caixa → PIN do caixa.
5. Parceiro lê o QR do supervisor → cadastro. Taxista/aplicativo: primeiro o QR Marketing de Veículo (com foto, supervisor conferindo), depois o QR Vale refeição.

## Onde fica cada coisa

- **Supabase** (`wughmiprdbycsmkjsslj`): tabelas `vr_supervisores`, `vr_parceiros`, `vr_veiculos` (com `categoria`), `vr_adesivos` (histórico), `vr_almocos` (com `liberado_por`, `desfeito_em`, `desfeito_por`), `vr_conferencias`; bucket privado `vr-adesivos` (fotos, com link assinado só para o painel); PINs em `config`.
- **Função** `vale` (`supabase/functions/vale/index.ts`): toda a regra de negócio. As páginas só chamam a API.
- **Migrações**: `supabase/migracao_vale_refeicao.sql` (criação), `supabase/migracao_2_perfis.sql` (categoria do veículo e PIN administrativo) e `supabase/migracao_3_conferencia.sql` (conferência e desfazer com rastro).
- **Chave interna**: a categoria "Aplicativo" fica gravada como `uber` no banco (nome antigo); só o nome mostrado mudou.
