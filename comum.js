// Vale Refeição — funções comuns às páginas
var API = window.VR_API || 'https://wughmiprdbycsmkjsslj.supabase.co/functions/v1/vale/api';

// "uber" é a chave interna (banco); o nome mostrado é "Aplicativo"
var CATEGORIAS = { uber: 'Aplicativo', taxista: 'Taxista', guia: 'Guia', motorista: 'Motorista', prefeitura: 'Prefeitura' };
var CAT_VEICULO = { taxista: 'Taxista', uber: 'Motorista de aplicativo' };
var COM_ADESIVO = { uber: true, taxista: true };
var PERFIL_NOME = { caixa: 'Caixa', supervisor: 'Supervisor', admin: 'Administrativo' };
// Quem libera o almoço de cada categoria
var CATS_TELA = { supervisor: ['guia', 'motorista'], caixa: ['prefeitura', 'uber', 'taxista'] };
var STATUS_NOME = { ativo: 'Ativo', pendente: 'Pendente', renovacao: 'Renovação', inativo: 'Inativo', vencido: 'Vencido', vencendo: 'Vencendo' };
var MESES_TXT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function lerLS(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function gravarLS(k, v){ try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function norm(s){ return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
function param(k){ return new URLSearchParams(location.search).get(k) || ''; }
function dBr(s){ if (!s) return ''; var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function dCurta(s){ if (!s) return ''; var p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
function dExtenso(s){ if (!s) return ''; var p = String(s).slice(0, 10).split('-'); return +p[2] + ' de ' + MESES_TXT[+p[1] - 1] + '. de ' + p[0]; }
function isoBR(ts){ return new Date(Date.parse(ts) - 3 * 3600000).toISOString(); }
function horaBR(ts){ return ts ? isoBR(ts).slice(11, 16) : ''; }
function dataBRdeTs(ts){ return ts ? dBr(isoBR(ts).slice(0, 10)) : ''; }
function hojeIso(){ return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10); }
function fmtTel(t){
  t = String(t || '').replace(/\D/g, '');
  if (t.length === 11) return '(' + t.slice(0, 2) + ') ' + t.slice(2, 7) + '-' + t.slice(7);
  if (t.length === 10) return '(' + t.slice(0, 2) + ') ' + t.slice(2, 6) + '-' + t.slice(6);
  return t;
}
function fmtPlaca(p){ p = String(p || '').toUpperCase(); return p.length === 7 ? p.slice(0, 3) + '-' + p.slice(3) : p; }
function mascaraTel(el){
  el.addEventListener('input', function(){
    var d = this.value.replace(/\D/g, '').slice(0, 11), v = d;
    if (d.length > 6) v = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length > 10 ? 7 : 6) + '-' + d.slice(d.length > 10 ? 7 : 6);
    else if (d.length > 2) v = '(' + d.slice(0, 2) + ') ' + d.slice(2);
    this.value = v;
  });
}
function mascaraPlaca(el){
  el.addEventListener('input', function(){
    var v = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    this.value = v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v;
  });
}
function pillStatus(st){ return '<span class="pill ' + esc(st) + '">' + esc(STATUS_NOME[st] || st) + '</span>'; }
function pillCat(c){ return '<span class="pill cat">' + esc(CATEGORIAS[c] || c) + '</span>'; }
function textoVenc(dias){
  if (dias == null) return '';
  if (dias < -1) return 'venceu há ' + (-dias) + ' dias';
  if (dias === -1) return 'venceu ontem';
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'vence amanhã';
  return 'vence em ' + dias + ' dias';
}
function linkZap(tel, texto){ return 'https://wa.me/55' + String(tel || '').replace(/\D/g, '') + (texto ? '?text=' + encodeURIComponent(texto) : ''); }

var toastTimer = null;
function toast(t, acao, fn){
  var el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = t;
  if (acao) { var b = document.createElement('button'); b.textContent = acao; b.onclick = function(){ el.className = 'toast'; fn(); }; el.appendChild(b); }
  el.className = 'toast on';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ el.className = 'toast'; }, acao ? 6000 : 2600);
}

// Chamada pública (sem PIN)
function apiPub(caminho, opts){
  opts = opts || {};
  if (opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData)) opts.body = JSON.stringify(opts.body);
  if (typeof opts.body === 'string') opts.headers = Object.assign({'Content-Type': 'application/json'}, opts.headers || {});
  return fetch(API + caminho, opts).then(function(r){
    return r.json().catch(function(){ return { erro: 'Resposta inesperada do servidor.' }; }).then(function(j){ if (!r.ok) throw new Error(j.erro || 'Erro'); return j; });
  });
}

// ---------------------------------------------------------- login por PIN ---
// Usado pelas telas de liberação (caixa e supervisor) e pelo painel administrativo.
// Guarda o PIN no aparelho depois do primeiro acesso.
var SESSAO = { perfil: '', pin: '' };
function apiAuth(caminho, opts){
  opts = opts || {};
  if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
  opts.headers = Object.assign({'Content-Type': 'application/json', 'x-perfil': SESSAO.perfil, 'x-pin': SESSAO.pin}, opts.headers || {});
  return fetch(API + caminho, opts).then(function(r){
    if (r.status === 401) { gravarLS('vr_pin_' + SESSAO.perfil, null); SESSAO.pin = ''; if (window.aoPerderSessao) window.aoPerderSessao(); throw new Error('401'); }
    return r.json().catch(function(){ return { erro: 'Resposta inesperada do servidor.' }; }).then(function(j){ if (!r.ok) throw new Error(j.erro || 'Erro'); return j; });
  });
}

// Tela de PIN. perfis: lista de perfis aceitos, o primeiro é o principal (ex.: ['caixa','admin']).
function telaPin(app, estado, perfis, msg, aoEntrar){
  var principal = perfis[0], nomeP = estado.perfis[principal].nome;
  if (!estado.perfis[principal].temPin) { telaCriarPin(app, estado, principal, false, aoEntrar); return; }
  var outros = perfis.slice(1).filter(function(pf){ return estado.perfis[pf] && estado.perfis[pf].temPin; }).map(function(pf){ return estado.perfis[pf].nome; });
  app.innerHTML = '<div class="centro"><h2>Entrar como ' + esc(nomeP) + '</h2>'
    + '<p>Digite o PIN do ' + esc(nomeP) + '.' + (outros.length ? ' O PIN ' + esc(outros.join(' ou ')) + ' também entra.' : '') + '</p>'
    + '<input type="password" id="l-pin" inputmode="numeric" autocomplete="current-password" aria-label="PIN">'
    + '<div class="erro">' + esc(msg || '') + '</div>'
    + '<button class="bt-mar" id="l-ok">Entrar</button>'
    + '<button class="link" id="l-trocar">Criar ou trocar o PIN do ' + esc(nomeP) + '</button></div>';
  var tentando = false;
  var entrar = function(){
    var pin = document.getElementById('l-pin').value.trim();
    if (!pin || tentando) return;
    tentando = true;
    var i = 0;
    var tenta = function(){
      if (i >= perfis.length) { tentando = false; telaPin(app, estado, perfis, 'PIN incorreto.', aoEntrar); return; }
      var perfil = perfis[i++];
      if (!estado.perfis[perfil].temPin) { tenta(); return; }
      fetch(API + '/caixa/hoje', { headers: {'x-perfil': perfil, 'x-pin': pin} }).then(function(r){
        if (r.ok) { SESSAO.perfil = perfil; SESSAO.pin = pin; gravarLS('vr_perfil', perfil); gravarLS('vr_pin_' + perfil, pin); tentando = false; aoEntrar(); }
        else tenta();
      }).catch(function(){ tentando = false; telaPin(app, estado, perfis, 'Sem conexão. Tente de novo.', aoEntrar); });
    };
    tenta();
  };
  document.getElementById('l-ok').onclick = entrar;
  document.getElementById('l-pin').addEventListener('keydown', function(ev){ if (ev.key === 'Enter') entrar(); });
  document.getElementById('l-trocar').onclick = function(){ telaCriarPin(app, estado, principal, true, aoEntrar); };
  document.getElementById('l-pin').focus();
}

function telaCriarPin(app, estado, perfil, trocar, aoEntrar){
  var nomeP = estado.perfis[perfil].nome;
  app.innerHTML = '<div class="centro"><h2>' + (trocar ? 'Trocar o PIN do ' + esc(nomeP) : 'Primeiro acesso do ' + esc(nomeP)) + '</h2>'
    + '<p>Informe o PIN do setor de compras (o mesmo das cotações) e escolha o PIN que o ' + esc(nomeP) + ' vai usar.</p>'
    + '<label for="c-adm">PIN do setor de compras</label><input type="password" id="c-adm" inputmode="numeric" autocomplete="off">'
    + '<label for="c-pin">Novo PIN do ' + esc(nomeP) + ' (4 a 8 números)</label><input type="password" id="c-pin" inputmode="numeric" autocomplete="new-password">'
    + '<label for="c-pin2">Repita o novo PIN</label><input type="password" id="c-pin2" inputmode="numeric" autocomplete="new-password">'
    + '<div class="erro" id="c-erro"></div>'
    + '<button class="bt-mar" id="c-ok">Salvar PIN e entrar</button>'
    + (estado.perfis[perfil].temPin ? '<button class="link" id="c-voltar">Voltar</button>' : '') + '</div>';
  var v = document.getElementById('c-voltar');
  if (v) v.onclick = function(){ telaPin(app, estado, [perfil], '', aoEntrar); };
  document.getElementById('c-ok').onclick = function(){
    var adm = document.getElementById('c-adm').value.trim();
    var p1 = document.getElementById('c-pin').value.trim();
    var p2 = document.getElementById('c-pin2').value.trim();
    var er = document.getElementById('c-erro');
    if (!adm) { er.textContent = 'Informe o PIN do setor de compras.'; return; }
    if (!/^\d{4,8}$/.test(p1)) { er.textContent = 'O novo PIN precisa ter de 4 a 8 números.'; return; }
    if (p1 !== p2) { er.textContent = 'Os dois PINs não são iguais.'; return; }
    var bt = this; bt.disabled = true;
    apiPub('/pin', { method: 'POST', body: { perfil: perfil, admin_pin: adm, pin: p1 } }).then(function(){
      estado.perfis[perfil].temPin = true;
      SESSAO.perfil = perfil; SESSAO.pin = p1; gravarLS('vr_perfil', perfil); gravarLS('vr_pin_' + perfil, p1);
      toast('PIN do ' + nomeP + ' salvo.');
      aoEntrar();
    }).catch(function(e){ bt.disabled = false; er.textContent = e.message; });
  };
}

// Recupera a sessão guardada no aparelho (se houver) para um dos perfis aceitos
function sessaoGuardada(perfis){
  for (var i = 0; i < perfis.length; i++) {
    var pin = lerLS('vr_pin_' + perfis[i]);
    if (pin) { SESSAO.perfil = perfis[i]; SESSAO.pin = pin; return true; }
  }
  return false;
}
function sair(){ gravarLS('vr_pin_' + SESSAO.perfil, null); SESSAO.pin = ''; location.reload(); }
