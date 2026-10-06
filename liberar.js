// Vale Refeição — tela de liberação do almoço. O mesmo código serve caixa.html e supervisor.html:
// a página define window.TELA = { perfil: 'caixa' | 'supervisor', intro: '...' } antes de carregar este arquivo.
//   supervisor → só guias e motoristas (confere o grupo, libera e entrega o vale)
//   caixa      → só prefeitura, aplicativo e taxista
// O PIN administrativo também entra nas duas telas.
var app = document.getElementById('app');
var TELA = window.TELA;
var PERFIS_TELA = [TELA.perfil, 'admin'];
var Q_TELA = 'tela=' + TELA.perfil;
var OUTRA = TELA.perfil === 'caixa' ? 'Supervisor' : 'Caixa';
var EST = null, HOJE = null, RES = [], FORA = [], SEL = null, TERMO = '', timer = null, ULT_BUSCA = 0;

function nomeCats(){ return CATS_TELA[TELA.perfil].map(function(c){ return CATEGORIAS[c]; }).join(', ').replace(/, ([^,]*)$/, ' e $1'); }

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
    + '<details class="hoje" id="hoje"><summary>Almoços de hoje</summary><div id="hoje-lista"></div></details>';
  var q = document.getElementById('q');
  q.oninput = function(){
    TERMO = this.value; SEL = null;
    document.getElementById('q-limpar').hidden = !TERMO;
    document.getElementById('veredito').innerHTML = '';   // some o veredito da busca anterior na hora
    clearTimeout(timer);
    if (TERMO.trim().length < 2) { RES = []; FORA = []; render(); return; }
    timer = setTimeout(buscar, 250);
  };
  q.onkeydown = function(ev){ if (ev.key === 'Enter') { clearTimeout(timer); buscar(); } };
  document.getElementById('q-limpar').onclick = limpar;
  q.focus();
  carregarHoje();
  if (TERMO.trim().length >= 2) buscar();
}

function limpar(){ TERMO = ''; RES = []; FORA = []; SEL = null; var q = document.getElementById('q'); q.value = ''; document.getElementById('q-limpar').hidden = true; render(); q.focus(); }

function buscar(){
  var t = TERMO.trim(); if (t.length < 2) return;
  var n = ++ULT_BUSCA;
  apiAuth('/caixa/buscar?' + Q_TELA + '&q=' + encodeURIComponent(t)).then(function(d){
    if (n !== ULT_BUSCA) return;          // chegou resposta de uma busca antiga
    HOJE = d.hoje; RES = d.parceiros; FORA = d.fora || [];
    if (RES.length === 1) SEL = RES[0].id;
    render();
  }).catch(function(e){ if (e.message !== '401') toast(e.message); });
}

function carregarHoje(){
  apiAuth('/caixa/hoje?' + Q_TELA).then(function(d){
    HOJE = d.hoje;
    var box = document.getElementById('hoje-lista'), det = document.getElementById('hoje');
    if (!box) return;
    det.querySelector('summary').textContent = 'Almoços de hoje · ' + d.almocos.length;
    var h = '';
    if (!d.almocos.length) h = '<p class="msg">Nenhum almoço liberado hoje ainda.</p>';
    for (var i = 0; i < d.almocos.length; i++) {
      var a = d.almocos[i];
      h += '<div class="linha"><div class="txt"><div class="tit">' + esc(a.nome) + '</div><div class="sub">' + esc(CATEGORIAS[a.categoria] || a.categoria) + ' · ' + horaBR(a.hora) + '</div></div></div>';
    }
    box.innerHTML = h;
  }).catch(function(){});
}

// Quem bateu com a busca mas é liberado na outra tela
function htmlFora(){
  if (!FORA.length) return '';
  var nomes = FORA.map(function(f){ return esc(f.nome) + ' (' + esc(CATEGORIAS[f.categoria] || f.categoria) + ')'; }).join(', ');
  return '<div class="fora"><b>Na tela do ' + OUTRA + ':</b> ' + nomes + '. '
    + (TELA.perfil === 'caixa' ? 'Guias e motoristas são liberados pelo supervisor.' : 'Prefeitura, aplicativo e taxista são liberados pelo caixa.') + '</div>';
}

function render(){
  var vb = document.getElementById('veredito'), rb = document.getElementById('res');
  if (!vb) return;
  var sel = null;
  for (var i = 0; i < RES.length; i++) if (RES[i].id === SEL) sel = RES[i];
  vb.innerHTML = sel ? htmlVeredito(sel) : '';
  var h = '';
  if (TERMO.trim().length >= 2 && !RES.length) {
    h = '<div class="res"><div class="vazio"><b>Ninguém com “' + esc(TERMO.trim()) + '”' + (FORA.length ? ' nesta tela' : '') + '</b>'
      + '<span class="msg">' + (FORA.length ? '' : 'Confira o nome, a placa ou o telefone. ') + 'Sem cadastro, não libere o almoço.</span></div>' + htmlFora() + '</div>';
  } else if (RES.length) {
    h = '<div class="res">';
    for (var j = 0; j < RES.length; j++) {
      var p = RES[j];
      h += '<div class="linha clic' + (p.almocou_em ? ' ja' : '') + '" data-sel="' + p.id + '" role="button" tabindex="0">'
        + '<div class="txt"><div class="tit">' + esc(p.nome) + '</div><div class="sub">' + esc(CATEGORIAS[p.categoria] || p.categoria) + (p.placa ? ' · ' + esc(fmtPlaca(p.placa)) : '') + ' · ' + esc(fmtTel(p.telefone)) + (p.setor ? ' · ' + esc(p.setor) : '') + '</div></div>'
        + (p.almocou_em ? '<span class="pill neutro">já almoçou</span>' : pillStatus(p.status)) + '<span class="chev">›</span></div>';
    }
    h += htmlFora() + '</div>';
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
    acao = '<button class="bt-grande" data-liberar="' + p.id + '">Liberar almoço de hoje</button>';
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
