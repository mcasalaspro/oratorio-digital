/* ════════════════════════════════════════════════════════════════
   Oratório Digital — "Sortear uma oração" (para conhecer algo novo)

   Qualquer link ou botão com data-od-sortear vira um sorteio: o site escolhe uma
   oração ao acaso e abre. O link aponta para /sortear/, que faz o mesmo sorteio —
   assim funciona também se este script não carregar.
     data-od-sortear=""          qualquer tipo
     data-od-sortear="novena"    só novenas (aceita vários: "terco,rosario")

   Como escolhe:
     • nunca a oração que está aberta, nem uma das últimas 30 sorteadas nesta visita;
     • prefere as que você ainda não abriu neste aparelho (lista "od-vistas", gravada
       pela página da oração) e que não estão nos seus favoritos;
     • só orações em português (com a interface em inglês, as em inglês também entram).
   A lista vem de /oracoes.json (pequena; o navegador guarda no cache).

   window.odSortear(tipos?) → Promise com { s, t, y, l?, u } ou null (sem lista);
   u = endereço da oração (/oracao/<s>/, com a base do site).
   ════════════════════════════════════════════════════════════════ */
(function () {
  var lista = null, pedido = null;

  function url(p) { return window.odBase ? window.odBase(p) : p; }
  function carregar() {
    if (lista) return Promise.resolve(lista);
    if (pedido) return pedido;
    var busca = fetch(url('/oracoes.json')).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { lista = Array.isArray(j) && j.length ? j : null; return lista; })
      .catch(function () { return null; });
    // no máximo 5 s (rede travada): depois disso desiste, e o botão volta a funcionar
    var prazo = new Promise(function (res) { setTimeout(function () { res(null); }, 5000); });
    pedido = Promise.race([busca, prazo]).then(function (l) { pedido = null; return l; });
    return pedido;
  }
  function lerLista(armazem, k) {
    try { var v = JSON.parse(window[armazem].getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function gravarLista(armazem, k, v) { try { window[armazem].setItem(k, JSON.stringify(v)); } catch (e) {} }

  function sortear(tipos) {
    var filtro = (tipos || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    return carregar().then(function (todas) {
      if (!todas) return null;
      var ui = (document.documentElement.getAttribute('data-lang') || 'pt-BR').slice(0, 2);
      var aberta = (/\/oracao\/([^/?#]+)/.exec(location.pathname) || [])[1] || '';
      var base = todas.filter(function (o) {
        var l = String(o.l || 'pt-BR').slice(0, 2);
        return o.s !== aberta && (l === 'pt' || l === ui) && (!filtro.length || filtro.indexOf(o.y) >= 0);
      });
      if (!base.length) return null;
      var recentes = lerLista('sessionStorage', 'od-sorteadas');
      var vistas = lerLista('localStorage', 'od-vistas').concat(lerLista('localStorage', 'od-favs'));
      var fora = function (o, xs) { return xs.indexOf(o.s) < 0; };
      var novas = base.filter(function (o) { return fora(o, recentes) && fora(o, vistas); });
      var monte = novas.length ? novas : base.filter(function (o) { return fora(o, recentes); });
      if (!monte.length) monte = base;
      var o = monte[Math.floor(Math.random() * monte.length)];
      o.u = o.u || url('/oracao/' + o.s + '/');
      recentes.unshift(o.s);
      gravarLista('sessionStorage', 'od-sorteadas', recentes.slice(0, 30));
      return o;
    });
  }

  function alvo(e) { var t = e.target; return t && t.closest ? t.closest('[data-od-sortear]') : null; }
  // passar o dedo/mouse já começa a buscar a lista (o toque fica instantâneo)
  ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (alvo(e)) carregar(); }, { passive: true, capture: true });
  });
  document.addEventListener('click', function (e) {
    var a = alvo(e);
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (a.getAttribute('aria-busy') === 'true') return;
    a.setAttribute('aria-busy', 'true');
    sortear(a.getAttribute('data-od-sortear')).then(function (o) {
      a.removeAttribute('aria-busy');
      if (o) { location.href = o.u; return; }
      // sem a lista (rede fora?): a página /sortear/ tenta de novo ou mostra o catálogo
      var destino = a.getAttribute('href');
      if (destino && !/\/sortear\/?$/.test(location.pathname)) location.href = destino;
    });
  });

  window.odSortear = sortear;
})();
