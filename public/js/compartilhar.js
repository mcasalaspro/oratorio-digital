/* ════════════════════════════════════════════════════════════════
   Oratório Digital — compartilhar (link e imagem para Stories/Status)

   As páginas usam sempre window.odCompartilhar:

     odCompartilhar.link({ url, titulo, botao })
         Botão "Compartilhar": abre o menu do aparelho (navigator.share).
         Se falhar por outro motivo que não o cancelamento, copia o link;
         "Link copiado!" só quando a cópia acontece; sem área de
         transferência, mostra o endereço para copiar à mão.
     odCompartilhar.copiar(texto)   Promise<boolean> — true só se copiou.
     odCompartilhar.imagem(dados)   Promise<Blob|null> — JPEG 1080×1920.
     odCompartilhar.abrir(dados)    Janela "Stories e Status": gera a imagem
                                    ao abrir e oferece Compartilhar imagem,
                                    Copiar link e Baixar imagem.

   dados = {
     rotulo, rotuloChave   linha pequena no alto do texto (ex.: NOVENA)
     titulo                título grande (tamanho e quebra automáticos)
     trecho                texto em itálico (trecho da oração / frase)
     citacao               true = põe aspas no trecho
     linhas                linhas extras em itálico (ex.: "numa corrente de 120 orações")
     banner, bannerReserva imagem de fundo (mesma origem) e a de reserva
     caminho               ex.: /oracao/pai-nosso (vai no link; a imagem mostra só o domínio)
     dominio               ex.: oratoriodigital.com
     arquivo               nome do arquivo sem extensão
     tipo: 'site'          imagem do site inteiro ("Compartilhar o Oratório"): marca, uma frase
                           sobre a oração e os números (ver desenharSite); usa também
       frases              [{ texto, autor }] — "Outra frase" passa para a seguinte
       numeros             [{ n, rotulo }] — orações e biografias (do build)
       totalRotulo         rótulo do 3º número, o total de orações rezadas (lido ao abrir)
       reservaTotal        número de reserva se o contador não responder
       texto               legenda que vai junto ao compartilhar (WhatsApp)
       url                 endereço copiado em "Copiar link"
       formato             'story' (1080×1920) | 'post' (1080×1350, publicação e conversa)
   }
   Botões com data-od-stories='{dados}' ganham o clique sozinhos e
   aparecem (nascem com hidden: sem este arquivo, não há botão morto).
   Textos novos de interface têm reserva em PT (chaves no relatório).
   ════════════════════════════════════════════════════════════════ */
(function () {
  if (window.odCompartilhar) return;

  // ───────── util ─────────
  function tt(k, pt) { var v = window.odt ? window.odt(k) : null; return (v == null || v === k) ? pt : v; }
  function base(p) { return window.odBase ? window.odBase(p) : p; }
  function espera(ms) { return new Promise(function (res) { setTimeout(res, ms); }); }

  // ───────── copiar para a área de transferência ─────────
  // true só quando a cópia acontece de fato
  function copiarAntigo(texto) {
    try {
      var ta = document.createElement('textarea');
      ta.value = texto;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
      // com a janela aberta (modal), o resto da página fica inerte: o campo vai dentro dela
      var dono = (dlg && dlg.open) ? dlg : document.body;
      dono.appendChild(ta);
      ta.focus(); ta.select();
      try { ta.setSelectionRange(0, texto.length); } catch (e) {}
      var ok = !!(document.execCommand && document.execCommand('copy'));
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }
  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarAntigo(texto); });
    }
    return Promise.resolve(copiarAntigo(texto));
  }

  // ───────── botão "Compartilhar" (link) ─────────
  function avisoNoBotao(botao) {
    var lab = botao && botao.querySelector('span');
    if (!lab) return;
    lab.textContent = tt('link_copied', 'Link copiado!');
    clearTimeout(botao._odAviso);
    botao._odAviso = setTimeout(function () { lab.textContent = tt('share', 'Compartilhar'); }, 1800);
  }
  function link(o) {
    o = o || {};
    var url = o.url || location.href.split('#')[0];
    function copiarOuMostrar() {
      copiar(url).then(function (ok) { if (ok) avisoNoBotao(o.botao); else abrir({ modo: 'link', url: url }); });
    }
    if (navigator.share) {
      navigator.share({ title: o.titulo || document.title, url: url }).catch(function (err) {
        if (err && err.name === 'AbortError') return; // a pessoa fechou o menu: nada a fazer
        copiarOuMostrar();
      });
      return;
    }
    copiarOuMostrar();
  }

  // ───────── imagem 1080×1920 (Stories / Status) ─────────
  var W = 1080, H = 1920;
  var SEGURO_TOPO = 250, SEGURO_BASE = H - 250; // a interface dos Stories cobre ~250 px em cima e embaixo
  var MX = 84, LARG = W - 2 * MX;
  var F_TIT = 'Cormorant, Georgia, "Times New Roman", serif';
  var F_TXT = '"EB Garamond", Georgia, "Times New Roman", serif';

  function fontes() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var lista = ['600 100px Cormorant', '600 48px Cormorant', 'italic 400 48px "EB Garamond"', '500 34px "EB Garamond"', '400 30px "EB Garamond"'];
    var todas = Promise.all(lista.map(function (f) { return document.fonts.load(f, 'Oração ÁÉÍÓÚÂÊÔÃÕÇ áéíóúâêôãõç'); })).catch(function () {});
    return Promise.race([todas, espera(3000)]); // não espera para sempre
  }
  // carrega uma imagem da MESMA origem (de outra origem "contaminaria" o canvas)
  function carregar(src) {
    return new Promise(function (res) {
      if (!src) return res(null);
      try { if (new URL(src, location.href).origin !== location.origin) return res(null); } catch (e) { return res(null); }
      var im = new Image(), feito = false;
      function fim(v) { if (!feito) { feito = true; res(v); } }
      im.onload = function () { fim(im.naturalWidth ? im : null); };
      im.onerror = function () { fim(null); };
      im.src = src;
      setTimeout(function () { fim(null); }, 8000);
    });
  }
  function cobrir(c, img) {
    var s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    var w = img.naturalWidth * s, h = img.naturalHeight * s;
    c.drawImage(img, (W - w) / 2, (H - h) * 0.3, w, h);
  }
  // evita palavra sozinha na última linha: passa palavras da penúltima enquanto a última ficar menor
  function semViuva(c, ls) {
    if (ls.length < 2) return ls;
    var a = ls[ls.length - 2].split(' '), b = ls[ls.length - 1].split(' ');
    while (a.length > 1 && c.measureText(a[a.length - 1] + ' ' + b.join(' ')).width <= c.measureText(a.slice(0, -1).join(' ')).width) b.unshift(a.pop());
    ls[ls.length - 2] = a.join(' '); ls[ls.length - 1] = b.join(' ');
    return ls;
  }
  // quebra por palavras, respeitando as quebras de linha do texto
  function quebrar(c, texto, larg) {
    var out = [];
    String(texto || '').split('\n').forEach(function (par) {
      var ls = [], linha = '';
      par.split(/\s+/).filter(Boolean).forEach(function (p) {
        var t = linha ? linha + ' ' + p : p;
        if (!linha || c.measureText(t).width <= larg) linha = t;
        else { ls.push(linha); linha = p; }
      });
      if (linha) ls.push(linha);
      out = out.concat(semViuva(c, ls));
    });
    return out;
  }
  // corta em n linhas; a última ganha "…" (encurtada até caber)
  function limitar(c, linhas, n, larg) {
    if (linhas.length <= n) return linhas;
    var out = linhas.slice(0, n), u = out[n - 1].replace(/[\s,;:.…—-]+$/, '');
    while (u && c.measureText(u + '…').width > larg) u = u.replace(/\s*\S+$/, '');
    out[n - 1] = u + '…';
    return out;
  }
  // texto espaçado (versalete do rótulo); desenha centrado na linha
  function largEsp(c, t, esp) { return c.measureText(t).width + esp * Math.max(0, t.length - 1); }
  function escreverEsp(c, t, cx, y, esp) {
    var x = cx - largEsp(c, t, esp) / 2;
    c.save(); c.textAlign = 'left'; // letra a letra: cada uma começa em x (com 'center' ficariam tortas)
    for (var i = 0; i < t.length; i++) { c.fillText(t[i], x, y); x += c.measureText(t[i]).width + esp; }
    c.restore();
  }
  function quebrarEsp(c, texto, larg, esp) {
    var out = [], linha = '';
    String(texto || '').split(/\s+/).filter(Boolean).forEach(function (p) {
      var t = linha ? linha + ' ' + p : p;
      if (!linha || largEsp(c, t, esp) <= larg) linha = t; else { out.push(linha); linha = p; }
    });
    if (linha) out.push(linha);
    return out;
  }
  function enfeite(c, y) {
    c.save();
    c.strokeStyle = 'rgba(240,194,100,.75)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(W / 2 - 74, y); c.lineTo(W / 2 - 16, y); c.moveTo(W / 2 + 16, y); c.lineTo(W / 2 + 74, y); c.stroke();
    c.fillStyle = '#f0c264';
    c.beginPath(); c.moveTo(W / 2, y - 9); c.lineTo(W / 2 + 9, y); c.lineTo(W / 2, y + 9); c.lineTo(W / 2 - 9, y); c.closePath(); c.fill();
    c.restore();
  }
  function aspas(t) {
    var s = String(t || '').trim().replace(/^["“”«»']+|["“”«»']+$/g, '').trim();
    return s ? '“' + s + '”' : '';
  }

  function desenhar(d, img, logo) {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d');
    c.textBaseline = 'alphabetic';

    // fundo: banner em "cover"; sem banner, um degradê da casa
    if (img) cobrir(c, img);
    else {
      var r = c.createRadialGradient(W / 2, H * 0.28, 40, W / 2, H * 0.4, H * 0.8);
      r.addColorStop(0, '#3a2812'); r.addColorStop(0.55, '#1a1208'); r.addColorStop(1, '#0d0904');
      c.fillStyle = r; c.fillRect(0, 0, W, H);
    }
    // degradê escuro: leve no alto (só para a barra dos Stories) e forte na metade de baixo (texto)
    c.fillStyle = 'rgba(10,7,3,.2)'; c.fillRect(0, 0, W, H);
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(10,7,3,.45)');
    g.addColorStop(0.14, 'rgba(10,7,3,.12)');
    g.addColorStop(0.38, 'rgba(10,7,3,.28)');
    g.addColorStop(0.56, 'rgba(10,7,3,.8)');
    g.addColorStop(0.74, 'rgba(10,7,3,.93)');
    g.addColorStop(1, 'rgba(10,7,3,.97)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // a marca vai no rodapé (no alto ela caía sobre o rosto do santo); o alto fica livre para a imagem

    // bloco de texto: rótulo · título · enfeite · trecho / linhas — ancorado embaixo
    c.textAlign = 'center';
    var itens = [];
    if (d.rotulo) {
      c.font = '500 34px ' + F_TXT;
      itens.push({ tipo: 'rot', fonte: c.font, linhas: limitar(c, quebrarEsp(c, String(d.rotulo).toUpperCase(), LARG, 7), 2, LARG), lh: 50, cor: '#f0c264', apos: 26 });
    }
    // título: o maior tamanho (116→56) que caiba em até 4 linhas e ~500 px;
    // com 3 ou 4 linhas, no máximo 96 px (sobra lugar para o trecho)
    var tit = null;
    for (var tam = 116; tam >= 56; tam -= 4) {
      c.font = '600 ' + tam + 'px ' + F_TIT;
      var l = quebrar(c, d.titulo || '', LARG);
      if (l.length <= 4 && l.length * tam * 1.06 <= 500 && (l.length <= 2 || tam <= 96)) { tit = { linhas: l, tam: tam }; break; }
    }
    if (!tit) { c.font = '600 56px ' + F_TIT; tit = { linhas: limitar(c, quebrar(c, d.titulo || '', LARG), 5, LARG), tam: 56 }; }
    itens.push({ tipo: 'tit', fonte: '600 ' + tit.tam + 'px ' + F_TIT, linhas: tit.linhas, lh: Math.round(tit.tam * 1.06), cor: '#fbf2dd', apos: 0 });
    var extras = (d.linhas || []).filter(Boolean);
    var trecho = d.citacao ? aspas(d.trecho) : String(d.trecho || '').trim();
    if (extras.length || trecho) itens.push({ tipo: 'enf', lh: 0, alt: 74 });
    if (extras.length) {
      c.font = 'italic 400 52px ' + F_TXT;
      var le = [];
      extras.forEach(function (t) { le = le.concat(quebrar(c, t, LARG)); });
      itens.push({ tipo: 'txt', fonte: c.font, linhas: limitar(c, le, 4, LARG), lh: 70, cor: '#f6ecd6', apos: trecho ? 24 : 0 });
    }
    var topoMin = SEGURO_TOPO + 40; // abaixo da faixa coberta pelos Stories
    var fimTexto = SEGURO_BASE - 170; // acima do rodapé (marca e endereço)
    if (trecho) {
      c.font = 'italic 400 46px ' + F_TXT;
      var lt = quebrar(c, trecho, LARG);
      // quantas linhas cabem entre a marca e o rodapé
      var usado = itens.reduce(function (s, it) { return s + (it.alt || it.linhas.length * it.lh + (it.apos || 0)); }, 0);
      var cabem = Math.max(2, Math.min(7, Math.floor((fimTexto - topoMin - usado) / 62)));
      itens.push({ tipo: 'txt', fonte: c.font, linhas: limitar(c, lt, cabem, LARG), lh: 62, cor: '#eadfc8', apos: 0 });
    }
    var total = itens.reduce(function (s, it) { return s + (it.alt || it.linhas.length * it.lh + (it.apos || 0)); }, 0);
    var y = Math.max(topoMin, fimTexto - total);
    c.shadowColor = 'rgba(0,0,0,.6)';
    itens.forEach(function (it) {
      if (it.tipo === 'enf') { enfeite(c, y + it.alt / 2); y += it.alt; return; }
      c.font = it.fonte; c.fillStyle = it.cor; c.shadowBlur = it.tipo === 'tit' ? 22 : 12;
      it.linhas.forEach(function (ln) {
        y += it.lh;
        var base = y - Math.round(it.lh * 0.24);
        if (it.tipo === 'rot') escreverEsp(c, ln, W / 2, base, 7); else c.fillText(ln, W / 2, base);
      });
      y += it.apos || 0;
    });
    c.shadowBlur = 0;

    // rodapé: a marca (logo + nome) e, embaixo, só o domínio — o caminho da página vai no link, não na imagem
    c.textAlign = 'left';
    c.font = '600 50px ' + F_TIT;
    var nome = 'Oratório Digital', tl = 58, gap = 16;
    var lw = c.measureText(nome).width, gw = (logo ? tl + gap : 0) + lw, gx = (W - gw) / 2, gy = SEGURO_BASE - 128;
    if (logo) c.drawImage(logo, gx, gy, tl, tl);
    c.fillStyle = '#f3e7cf';
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 14;
    c.fillText(nome, gx + (logo ? tl + gap : 0), gy + 44);
    c.shadowBlur = 0;
    c.textAlign = 'center';
    c.font = '500 36px ' + F_TXT; c.fillStyle = '#f0c264';
    escreverEsp(c, d.dominio || 'oratoriodigital.com', W / 2, SEGURO_BASE - 26, 2);
    return cv;
  }
  // ───────── imagem do site inteiro (tipo 'site') ─────────
  var FORMATOS = {
    story: { h: 1920, topo: SEGURO_TOPO + 10, base: SEGURO_BASE, logo: 150, nome: 92, tag: 40, frase: 58, num: 124, rot: 32 },
    post:  { h: 1350, topo: 84, base: 1350 - 70, logo: 112, nome: 78, tag: 36, frase: 50, num: 104, rot: 30 }
  };
  function cobrirEm(c, img, w, h) {
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var iw = img.naturalWidth * s, ih = img.naturalHeight * s;
    c.drawImage(img, (w - iw) / 2, (h - ih) * 0.3, iw, ih);
  }
  function fmtNum(n) { try { return Number(n).toLocaleString('pt-BR'); } catch (e) { return String(n); } }
  function desenharSite(d, fundo, logo) {
    var F = FORMATOS[d.formato] || FORMATOS.story, h = F.h;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = h;
    var c = cv.getContext('2d');
    c.textBaseline = 'alphabetic';
    if (fundo) cobrirEm(c, fundo, W, h);
    else { c.fillStyle = '#1a1208'; c.fillRect(0, 0, W, h); }
    // véu escuro, um pouco mais forte embaixo (números e endereço)
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(10,7,3,.5)'); g.addColorStop(0.45, 'rgba(10,7,3,.62)'); g.addColorStop(1, 'rgba(10,7,3,.86)');
    c.fillStyle = g; c.fillRect(0, 0, W, h);

    // 1) marca no alto: logo, nome e a frase do site
    var y = F.topo;
    c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,.55)';
    if (logo) { c.shadowBlur = 24; c.drawImage(logo, (W - F.logo) / 2, y, F.logo, F.logo); y += F.logo + 18; }
    c.shadowBlur = 18; c.font = '600 ' + F.nome + 'px ' + F_TIT; c.fillStyle = '#fbf2dd';
    y += F.nome * 0.86; c.fillText('Oratório Digital', W / 2, y);
    if (d.tagline) {
      c.shadowBlur = 10; c.font = 'italic 400 ' + F.tag + 'px ' + F_TXT; c.fillStyle = '#e6d9bd';
      var tl = limitar(c, quebrar(c, d.tagline, LARG - 40), 2, LARG - 40);
      y += 14;
      tl.forEach(function (ln) { y += F.tag * 1.3; c.fillText(ln, W / 2, y - F.tag * 0.3); });
    }
    var fimMarca = y;

    // 2) rodapé: enfeite e o domínio
    c.font = '600 46px ' + F_TIT;
    var yDom = F.base - 24, yEnf = yDom - 86;

    // 3) meio: frase (com autor) e números, distribuídos no espaço que sobra
    var frase = (d.frases || [])[d.fraseIdx || 0] || null;
    var lf = [], fTam = F.frase;
    if (frase) {
      for (; fTam >= 38; fTam -= 4) {
        c.font = 'italic 400 ' + fTam + 'px ' + F_TXT;
        lf = quebrar(c, aspas(frase.texto), LARG);
        if (lf.length <= 5) break;
      }
      lf = limitar(c, lf, 6, LARG);
    }
    var altFrase = frase ? lf.length * Math.round(fTam * 1.34) + (frase.autor ? 64 : 0) : 0;
    var nums = (d.numeros || []).filter(function (x) { return x && x.n != null && x.n !== ''; });
    var col = nums.length ? LARG / nums.length : LARG;
    // números grandes: o maior tamanho em que todos cabem na coluna
    var numTam = F.num;
    for (; numTam > 56; numTam -= 4) {
      c.font = '600 ' + numTam + 'px ' + F_TIT;
      if (nums.every(function (x) { return c.measureText(fmtNum(x.n)).width <= col - 28; })) break;
    }
    c.font = '500 ' + F.rot + 'px ' + F_TXT;
    var rots = nums.map(function (x) { return limitar(c, quebrar(c, x.rotulo, col - 24), 2, col - 24); });
    var maxRot = rots.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    var altNum = nums.length ? numTam + 18 + maxRot * Math.round(F.rot * 1.3) : 0;
    var livre = (yEnf - 40) - fimMarca - altFrase - altNum;
    var gap = Math.max(36, livre / 3);
    y = fimMarca + gap;

    if (frase) {
      c.shadowBlur = 12; c.font = 'italic 400 ' + fTam + 'px ' + F_TXT; c.fillStyle = '#f6ecd6';
      lf.forEach(function (ln) { y += Math.round(fTam * 1.34); c.fillText(ln, W / 2, y - Math.round(fTam * 0.32)); });
      if (frase.autor) { c.font = '500 30px ' + F_TXT; c.fillStyle = '#f0c264'; y += 64; escreverEsp(c, String(frase.autor).toUpperCase(), W / 2, y - 14, 4); }
      y += gap;
    }
    if (nums.length) {
      c.shadowBlur = 16;
      nums.forEach(function (x, i) {
        var cx = MX + col * i + col / 2;
        c.font = '600 ' + numTam + 'px ' + F_TIT; c.fillStyle = '#f0c264';
        c.fillText(fmtNum(x.n), cx, y + numTam * 0.8);
        c.font = '500 ' + F.rot + 'px ' + F_TXT; c.fillStyle = '#eadfc8';
        rots[i].forEach(function (ln, k) { c.fillText(ln, cx, y + numTam + 18 + (k + 1) * Math.round(F.rot * 1.3) - Math.round(F.rot * 0.3)); });
        if (i > 0) { c.save(); c.shadowBlur = 0; c.strokeStyle = 'rgba(240,194,100,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(MX + col * i, y + 10); c.lineTo(MX + col * i, y + altNum - 6); c.stroke(); c.restore(); }
      });
    }
    c.shadowBlur = 0;
    enfeite(c, yEnf);
    c.font = '600 50px ' + F_TIT; c.fillStyle = '#f0c264';
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 12;
    escreverEsp(c, d.dominio || 'oratoriodigital.com', W / 2, yDom, 2);
    c.shadowBlur = 0;
    return cv;
  }
  function jpeg(cv) {
    function blob(q) {
      return new Promise(function (res) {
        if (cv.toBlob) cv.toBlob(function (b) { res(b); }, 'image/jpeg', q);
        else {
          var u = cv.toDataURL('image/jpeg', q), bin = atob(u.split(',')[1]), a = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
          res(new Blob([a], { type: 'image/jpeg' }));
        }
      });
    }
    // qualidade ~0,9; se passar de 1,5 MB, baixa um pouco
    return blob(0.9).then(function (b) { return (b && b.size > 1500000) ? blob(0.8) : b; })
      .then(function (b) { return (b && b.size > 1500000) ? blob(0.7) : b; });
  }
  function imagem(d) {
    d = d || {};
    if (d.tipo === 'site') {
      return Promise.all([fontes(), carregar(d.banner), carregar(base('/logo-340.webp'))])
        .then(function (r) { return jpeg(desenharSite(d, r[1], r[2])); })
        .catch(function () { return null; });
    }
    return Promise.all([fontes(), carregar(d.banner), carregar(base('/logo-128.webp'))])
      .then(function (r) { return r[1] ? r : carregar(d.bannerReserva).then(function (im) { r[1] = im; return r; }); })
      .then(function (r) { return jpeg(desenhar(d, r[1], r[2])); })
      .catch(function () { return null; }); // canvas indisponível ou contaminado: sem imagem
  }

  // ───────── janela "Stories e Status" ─────────
  var dlg = null, ui = {}, atual = null, objUrl = '', arquivo = null, voltarFoco = null;
  var ICONE = '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
  function criar() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'odc';
    dlg.setAttribute('aria-labelledby', 'odcTitulo');
    dlg.innerHTML =
      '<div class="odc-card">' +
        '<button type="button" class="odc-fechar">×</button>' +
        '<h2 id="odcTitulo" class="odc-titulo"></h2>' +
        '<div class="odc-opcoes" hidden><div class="odc-formatos" role="group">' +
          '<button type="button" class="rtool" data-formato="story" aria-pressed="true"></button>' +
          '<button type="button" class="rtool" data-formato="post" aria-pressed="false"></button>' +
        '</div><button type="button" class="rtool odc-frase"></button></div>' +
        '<div class="odc-previa"><img alt="" hidden /><p class="odc-espera"></p></div>' +
        '<div class="odc-acoes">' +
          '<button type="button" class="btn btn-primary odc-share" hidden></button>' +
          '<button type="button" class="btn odc-copiar"></button>' +
          '<a class="btn odc-baixar" role="button" aria-disabled="true"></a>' +
        '</div>' +
        '<p class="odc-status" role="status" aria-live="polite"></p>' +
        '<div class="odc-manual" hidden><label><span class="odc-manual-rot"></span><input type="text" readonly /></label></div>' +
        '<p class="odc-dica"></p>' +
      '</div>';
    document.body.appendChild(dlg);
    ui = {
      fechar: dlg.querySelector('.odc-fechar'), titulo: dlg.querySelector('.odc-titulo'),
      previa: dlg.querySelector('.odc-previa'), img: dlg.querySelector('.odc-previa img'), espera: dlg.querySelector('.odc-espera'),
      acoes: dlg.querySelector('.odc-acoes'), share: dlg.querySelector('.odc-share'), copiar: dlg.querySelector('.odc-copiar'), baixar: dlg.querySelector('.odc-baixar'),
      status: dlg.querySelector('.odc-status'), manual: dlg.querySelector('.odc-manual'), manualRot: dlg.querySelector('.odc-manual-rot'),
      input: dlg.querySelector('.odc-manual input'), dica: dlg.querySelector('.odc-dica'),
      opcoes: dlg.querySelector('.odc-opcoes'), formatos: dlg.querySelector('.odc-formatos'), frase: dlg.querySelector('.odc-frase')
    };
    ui.formatos.addEventListener('click', function (e) {
      var b = e.target.closest('[data-formato]');
      if (!b || !atual || atual.formato === b.dataset.formato) return;
      atual.formato = b.dataset.formato; gerar();
    });
    ui.frase.addEventListener('click', function () {
      if (!atual || !(atual.frases && atual.frases.length > 1)) return;
      atual.fraseIdx = ((atual.fraseIdx || 0) + 1) % atual.frases.length; gerar();
    });
    ui.fechar.addEventListener('click', fechar);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) fechar(); }); // toque fora do cartão
    dlg.addEventListener('close', function () { if (!dlg.open) limpar(); }); // reaberta logo depois: não limpa
    ui.share.addEventListener('click', compartilharArquivo);
    ui.copiar.addEventListener('click', function () {
      var url = urlAtual();
      copiar(url).then(function (ok) {
        if (ok) { ui.manual.hidden = true; avisar(tt('link_copied', 'Link copiado!')); }
        else mostrarManual(url);
      });
    });
    ui.baixar.addEventListener('click', function (e) { if (!arquivo) e.preventDefault(); });
    ui.input.addEventListener('focus', function () { ui.input.select(); });
  }
  function rotular() {
    if (!dlg) return;
    var soLink = atual && atual.modo === 'link';
    ui.fechar.setAttribute('aria-label', tt('close', 'Fechar'));
    var site = atual && atual.tipo === 'site';
    ui.titulo.textContent = soLink ? tt('share', 'Compartilhar') : site ? tt('share_site', 'Compartilhar o Oratório') : tt('stories_title', 'Stories e Status');
    ui.formatos.setAttribute('aria-label', tt('share_format', 'Formato da imagem'));
    ui.formatos.querySelector('[data-formato="story"]').textContent = tt('fmt_story', 'Story e Status');
    ui.formatos.querySelector('[data-formato="post"]').textContent = tt('fmt_post', 'Publicação e conversa');
    ui.frase.textContent = tt('other_quote', 'Outra frase');
    ui.share.textContent = tt('stories_share', 'Compartilhar imagem');
    ui.copiar.textContent = tt('copy_link', 'Copiar link');
    ui.baixar.textContent = tt('download_image', 'Baixar imagem');
    ui.manualRot.textContent = tt('copy_manual', 'Copie o endereço:');
    ui.dica.textContent = site
      ? tt('share_site_hint', 'Instagram: Story no formato vertical; publicação no outro formato. WhatsApp: escolha uma conversa (o endereço vai junto na mensagem) ou o Status.')
      : tt('stories_hint', 'Instagram: escolha Story, toque no adesivo Link e cole o endereço. WhatsApp: escolha Status.');
    ui.img.alt = tt('stories_preview', 'Prévia da imagem para Stories e Status');
    if (!arquivo && !soLink) ui.espera.textContent = atual && atual.falhou ? tt('image_failed', 'Não foi possível gerar a imagem.') : tt('preparing_image', 'Preparando a imagem…');
  }
  function urlAtual() {
    if (atual && atual.url) return atual.url;
    if (atual && atual.caminho) return location.origin + String(atual.caminho).replace(/\/?$/, '/');
    return location.href.split('#')[0];
  }
  function avisar(t) { ui.status.textContent = ''; setTimeout(function () { ui.status.textContent = t; }, 30); }
  function mostrarManual(url) {
    ui.manual.hidden = false;
    ui.input.value = url;
    ui.input.focus(); ui.input.select();
    try { ui.input.setSelectionRange(0, url.length); } catch (e) {}
  }
  function compartilharArquivo() {
    if (!arquivo || !navigator.share) return;
    var dados = { files: [arquivo] };
    // legenda com o endereço (vai junto na conversa do WhatsApp; o Instagram ignora)
    if (atual && atual.texto) {
      var comTexto = { files: [arquivo], text: atual.texto };
      try { if (!navigator.canShare || navigator.canShare(comTexto)) dados = comTexto; } catch (e) {}
    }
    navigator.share(dados).catch(function (err) {
      if (err && err.name === 'AbortError') return; // cancelou
      avisar(tt('share_failed', 'Não foi possível compartilhar. Use “Baixar imagem”.'));
      ui.baixar.classList.add('btn-primary');
    });
  }
  function limpar() {
    if (objUrl) { try { URL.revokeObjectURL(objUrl); } catch (e) {} }
    objUrl = ''; arquivo = null; atual = null;
    if (voltarFoco && voltarFoco.focus) { try { voltarFoco.focus(); } catch (e) {} }
    voltarFoco = null;
  }
  function fechar() { if (dlg && dlg.open) dlg.close(); }
  function abrir(d) {
    criar();
    if (dlg.open) dlg.close();
    atual = d || {};
    var soLink = atual.modo === 'link';
    voltarFoco = document.activeElement;
    // estado inicial
    arquivo = null;
    ui.previa.hidden = soLink; ui.acoes.hidden = soLink; ui.dica.hidden = soLink;
    ui.img.hidden = true; ui.img.removeAttribute('src');
    ui.espera.hidden = false;
    ui.share.hidden = true; ui.share.disabled = true;
    ui.baixar.classList.add('btn-primary'); ui.baixar.removeAttribute('href'); ui.baixar.setAttribute('aria-disabled', 'true');
    ui.manual.hidden = true; ui.status.textContent = ''; ui.opcoes.hidden = true;
    rotular();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    if (soLink) { mostrarManual(atual.url || location.href.split('#')[0]); return; }
    var site = atual.tipo === 'site';
    ui.opcoes.hidden = !site;
    if (site) {
      if (!atual.formato) atual.formato = 'story';
      if (atual.fraseIdx == null) atual.fraseIdx = Math.floor(Math.random() * Math.max(1, (atual.frases || []).length));
      ui.frase.hidden = !(atual.frases && atual.frases.length > 1);
      // 3º número: o total de orações rezadas, lido agora (sem resposta em 2,5 s: o último conhecido ou a reserva)
      var pedidoTotal = atual;
      var C = window.odContador;
      var leitura = (C && C.ativo) ? C.ler([C.chaves.total]) : Promise.resolve(null);
      Promise.race([leitura, espera(2500).then(function () { return null; })]).then(function (m) {
        if (pedidoTotal !== atual) return;
        var t = m && C ? m[C.chaves.total] : null;
        if (!(t > 0)) { try { t = Number(localStorage.getItem('od-total-cache')) || null; } catch (e) {} }
        if (!(t > 0)) t = Number(atual.reservaTotal) || null;
        atual.numeros = (atual.numerosBase || atual.numeros || []).slice();
        if (!atual.numerosBase) atual.numerosBase = atual.numeros.slice();
        if (t > 0) atual.numeros.push({ n: t, rotulo: atual.totalRotulo || 'orações rezadas' });
        gerar();
      });
      return;
    }
    gerar();
  }
  var geracao = 0;
  function gerar() {
    if (!atual) return;
    var site = atual.tipo === 'site';
    if (site) {
      ui.formatos.querySelectorAll('[data-formato]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.formato === atual.formato)); });
      ui.previa.classList.toggle('odc-previa-post', atual.formato === 'post');
    } else ui.previa.classList.remove('odc-previa-post');
    if (objUrl) { try { URL.revokeObjectURL(objUrl); } catch (e) {} objUrl = ''; }
    arquivo = null; ui.img.hidden = true; ui.espera.hidden = false; atual.falhou = false;
    ui.share.hidden = true; ui.share.disabled = true;
    ui.baixar.removeAttribute('href'); ui.baixar.setAttribute('aria-disabled', 'true');
    rotular();
    var minha = ++geracao, pedido = atual;
    imagem(atual).then(function (b) {
      if (pedido !== atual || minha !== geracao) return; // fechada, reaberta ou trocada de formato/frase
      if (!b) { atual.falhou = true; rotular(); return; }
      var nome = String(atual.arquivo || 'oratorio-digital').replace(/[^a-z0-9-]+/gi, '-') + (site && atual.formato === 'post' ? '-post' : '') + '.jpg';
      try { arquivo = new File([b], nome, { type: 'image/jpeg' }); } catch (e) { arquivo = b; arquivo.name = nome; }
      objUrl = URL.createObjectURL(b);
      ui.img.src = objUrl; ui.img.hidden = false; ui.espera.hidden = true;
      ui.baixar.href = objUrl; ui.baixar.setAttribute('download', nome); ui.baixar.removeAttribute('aria-disabled');
      // com compartilhamento de arquivos (celular), ele é a ação principal; senão, "Baixar"
      var pode = false;
      try { pode = !!(navigator.canShare && navigator.share && navigator.canShare({ files: [arquivo] })); } catch (e) {}
      ui.share.hidden = !pode; ui.share.disabled = !pode;
      ui.baixar.classList.toggle('btn-primary', !pode);
    });
  }

  // botões "Stories e Status" declarados no HTML
  function rotularBotoes() {
    document.querySelectorAll('[data-od-stories]').forEach(function (b) {
      var s = b.querySelector('span'); if (!s) return;
      var k = b.getAttribute('data-od-rotulo'); // outro rótulo (ex.: share_site)
      s.textContent = k ? tt(k, s.textContent) : tt('stories_btn', 'Stories e Status');
    });
  }
  function ligar() {
    document.querySelectorAll('[data-od-stories]').forEach(function (b) {
      if (b._odLigado) return;
      b._odLigado = true;
      if (!b.querySelector('svg')) b.insertAdjacentHTML('afterbegin', ICONE);
      b.hidden = false;
      b.addEventListener('click', function () {
        var d = {};
        try { d = JSON.parse(b.getAttribute('data-od-stories') || '{}'); } catch (e) {}
        if (d.rotuloChave) d.rotulo = tt(d.rotuloChave, d.rotulo || '');
        abrir(d);
      });
    });
    rotularBotoes();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar); else ligar();
  document.addEventListener('od:lang', function () { rotularBotoes(); rotular(); });

  window.odCompartilhar = { link: link, copiar: copiar, imagem: imagem, abrir: abrir, fechar: fechar };
})();
