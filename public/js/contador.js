/* ════════════════════════════════════════════════════════════════
   Oratório Digital — contador da comunidade (orações, visitas, liturgias)

   Usa o Supabase quando src/config/site.ts tem supabaseUrl e supabaseKey;
   senão, o serviço antigo (Abacus). As páginas usam sempre window.odContador:

     odContador.ativo                 contador ligado? (true/false)
     odContador.servico               'supabase' | 'abacus' | 'desligado'
     odContador.ler([chaves], {novo})  Promise → { chave: número } ou null se falhou.
                                      Sem chaves = todos os contadores (no Supabase,
                                      inclui 'hoje' = orações de hoje). A leitura é
                                      guardada na página; {novo: true} busca de novo.
     odContador.contarOracao(slug)    Promise → { oracao: n|null, total: n|null }
     odContador.contarVisita()        Promise → n|null
     odContador.contarLiturgia()      Promise → n|null
     odContador.contarVisitaOracao(slug)  Promise → n|null  (só no Supabase) visita à
                                      página de uma oração
     odContador.numeros(dias, limite) Promise → objeto|null (só no Supabase) os números
                                      da página /numeros/ (ver ler_numeros no contador.sql)

   Robôs de busca (Googlebot e parecidos) não somam visitas.

   Nada aqui lança erro: rede caída, bloqueador ou serviço fora → null.
   Depende de window.__SITE__ (definido antes pelo Base.astro).
   ════════════════════════════════════════════════════════════════ */
(function () {
  var S = window.__SITE__ || {};
  var c = S.counter || {};
  var ligado = !!c.enabled;
  var supa = ligado && !!(c.supabaseUrl && c.supabaseKey);
  var PRAZO = 6000; // ms; depois disso desiste (nunca deixa a página esperando)
  var K = { total: c.totalKey || 'total', visitas: c.visitsKey || 'visits', liturgias: c.liturgiasKey || 'liturgias' };

  // fetch com prazo; resolve { ok, status, json } ou null (nunca rejeita)
  function pedir(url, opcoes, ms) {
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var o = opcoes || {};
    if (ctl) o.signal = ctl.signal;
    var prazo = new Promise(function (res) {
      setTimeout(function () { if (ctl) { try { ctl.abort(); } catch (e) {} } res(null); }, ms || PRAZO);
    });
    var req = fetch(url, o).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, status: r.status, json: j }; },
        function () { return { ok: r.ok, status: r.status, json: null }; });
    }).catch(function () { return null; });
    return Promise.race([req, prazo]);
  }
  function num(v) { var n = typeof v === 'string' ? Number(v) : v; return (typeof n === 'number' && isFinite(n)) ? n : null; }
  // robôs de busca e prévias de link rodam o JavaScript da página: não contam como visita
  // ("bot" só seguido de / ; ) ou -: celulares como o "CUBOT P80" continuam contando)
  var ROBO = /bot[\/;)\-]|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|lighthouse|pagespeed|prerender/i;
  var robo = ROBO.test((navigator && navigator.userAgent) || '');

  // ───────── Supabase: funções do banco (ver supabase/contador.sql) ─────────
  // aceita o endereço do projeto com ou sem barra final e com ou sem /rest/v1
  var URL_RPC = supa ? String(c.supabaseUrl).trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '') + '/rest/v1/rpc/' : '';
  function rpc(nome, args) {
    return pedir(URL_RPC + nome, {
      method: 'POST',
      headers: { 'apikey': c.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {})
    }).then(function (r) { return (r && r.ok) ? r.json : null; });
  }

  // ───────── Abacus (serviço antigo) ─────────
  function abacus(acao, chave) {
    var url = c.base + '/' + acao + '/' + encodeURIComponent(c.namespace) + '/' + encodeURIComponent(chave);
    return pedir(url).then(function (r) {
      if (r && r.ok && r.json && num(r.json.value) != null) return num(r.json.value);
      if (r && r.status === 404) return 0; // chave ainda não existe: ninguém contou ainda
      return null;
    });
  }

  // ───────── leitura (uma só por página para o mesmo pedido) ─────────
  var memo = {};
  function ler(chaves, opcoes) {
    if (!ligado) return Promise.resolve(null);
    var lista = (chaves && chaves.length) ? chaves.slice() : null;
    var id = lista ? lista.slice().sort().join('|') : '*';
    if (opcoes && opcoes.novo) { delete memo[id]; delete memo['*']; }
    if (memo[id]) return memo[id];
    if (lista && memo['*']) {
      // já há uma leitura de todos: aproveita
      return memo['*'].then(function (todos) {
        if (!todos) return null;
        var m = {}; lista.forEach(function (k) { m[k] = todos[k] != null ? todos[k] : 0; }); return m;
      });
    }
    var p;
    if (supa) {
      p = rpc('ler_contadores', { p_chaves: lista }).then(function (rows) {
        if (!Array.isArray(rows)) return null;
        var m = {};
        if (lista) lista.forEach(function (k) { m[k] = 0; }); // chave sem linha = ninguém contou ainda
        for (var i = 0; i < rows.length; i++) { var v = num(rows[i].valor); if (rows[i].chave && v != null) m[rows[i].chave] = v; }
        return m;
      });
    } else {
      if (!lista) lista = [K.total, K.visitas];
      p = Promise.all(lista.map(function (k) { return abacus('get', k); })).then(function (vals) {
        var m = {}, algum = false;
        vals.forEach(function (v, i) { if (v != null) { m[lista[i]] = v; algum = true; } });
        return algum ? m : null;
      });
    }
    memo[id] = p;
    p.then(function (r) { if (!r) delete memo[id]; }); // falhou: deixa tentar de novo depois
    return p;
  }

  // ───────── contagens ─────────
  // depois de contar, as leituras guardadas ficam velhas: a próxima leitura busca de novo
  function esquecer(v) { memo = {}; return v; }
  function contarOracao(slug) {
    if (!ligado || !slug) return Promise.resolve({ oracao: null, total: null });
    if (supa) {
      return rpc('contar_oracao', { p_slug: slug }).then(function (j) {
        return esquecer({ oracao: j ? num(j.oracao) : null, total: j ? num(j.total) : null });
      });
    }
    return Promise.all([abacus('hit', slug), abacus('hit', K.total)]).then(function (v) {
      return esquecer({ oracao: v[0], total: v[1] });
    });
  }
  function contarVisita() {
    if (!ligado || robo) return Promise.resolve(null);
    return (supa ? rpc('contar_visita').then(num) : abacus('hit', K.visitas)).then(esquecer);
  }
  // visita à página de uma oração: só no Supabase (o Abacus não tem histórico)
  function contarVisitaOracao(slug) {
    if (!supa || robo || !slug) return Promise.resolve(null);
    return rpc('contar_visita_oracao', { p_slug: slug }).then(num);
  }
  // números da página /numeros/: total, série dia a dia e as mais rezadas/visitadas
  function numeros(dias, limite) {
    if (!supa) return Promise.resolve(null);
    return rpc('ler_numeros', { p_dias: dias || 30, p_limite: limite || 50 }).then(function (j) {
      return (j && typeof j === 'object' && Array.isArray(j.serie)) ? j : null;
    });
  }
  function contarLiturgia() {
    if (!ligado) return Promise.resolve(null);
    return (supa ? rpc('contar_liturgia').then(num) : abacus('hit', K.liturgias)).then(esquecer);
  }

  window.odContador = {
    ativo: ligado,
    servico: !ligado ? 'desligado' : (supa ? 'supabase' : 'abacus'),
    chaves: K,
    ler: ler,
    contarOracao: contarOracao,
    contarVisita: contarVisita,
    contarLiturgia: contarLiturgia,
    contarVisitaOracao: contarVisitaOracao,
    numeros: numeros
  };
})();
