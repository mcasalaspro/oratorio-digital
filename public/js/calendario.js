/* ════════════════════════════════════════════════════════════════
   Oratório Digital — calendário litúrgico (uma regra só para o site inteiro)

   Datas fixas no formato 'MM-DD' (ex.: '10-12') e festas MÓVEIS por nome:
     pascoa, cinzas, ramos, quinta-santa, sexta-santa, sabado-santo,
     divina-misericordia, ascensao, pentecostes, santissima-trindade,
     corpus-christi, sagrado-coracao, imaculado-coracao, cristo-rei,
     advento (1º domingo), sagrada-familia, epifania, batismo-do-senhor
   Use esses nomes no campo liturgicalFeast das orações (ex.: liturgicalFeast: "pentecostes").

   Regras do Brasil (CNBB): Epifania no domingo entre 2 e 8/1; Batismo do Senhor no
   domingo seguinte (ou na segunda, se a Epifania cair em 7 ou 8/1); Ascensão no
   domingo (Páscoa + 42); São Pedro e São Paulo no domingo entre 28/6 e 4/7;
   Assunção no domingo entre 15 e 21/8; Todos os Santos no domingo seguinte
   (fica no dia 1º se for domingo ou sábado, porque 2/11 é Finados).

   Todas as contas usam datas de calendário (meia-noite local) e diferenças em
   dias pelo UTC: o horário de verão de qualquer país não desloca nada.

   No navegador: window.odCalendario. No Node: import do arquivo e globalThis.odCalendario
   (ou require, num projeto sem "type": "module").
     data(codigo, ano)        → Date da festa no ano (data universal) ou null
     noBrasil(codigo, ano)    → Date se no Brasil a celebração muda de dia; senão null
     nomeBrasil(codigo)       → nome curto dessa solenidade ('Assunção', 'Todos os Santos'…) ou ''
     proxima(codigo, hoje)    → próxima ocorrência a partir de hoje (hoje conta)
     dias(a, b)               → b − a, em dias de calendário
     somarDias(d, n), hoje(), pascoa(ano), advento(ano), batismo(ano)
     tempo(dia)               → { chave, cor, inicio, fim, proximo: { chave, inicio } }
                                chave: advento | natal | comum | quaresma | triduo | pascoa | pentecostes
     valido(codigo)           → o código é uma data 'MM-DD' válida ou um nome conhecido?
   ════════════════════════════════════════════════════════════════ */
(function (raiz, fabrica) {
  var api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.odCalendario = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  function dia(ano, mes, d) { return new Date(ano, mes, d); } // mes: 0–11, meia-noite local
  function meiaNoite(dt) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
  function hoje() { return meiaNoite(new Date()); }
  function somarDias(dt, n) { return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() + n); }
  function utc(dt) { return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()); }
  function dias(a, b) { return Math.round((utc(b) - utc(a)) / 864e5); }
  function mesmoDia(a, b) { return dias(a, b) === 0; }
  // domingo no intervalo [ini, ini + 6]
  function domingoAPartirDe(dt) { return somarDias(dt, (7 - dt.getDay()) % 7); }

  // Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano)
  function pascoa(ano) {
    var a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        mes = Math.floor((h + l - 7 * m + 114) / 31), di = ((h + l - 7 * m + 114) % 31) + 1;
    return dia(ano, mes - 1, di);
  }
  // 1º domingo do Advento: domingo entre 27/11 e 3/12
  function advento(ano) { return domingoAPartirDe(dia(ano, 10, 27)); }
  // Epifania no Brasil: domingo entre 2 e 8 de janeiro
  function epifaniaBrasil(ano) { return domingoAPartirDe(dia(ano, 0, 2)); }
  // Batismo do Senhor no Brasil: domingo depois da Epifania; se ela cair em 7 ou 8/1, na segunda seguinte
  function batismo(ano) {
    var ep = epifaniaBrasil(ano);
    return ep.getDate() >= 7 ? somarDias(ep, 1) : somarDias(ep, 7);
  }
  // Sagrada Família: domingo entre 26 e 31/12; se o Natal for domingo, 30/12
  function sagradaFamilia(ano) {
    var natal = dia(ano, 11, 25);
    return natal.getDay() === 0 ? dia(ano, 11, 30) : domingoAPartirDe(dia(ano, 11, 26));
  }

  // festas móveis: data universal
  var MOVEIS = {
    'pascoa': function (a) { return pascoa(a); },
    'cinzas': function (a) { return somarDias(pascoa(a), -46); },
    'ramos': function (a) { return somarDias(pascoa(a), -7); },
    'quinta-santa': function (a) { return somarDias(pascoa(a), -3); },
    'sexta-santa': function (a) { return somarDias(pascoa(a), -2); },
    'sabado-santo': function (a) { return somarDias(pascoa(a), -1); },
    'divina-misericordia': function (a) { return somarDias(pascoa(a), 7); },
    'ascensao': function (a) { return somarDias(pascoa(a), 39); },
    'pentecostes': function (a) { return somarDias(pascoa(a), 49); },
    'santissima-trindade': function (a) { return somarDias(pascoa(a), 56); },
    'corpus-christi': function (a) { return somarDias(pascoa(a), 60); },
    'sagrado-coracao': function (a) { return somarDias(pascoa(a), 68); },
    'imaculado-coracao': function (a) { return somarDias(pascoa(a), 69); },
    'cristo-rei': function (a) { return somarDias(advento(a), -7); },
    'advento': function (a) { return advento(a); },
    'sagrada-familia': function (a) { return sagradaFamilia(a); },
    'epifania': function (a) { return dia(a, 0, 6); },
    'batismo-do-senhor': function (a) { return batismo(a); }
  };
  var CODIGOS = Object.keys(MOVEIS);

  function fixa(codigo) {
    var m = /^(\d{2})-(\d{2})$/.exec(String(codigo || ''));
    if (!m) return null;
    var mes = +m[1], d = +m[2];
    if (mes < 1 || mes > 12 || d < 1 || d > 31) return null;
    return { mes: mes - 1, d: d };
  }
  function valido(codigo) {
    var f = fixa(codigo);
    if (f) return dia(2024, f.mes, f.d).getMonth() === f.mes; // 2024: aceita 29/02
    return Object.prototype.hasOwnProperty.call(MOVEIS, String(codigo || ''));
  }
  // data universal da festa no ano (29/02 em ano comum vira 28/02)
  function data(codigo, ano) {
    var f = fixa(codigo);
    if (f) {
      var dt = dia(ano, f.mes, f.d);
      return dt.getMonth() === f.mes ? dt : dia(ano, f.mes + 1, 0);
    }
    var fn = MOVEIS[String(codigo || '')];
    return fn ? fn(ano) : null;
  }
  // no Brasil a celebração muda de dia? (só para avisar; as novenas seguem a data universal)
  function noBrasil(codigo, ano) {
    var c = String(codigo || ''), dt = null;
    if (c === '01-06' || c === 'epifania') dt = epifaniaBrasil(ano);
    else if (c === 'ascensao') dt = somarDias(pascoa(ano), 42);
    else if (c === '06-29') dt = domingoAPartirDe(dia(ano, 5, 28));
    else if (c === '08-15') dt = domingoAPartirDe(dia(ano, 7, 15));
    else if (c === '11-01') {
      var t = dia(ano, 10, 1), w = t.getDay();
      dt = (w === 0 || w === 6) ? t : domingoAPartirDe(dia(ano, 10, 2));
    }
    if (!dt) return null;
    var u = data(c, ano);
    return u && mesmoDia(u, dt) ? null : dt;
  }
  // nome curto da solenidade que no Brasil muda de dia, para o aviso
  // "Assunção: no Brasil, celebrada no domingo 20/08" (vale também para a Ladainha ligada a ela)
  var NOMES_BRASIL = { '01-06': 'Epifania', 'epifania': 'Epifania', 'ascensao': 'Ascensão',
    '06-29': 'São Pedro e São Paulo', '08-15': 'Assunção', '11-01': 'Todos os Santos' };
  function nomeBrasil(codigo) { return NOMES_BRASIL[String(codigo || '')] || ''; }
  // próxima ocorrência a partir de hoje (o próprio dia da festa conta como "hoje")
  function proxima(codigo, ref) {
    var h = meiaNoite(ref || new Date());
    for (var a = h.getFullYear() - 1; a <= h.getFullYear() + 1; a++) {
      var dt = data(codigo, a);
      if (dt && dias(h, dt) >= 0) return dt;
    }
    return null;
  }

  // tempo litúrgico do dia (Brasil)
  var CORES = { advento: 'roxo', natal: 'branco', comum: 'verde', quaresma: 'roxo', triduo: 'vermelho', pascoa: 'branco', pentecostes: 'vermelho' };
  function trechos(ano) {
    var E = pascoa(ano);
    return [
      { chave: 'natal', inicio: dia(ano - 1, 11, 25) },
      { chave: 'comum', inicio: somarDias(batismo(ano), 1) },
      { chave: 'quaresma', inicio: somarDias(E, -46) },
      { chave: 'triduo', inicio: somarDias(E, -3) },
      { chave: 'pascoa', inicio: E },
      { chave: 'pentecostes', inicio: somarDias(E, 49) },
      { chave: 'comum', inicio: somarDias(E, 50) },
      { chave: 'advento', inicio: advento(ano) },
      { chave: 'natal', inicio: dia(ano, 11, 25) },
      { chave: 'comum', inicio: somarDias(batismo(ano + 1), 1) }
    ];
  }
  function tempo(ref) {
    var h = meiaNoite(ref || new Date());
    var t = trechos(h.getFullYear());
    for (var i = t.length - 2; i >= 0; i--) {
      if (dias(t[i].inicio, h) >= 0) {
        var prox = t[i + 1];
        return {
          chave: t[i].chave, cor: CORES[t[i].chave], inicio: t[i].inicio,
          fim: somarDias(prox.inicio, -1),
          proximo: { chave: prox.chave, inicio: prox.inicio, cor: CORES[prox.chave] }
        };
      }
    }
    return null;
  }

  return {
    CODIGOS: CODIGOS, valido: valido, data: data, noBrasil: noBrasil, nomeBrasil: nomeBrasil, proxima: proxima,
    dias: dias, somarDias: somarDias, hoje: hoje, pascoa: pascoa, advento: advento,
    batismo: batismo, epifaniaBrasil: epifaniaBrasil, tempo: tempo
  };
});
