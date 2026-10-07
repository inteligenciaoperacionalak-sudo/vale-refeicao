// Vale Refeição — tela de liberação do almoço. O mesmo código serve caixa.html e supervisor.html:
// a página define window.TELA = { perfil: 'caixa' | 'supervisor', intro: '...' } antes de carregar este arquivo.
// As duas telas liberam qualquer categoria (desde 07/10/2026). No dia a dia o supervisor cuida de guias e motoristas
// e o caixa de prefeitura, aplicativo e taxista; fora disso a tela só mostra um aviso suave, sem bloquear.
// A conferência dos vales fica na tela do caixa. O PIN administrativo também entra nas duas telas.
var app = document.getElementById('app');
var TELA = window.TELA;
var PERFIS_TELA = [TELA.perfil, 'admin'];
var Q_TELA = 'tela=' + TELA.perfil;
var OUTRA = TELA.perfil === 'caixa' ? 'Supervisor' : 'Caixa';
var EST = null, HOJE = null, RES = [], SEL = null, TERMO = '', timer = null, ULT_BUSCA = 0;
var DIA = null;            // resposta de /caixa/hoje (o dia inteiro; na tela do caixa traz também a conferência)
var CONF_ABERTA = false;   // formulário da conferência aberto

function topo(){
  var h = '<h1>Vale refeição</h1>';
  if (SESSAO.pin) h += '<span class="tag">' + esc(PERFIL_NOME[TELA.perfil]) + (SESSAO.perfil === 'admin' ? ' · adm' : '') + '</span>';
  h += '<span class="emp">' + esc(EST ? EST.empresa : '') + '</span>';
  if (SESSAO.pin) h += '<button id="bt-sair">Sair</button>';
  document.getElementById('topo').innerHTML = h;
  var s = document.getElementById('bt-sair'); if (s) s.onclick = sair;
}
window.aoPerderSessao = function(){ topo(); telaPin(app, EST, PERFIS_TELA, 'PIN incorreto ou trocado. Digite de novo.', entrar); };

function boot(){
  apiPub('/estado').then(function(e){
    EST = e; topo();
    if (sessaoGuardada(PERFIS_TELA)) entrar();
    else telaPin(app, EST, PERFIS_TELA, '', entrar);
  }).catch(function(){ app.innerHTML = '<p class="erro">Não consegui carregar. Verifique a conexão e recarregue a página.</p>'; });
}

function entrar(){
  topo();
  app.innerHTML = '<p class="tela-intro">' + esc(TELA.intro) + '</p>'
    + '<div class="busca"><input type="search" id="q" placeholder="Nome, placa ou telefone" autocomplete="off" aria-label="Buscar parceiro" value="' + esc(TERMO) + '">'
    + '<button class="limpar" id="q-limpar" aria-label="Limpar" hidden>&times;</button></div>'
    + '<div id="veredito"></div><div id="res"></div>'
    + '<div id="conf"></div>'
    + '<details class="hoje" id="hoje"><summary>Almoços de hoje</summary><div id="hoje-lista"></div></details>';
  var q = document.getElementById('q');
  q.oninput = function(){
    TERMO = this.value; SEL = null;
    document.getElementById('q-limpar').hidden = !TERMO;
    document.getElementById('veredito').innerHTML = '';   // some o veredito da busca anterior na hora
    clearTimeout(timer);
    if (TERMO.trim().length < 2) { RES = []; render(); return; }
    timer = setTimeout(buscar, 250);
  };
  q.onkeydown = function(ev){ if (ev.key === 'Enter') { clearTimeout(timer); buscar(); } };
  document.getElementById('q-limpar').onclick = limpar;
  q.focus();
  carregarHoje();
  if (TERMO.trim().length >= 2) buscar();
}

function limpar(){ TERMO = ''; RES = []; SEL = null; var q = document.getElementById('q'); q.value = ''; document.getElementById('q-limpar').hidden = true; render(); q.focus(); }

function buscar(){
  var t = TERMO.trim(); if (t.length < 2) return;
  var n = ++ULT_BUSCA;
  apiAuth('/caixa/buscar?' + Q_TELA + '&q=' + encodeURIComponent(t)).then(function(d){
    if (n !== ULT_BUSCA) return;          // chegou resposta de uma busca antiga
    HOJE = d.hoje; RES = d.parceiros;
    if (RES.length === 1) SEL = RES[0].id;
    render();
  }).catch(function(e){ if (e.message !== '401') toast(e.message); });
}

function carregarHoje(){
  apiAuth('/caixa/hoje?' + Q_TELA).then(function(d){
    HOJE = d.hoje; DIA = d;
    var box = document.getElementById('hoje-lista'), det = document.getElementById('hoje');
    if (!box) return;
    renderDia(d, box, det);
    renderConf();
  }).catch(function(){});
}

function linhasAlmoco(lista){
  var h = '';
  for (var i = 0; i < lista.length; i++) {
    var a = lista[i];
    h += '<div class="linha"><div class="txt"><div class="tit">' + esc(a.nome) + '</div><div class="sub">' + esc(CATEGORIAS[a.categoria] || a.categoria) + ' · ' + horaBR(a.hora) + '</div></div></div>';
  }
  return h;
}

// O dia inteiro nas duas telas, em blocos por quem liberou (é o que o relatório também mostra)
function renderDia(d, box, det){
  var r = d.resumo || { total: d.almocos.length, caixa: 0, supervisor: 0, admin: 0 };
  var todos = d.todos || d.almocos, desfeitos = d.desfeitos || [];
  det.querySelector('summary').textContent = 'Almoços de hoje · ' + r.total;
  var porPerfil = function(pf){ return todos.filter(function(a){ return a.liberado_por === pf; }); };
  var cx = porPerfil('caixa'), sp = porPerfil('supervisor'), ad = porPerfil('admin');
  var h = '<p class="msg" style="margin-top:4px">' + r.total + ' no total · ' + r.caixa + ' pelo caixa · ' + r.supervisor + ' pelos supervisores' + (r.admin ? ' · ' + r.admin + ' pelo administrativo' : '') + (desfeitos.length ? ' · ' + desfeitos.length + ' desfeito' + (desfeitos.length > 1 ? 's' : '') : '') + '</p>';
  if (!r.total && !desfeitos.length) h += '<p class="msg">Nenhum almoço liberado hoje ainda.</p>';
  h += '<div class="bloco-tit">Liberados pelo Caixa (' + cx.length + ')</div>' + (cx.length ? linhasAlmoco(cx) : '<p class="msg">Nenhum.</p>');
  h += '<div class="bloco-tit">Liberados pelos Supervisores (' + sp.length + ')</div>' + (sp.length ? linhasAlmoco(sp) : '<p class="msg">Nenhum.</p>');
  if (ad.length) h += '<div class="bloco-tit">Liberados pelo Administrativo (' + ad.length + ')</div>' + linhasAlmoco(ad);
  if (desfeitos.length) {
    h += '<div class="bloco-tit">Desfeitos (' + desfeitos.length + ')</div>';
    for (var i = 0; i < desfeitos.length; i++) {
      var a = desfeitos[i];
      h += '<div class="linha desfeito"><div class="txt"><div class="tit">' + esc(a.nome) + '</div><div class="sub">' + esc(CATEGORIAS[a.categoria] || a.categoria) + ' · liberado ' + horaBR(a.hora) + ' · desfeito ' + horaBR(a.desfeito_em) + ' pelo ' + esc(PERFIL_NOME[a.desfeito_por] || a.desfeito_por) + '</div></div></div>';
    }
  }
  box.innerHTML = h;
}

// ------------------------------------------------- conferência dos vales (tela do caixa) ---
function textoDif(dif){ return dif === 0 ? 'Bateu' : dif < 0 ? 'Falta ' + (-dif) : 'Sobra ' + dif; }
function classeDif(dif){ return dif === 0 ? 'ok' : dif < 0 ? 'falta' : 'sobra'; }

function renderConf(){
  var box = document.getElementById('conf');
  if (!box) return;
  if (!DIA || !DIA.resumo || !('conferencia' in DIA)) { box.innerHTML = ''; return; }   // conferência só na tela do caixa
  var c = DIA.conferencia, total = DIA.resumo.total, h;
  if (CONF_ABERTA) {
    h = '<div class="conf form"><div class="conf-tit">Conferir vales recebidos</div>'
      + '<p class="msg" style="margin:0 0 6px">Conte os vales físicos que voltaram do almoço e digite a quantidade. O sistema tem <b>' + total + '</b> almoço' + (total === 1 ? '' : 's') + ' liberado' + (total === 1 ? '' : 's') + ' hoje.</p>'
      + '<label for="cf-vales">Vales recebidos</label><input type="number" id="cf-vales" inputmode="numeric" min="0" max="9999" value="' + (c ? c.vales : '') + '">'
      + '<div class="conf-previa" id="cf-previa"></div>'
      + '<label for="cf-obs">Observação <span class="opc">(opcional)</span></label><input type="text" id="cf-obs" maxlength="200" placeholder="ex.: 1 vale rasgado" value="' + esc(c && c.observacao ? c.observacao : '') + '">'
      + '<div class="acoes"><button class="bt-mar" id="cf-ok">Gravar conferência</button><button class="bt-cinza" id="cf-cancelar">Cancelar</button></div></div>';
    box.innerHTML = h;
    var inp = document.getElementById('cf-vales');
    var previa = function(){
      var v = parseInt(inp.value, 10), el = document.getElementById('cf-previa');
      if (isNaN(v)) { el.textContent = ''; el.className = 'conf-previa'; return; }
      var dif = v - total; el.className = 'conf-previa ' + classeDif(dif);
      el.textContent = 'Sistema ' + total + ' · Vales ' + v + ' → ' + textoDif(dif);
    };
    inp.oninput = previa; previa(); inp.focus();
    document.getElementById('cf-cancelar').onclick = function(){ CONF_ABERTA = false; renderConf(); };
    document.getElementById('cf-ok').onclick = gravarConf;
    return;
  }
  if (c) {
    var dif = c.vales - c.almocos_sistema;
    var depois = DIA.todos.filter(function(a){ return Date.parse(a.hora) > Date.parse(c.hora); }).length;
    h = '<div class="conf ' + classeDif(dif) + '"><div class="conf-tit">Conferência do dia · ' + horaBR(c.hora) + ' · ' + esc(PERFIL_NOME[c.perfil] || c.perfil) + '</div>'
      + '<div class="conf-num">Sistema ' + c.almocos_sistema + ' · Vales recebidos ' + c.vales + ' · <b>' + textoDif(dif) + '</b></div>'
      + (c.observacao ? '<div class="msg" style="margin:4px 0 0">' + esc(c.observacao) + '</div>' : '')
      + (depois ? '<div class="msg" style="margin:4px 0 0">' + depois + ' almoço' + (depois > 1 ? 's' : '') + ' liberado' + (depois > 1 ? 's' : '') + ' depois da conferência (agora ' + total + ' no sistema).</div>' : '')
      + '<div class="acoes" style="margin-top:10px"><button class="bt-cinza bt-mini" id="cf-abrir">Refazer conferência</button></div></div>';
  } else {
    h = '<div class="conf"><div class="conf-tit">Conferência do dia</div>'
      + '<p class="msg" style="margin:0">Ainda não feita. Ao fim do almoço, conte os vales que voltaram e compare com os ' + total + ' almoço' + (total === 1 ? '' : 's') + ' do sistema.</p>'
      + '<div class="acoes" style="margin-top:10px"><button class="bt-mar bt-mini" id="cf-abrir">Conferir vales recebidos</button></div></div>';
  }
  box.innerHTML = h;
  document.getElementById('cf-abrir').onclick = function(){ CONF_ABERTA = true; renderConf(); };
}

function gravarConf(){
  var v = parseInt(document.getElementById('cf-vales').value, 10);
  if (isNaN(v) || v < 0) { toast('Digite a quantidade de vales recebidos.'); return; }
  var bt = document.getElementById('cf-ok'); bt.disabled = true;
  apiAuth('/caixa/conferir', { method: 'POST', body: { tela: TELA.perfil, vales: v, observacao: document.getElementById('cf-obs').value } }).then(function(r){
    CONF_ABERTA = false;
    toast('Conferência gravada: ' + textoDif(r.conferencia.vales - r.conferencia.almocos_sistema) + '.');
    carregarHoje();
  }).catch(function(e){ bt.disabled = false; if (e.message !== '401') toast(e.message); });
}

// Categoria fora do padrão desta tela? (não bloqueia; só avisa)
function foraDoPadrao(cat){ return CATS_TELA[TELA.perfil].indexOf(cat) < 0; }

function render(){
  var vb = document.getElementById('veredito'), rb = document.getElementById('res');
  if (!vb) return;
  var sel = null;
  for (var i = 0; i < RES.length; i++) if (RES[i].id === SEL) sel = RES[i];
  vb.innerHTML = sel ? htmlVeredito(sel) : '';
  var h = '';
  if (TERMO.trim().length >= 2 && !RES.length) {
    h = '<div class="res"><div class="vazio"><b>Ninguém com “' + esc(TERMO.trim()) + '”</b>'
      + '<span class="msg">Confira o nome, a placa ou o telefone. Sem cadastro, não libere o almoço.</span></div></div>';
  } else if (RES.length) {
    h = '<div class="res">';
    for (var j = 0; j < RES.length; j++) {
      var p = RES[j];
      h += '<div class="linha clic' + (p.almocou_em ? ' ja' : '') + '" data-sel="' + p.id + '" role="button" tabindex="0">'
        + '<div class="txt"><div class="tit">' + esc(p.nome) + '</div><div class="sub">' + esc(CATEGORIAS[p.categoria] || p.categoria) + (p.placa ? ' · ' + esc(fmtPlaca(p.placa)) : '') + ' · ' + esc(fmtTel(p.telefone)) + (p.setor ? ' · ' + esc(p.setor) : '') + '</div></div>'
        + (p.almocou_em ? '<span class="pill neutro">já almoçou</span>' : pillStatus(p.status)) + '<span class="chev">›</span></div>';
    }
    h += '</div>';
  }
  rb.innerHTML = h;
  var ls = rb.querySelectorAll('[data-sel]');
  var esc_ = function(){ SEL = this.getAttribute('data-sel'); render(); window.scrollTo(0, 0); };
  for (var k = 0; k < ls.length; k++) { ls[k].onclick = esc_; ls[k].onkeydown = function(ev){ if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); esc_.call(this); } }; }
  ligarVeredito(sel);
}

function htmlVeredito(p){
  var sub = esc(CATEGORIAS[p.categoria] || p.categoria) + (p.placa ? ' · ' + esc(fmtPlaca(p.placa)) : '') + ' · ' + esc(fmtTel(p.telefone)) + (p.empresa ? ' · ' + esc(p.empresa) : '') + (p.setor ? ' · ' + esc(p.setor) : '');
  var cls, frase, expl = '', acao = '';
  if (p.almocou_em) {
    cls = 'ja'; frase = 'Já almoçou hoje às ' + horaBR(p.almocou_em);
    expl = 'É 1 almoço por dia. Não entregue outro vale.';
    acao = '<button class="bt-link" data-desfazer="' + p.id + '">Lançado errado? Desfazer</button>';
  } else if (p.status === 'ativo') {
    cls = 'ativo'; frase = 'Pode almoçar';
    expl = (p.vencimento ? 'Adesivo válido até ' + dBr(p.vencimento) + (p.dias <= 15 ? ' · ' + textoVenc(p.dias) : '') + '. ' : 'Cadastro ativo. ') + 'Libere e entregue o vale.';
    if (foraDoPadrao(p.categoria)) acao += '<div class="padrao">' + esc(CATEGORIAS[p.categoria] || p.categoria) + ' normalmente é liberado pelo ' + OUTRA + '. Libere só se for o caso.</div>';
    acao += '<button class="bt-grande" data-liberar="' + p.id + '">Liberar almoço de hoje</button>';
  } else if (p.status === 'renovacao') {
    cls = 'renovacao'; frase = 'Adesivo vencido em ' + dBr(p.vencimento);
    expl = 'Não libere. Precisa renovar o adesivo e registrar de novo pelo QR do supervisor.';
  } else if (p.status === 'pendente') {
    cls = 'pendente'; frase = 'Adesivo não registrado';
    expl = 'Não libere. O adesivo do veículo precisa ser registrado pelo QR do supervisor.';
  } else {
    cls = 'inativo'; frase = 'Cadastro inativo';
    expl = 'Não libere. O cadastro foi inativado pelo administrativo.';
  }
  return '<div class="veredito ' + cls + '"><button class="fechar" data-fechar="1" aria-label="Fechar">&times;</button>'
    + '<div class="nome">' + esc(p.nome) + '</div><div class="sub">' + sub + '</div>'
    + '<div class="frase">' + esc(frase) + '</div>' + (expl ? '<div class="expl">' + esc(expl) + '</div>' : '') + acao + '</div>';
}

function ligarVeredito(p){
  var f = document.querySelector('[data-fechar]'); if (f) f.onclick = function(){ SEL = null; render(); };
  var l = document.querySelector('[data-liberar]');
  if (l) l.onclick = function(){
    l.disabled = true; l.textContent = 'Liberando…';
    apiAuth('/caixa/liberar', { method: 'POST', body: { parceiro_id: p.id, tela: TELA.perfil } }).then(function(r){
      p.almocou_em = r.hora;
      toast('Almoço liberado para ' + p.nome.split(' ')[0] + '. Entregue o vale.', 'Desfazer', function(){ desfazer(p); });
      carregarHoje();
      limpar();
    }).catch(function(e){
      if (e.message === '401') return;
      toast(e.message); buscar();
    });
  };
  var d = document.querySelector('[data-desfazer]');
  if (d) d.onclick = function(){ if (confirm('Desfazer o almoço de hoje de ' + p.nome + '?')) desfazer(p); };
}

function desfazer(p){
  apiAuth('/caixa/desfazer', { method: 'POST', body: { parceiro_id: p.id, tela: TELA.perfil } }).then(function(){
    p.almocou_em = null; toast('Almoço desfeito.'); carregarHoje(); render();
  }).catch(function(e){ if (e.message !== '401') toast(e.message); });
}

// ao voltar para a aba, atualiza a lista de hoje (pode ter virado o dia)
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible' && SESSAO.pin && document.getElementById('q')) carregarHoje(); });
boot();
