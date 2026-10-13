// ════════════════════════════════════════════════════════════════
//  VALIDADOR DO CONTEÚDO — confere todos os .md de src/content e aponta
//  ARQUIVO e LINHA em português.
//
//   npm run validar
//       lista os problemas; termina com erro se houver algum ERRO.
//   node scripts/validar-conteudo.mjs --quarentena      (GitHub Actions)
//       tira do site os arquivos com ERRO (vão para a pasta quarentena/),
//       grava .relatorio/conteudo.json e termina sem erro: o resto do site
//       é publicado e, no fim, a publicação avisa o dono por e-mail.
//
//  ERRO  = quebraria a publicação ou a página (o arquivo fica fora do site
//          até ser corrigido).
//  AVISO = o site publica normalmente; o aviso aparece no relatório
//          /ferramentas/relatorio/ (ex.: imagem que falta usa a padrão).
//
//  Sem dependência nova: lê o cabeçalho com a MESMA função do Astro e as
//  datas de festa com o calendário do site (public/js/calendario.js).
//  Campos conferidos: os de src/content.config.ts (mantenha os dois iguais).
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = 'src/content';
const TIPOS = ['oracao', 'novena', 'terco', 'dezena', 'rosario', 'ladainha', 'hino', 'devocional', 'liturgia', 'bizantina', 'outro'];
const CORES = ['advento', 'ordinario', 'festa', 'martir'];
const CATEGORIAS_BIO = ['martir', 'doutor', 'virgem', 'bispo', 'papa', 'apostolo', 'anjo', 'diacono', 'religioso', 'fundador', 'profeta', 'vidente', 'realeza', 'maria'];

// campos de cada coleção (igual a src/content.config.ts) — grave: true = tipo errado vira ERRO
const T = (tipo, extra = {}) => ({ tipo, ...extra });
const COLECOES = {
  prayers: {
    nome: 'oração', imagens: 'saints', obrigatorios: ['title', 'type'],
    campos: {
      title: T('texto', { grave: true }), type: T('enum', { valores: TIPOS, grave: true }),
      totalDays: T('inteiro', { min: 1, exemplo: 9 }), language: T('texto'), saint: T('texto'), image: T('texto'),
      thumbnail: T('texto'), parallaxImage: T('texto'), tags: T('lista'), description: T('texto'),
      featured: T('booleano'), featuredOrder: T('numero'), liturgicalFeast: T('festa', { grave: true }),
      liturgicalColor: T('enum', { valores: CORES }), novenaSuggestedStart: T('inteiro', { exemplo: -9 }), destaque: T('texto'),
    },
  },
  biografias: {
    nome: 'biografia', imagens: 'biografias', obrigatorios: [],
    campos: {
      name: T('texto'), title: T('texto'), feast: T('mmdd', { grave: true }), born: T('texto'), died: T('texto'),
      patronage: T('texto'), image: T('texto'), tags: T('lista'), summary: T('texto'), language: T('texto'),
      featured: T('booleano'), order: T('numero'), relatedPrayers: T('lista'), categorias: T('categorias'), frase: T('texto'),
    },
  },
  textos: {
    nome: 'texto', obrigatorios: ['title'],
    campos: { title: T('texto', { grave: true }), description: T('texto'), summary: T('texto'), order: T('numero'), icon: T('texto') },
  },
  cantos: {
    nome: 'canto', obrigatorios: ['title'],
    campos: {
      title: T('texto', { grave: true }), description: T('texto'), summary: T('texto'), categoria: T('texto'),
      order: T('numero'), icon: T('texto'), tags: T('lista'),
    },
  },
  liturgia: {
    nome: 'liturgia', obrigatorios: [], subpastas: true, nomeArquivo: /^(\d{4})(\d{2})(\d{2})_Liturgia\.md$/,
    campos: {
      title: T('texto'), date: T('mmdd'), rank: T('texto'), semana: T('texto'), cor: T('texto'), leituras: T('lista'),
      description: T('texto'), summary: T('texto'), tags: T('lista'),
    },
  },
};
const NOME_OK = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/;
const DIA_RE = /^##\s+(dia|day)\s+\d+/i; // o mesmo critério da página (src/scripts/oracao/preparar.ts)

/** Confere o conteúdo. Devolve { arquivos, colecoes, erros, avisos }. Não mexe em nada. */
export async function validarConteudo({ raiz = RAIZ, publico = 'public' } = {}) {
  const erros = [], avisos = [];
  const problema = (lista, arquivo, linha, msg) => lista.push({ arquivo, linha: linha || 1, msg });
  const ERRO = (a, l, m) => problema(erros, a, l, m);
  const AVISO = (a, l, m) => problema(avisos, a, l, m);

  const lerCabecalho = await leitorDoAstro();
  const CAL = await calendario(publico);
  if (!CAL) AVISO('public/js/calendario.js', 1, 'calendário do site não carregou: as datas de festa só foram conferidas no formato "MM-DD"');

  // todos os arquivos, por coleção
  const porColecao = {};
  const contagem = {};
  if (fs.existsSync(raiz)) {
    for (const pasta of fs.readdirSync(raiz, { withFileTypes: true })) {
      if (!pasta.isDirectory()) continue;
      if (!COLECOES[pasta.name]) {
        AVISO(`${raiz}/${pasta.name}`, 1, `a pasta "${pasta.name}" não é uma coleção do site (prayers, biografias, textos, cantos, liturgia): nada dela é publicado — pode ser apagada`);
        continue;
      }
      const lista = [];
      for (const rel of fs.readdirSync(path.join(raiz, pasta.name), { recursive: true }).map(String).sort()) {
        const abs = path.join(raiz, pasta.name, rel);
        if (fs.statSync(abs).isDirectory()) continue;
        const arquivo = `${raiz}/${pasta.name}/${rel.split(path.sep).join('/')}`;
        if (rel.endsWith('.md')) lista.push({ arquivo, abs, rel: rel.split(path.sep).join('/') });
        else if (/\.(md|markdown|mdx|txt)$/i.test(rel) && !/(^|\/)LEIA-ME\.txt$/i.test(rel)) {
          AVISO(arquivo, 1, `este arquivo não é lido pelo site: só valem arquivos terminados em ".md" (minúsculo)`);
        }
      }
      porColecao[pasta.name] = lista;
      contagem[pasta.name] = lista.length;
    }
  }

  const idsOracoes = new Set((porColecao.prayers || []).map((f) => f.rel.replace(/\.md$/, '')));
  const imagens = {};
  const lerPasta = (p) => (imagens[p] ??= new Set(fs.existsSync(`${publico}/${p}`) ? fs.readdirSync(`${publico}/${p}`) : []));

  for (const [col, arquivos] of Object.entries(porColecao)) {
    const C = COLECOES[col];
    const vistos = new Map();
    for (const f of arquivos) {
      const { arquivo } = f;
      const nome = path.posix.basename(f.rel);
      const id = f.rel.replace(/\.md$/, '');

      // ── nome e lugar do arquivo (vira o endereço da página e a chave do contador) ──
      if (C.nomeArquivo) {
        const m = C.nomeArquivo.exec(nome);
        const dataOk = m && dataValida(+m[1], +m[2], +m[3]);
        if (!m) ERRO(arquivo, 1, `nome do arquivo deve ser AAAAMMDD_Liturgia.md (ex.: 20261012_Liturgia.md): a data da liturgia vem do nome`);
        else if (!dataOk) ERRO(arquivo, 1, `a data no nome do arquivo (${m[3]}/${m[2]}/${m[1]}) não existe`);
      } else {
        if (f.rel.includes('/')) ERRO(arquivo, 1, `está numa subpasta: mova para ${raiz}/${col}/ (o endereço da página e as imagens contam com isso)`);
        else if (!NOME_OK.test(nome)) ERRO(arquivo, 1, `nome do arquivo inválido: use só letras minúsculas sem acento, números e hífen (ex.: ${sugerirNome(nome)}). O nome vira o endereço da página`);
      }
      const chaveDup = id.toLowerCase();
      if (vistos.has(chaveDup)) ERRO(arquivo, 1, `tem o mesmo nome (endereço) que ${vistos.get(chaveDup)}`);
      else vistos.set(chaveDup, arquivo);

      // ── cabeçalho ──
      const bruto = fs.readFileSync(f.abs, 'utf8');
      const linhas = bruto.split(/\r?\n/);
      const primeira = linhas.findIndex((l) => l.trim() !== '');
      if (primeira >= 0 && /^\s*(```|~~~)/.test(linhas[primeira].replace(/^﻿/, ''))) {
        ERRO(arquivo, primeira + 1, 'o arquivo está dentro de uma cerca ```: apague a primeira linha (```md) e a última (```)');
        continue;
      }
      const lido = lerCabecalho(bruto);
      if (lido.erroYaml) {
        ERRO(arquivo, lido.linha, `erro no cabeçalho: ${explicarYaml(lido.erroYaml, lido.textoLinha)}`);
        continue;
      }
      if (!lido.temCabecalho) {
        const comeca = linhas[primeira >= 0 ? primeira : 0]?.replace(/^﻿/, '').trim();
        if (comeca === '---' || comeca === '+++') ERRO(arquivo, (primeira >= 0 ? primeira : 0) + 1, 'o cabeçalho começa com --- mas não fecha: falta a linha --- depois dos campos');
        else ERRO(arquivo, 1, 'falta o cabeçalho: o arquivo deve começar com uma linha ---, os campos (title: …) e outra linha ---');
        continue;
      }
      const d = lido.dados;
      // linha de um campo (ou do primeiro que existir); sem nenhum: a linha --- que fecha o cabeçalho
      const linhaDe = (...campos) => campos.map((c) => lido.linhaDoCampo(c)).find((n) => n != null) ?? lido.linhaFim;

      // campos obrigatórios
      for (const k of C.obrigatorios) {
        const v = d[k];
        if (v == null || (typeof v === 'string' && !v.trim())) ERRO(arquivo, linhaDe(k), `falta o campo obrigatório "${k}"${k === 'type' ? ` (use: ${TIPOS.join(', ')})` : ''}`);
      }
      // cada campo
      for (const [k, v] of Object.entries(d)) {
        const def = C.campos[k];
        if (!def) {
          if (k === 'slug') { AVISO(arquivo, linhaDe(k), 'o campo "slug" muda o endereço da página e a chave do contador: apague-o se não for de propósito'); continue; }
          const s = parecido(k, Object.keys(C.campos));
          AVISO(arquivo, linhaDe(k), `campo desconhecido "${k}": o site ignora${s ? ` — quis dizer "${s}"?` : ''}`);
          continue;
        }
        if (v == null) continue; // campo vazio = sem valor
        const msg = conferirTipo(def, v, k, CAL);
        if (msg) (def.grave && !(def.tipo === 'festa' && !CAL) ? ERRO : AVISO)(arquivo, linhaDe(k), msg);
      }

      // ── texto (corpo) ──
      const corpoInicio = lido.linhaFim; // linha (1-based) do --- de fechamento
      const corpo = linhas.slice(corpoInicio);
      let cerca = null, dias = 0, temTexto = false;
      corpo.forEach((l, i) => {
        const n = corpoInicio + i + 1;
        const s = l.replace(/^(\s{0,3}>\s?)+/, '').replace(/^\s{0,3}/, ''); // dentro de citação também vale
        const m = /^(`{3,}|~{3,})(.*)$/.exec(s);
        if (m) {
          const marca = m[1];
          if (!cerca) {
            if (!(marca[0] === '`' && m[2].includes('`'))) cerca = { ch: marca[0], tam: marca.length, linha: n };
          } else if (marca[0] === cerca.ch && marca.length >= cerca.tam && !m[2].trim()) cerca = null;
          return;
        }
        if (cerca) return;
        if (l.trim()) temTexto = true;
        if (DIA_RE.test(l)) dias++;
      });
      if (cerca) ERRO(arquivo, cerca.linha, `cerca ${cerca.ch.repeat(3)} aberta e nunca fechada: o resto da página viraria código. Feche com uma linha ${cerca.ch.repeat(cerca.tam)} ou apague esta`);
      if (!temTexto) AVISO(arquivo, corpoInicio, 'o arquivo não tem texto depois do cabeçalho');

      // ── regras de cada coleção ──
      if (col === 'prayers') {
        const td = Number.isInteger(d.totalDays) && d.totalDays > 0 ? d.totalDays : null;
        if (d.type === 'novena') {
          if (!td || td < 2) {
            if (dias >= 2) ERRO(arquivo, linhaDe('totalDays', 'type'), `novena sem "totalDays" válido: o texto tem ${dias} dias ("## Dia N"), mas sem totalDays eles aparecem todos de uma vez. Use totalDays: ${dias}`);
            else AVISO(arquivo, linhaDe('type'), 'type: novena, mas sem totalDays nem os títulos "## Dia 1", "## Dia 2"…: a página fica como oração comum');
          } else if (dias === 0) AVISO(arquivo, linhaDe('totalDays'), `novena com totalDays: ${td}, mas o texto não tem os títulos "## Dia 1", "## Dia 2"…: a página fica como oração comum`);
          else if (dias !== td) AVISO(arquivo, linhaDe('totalDays'), `totalDays: ${td}, mas o texto tem ${dias} dias ("## Dia N") — o site segue o texto`);
        } else {
          if (td) AVISO(arquivo, linhaDe('totalDays'), 'totalDays só vale para novenas (type: novena): aqui é ignorado');
          if (dias >= 2 && TIPOS.includes(d.type)) AVISO(arquivo, linhaDe('type'), `o texto tem ${dias} dias ("## Dia N"), mas type não é novena: os dias aparecem todos de uma vez`);
        }
      }
      if (col === 'biografias') {
        if (d.name == null || !String(d.name).trim()) AVISO(arquivo, lido.linhaFim, `sem "name": a página usa o nome do arquivo ("${id.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ')}")`);
        if (Array.isArray(d.relatedPrayers)) {
          const faltam = d.relatedPrayers.map(String).filter((s) => !idsOracoes.has(s));
          if (faltam.length) AVISO(arquivo, linhaDe('relatedPrayers'), `relatedPrayers cita oração que não existe: ${faltam.join(', ')}`);
        }
      }
      // imagem (orações e biografias): a que falta usa a padrão
      if (C.imagens) {
        const img = typeof d.image === 'string' && d.image.trim() ? d.image.trim() : `/${C.imagens}/${id}.webp`;
        if (!/^https?:\/\//i.test(img)) {
          const p = img.startsWith('/') ? img.slice(1) : img;
          const pasta = path.posix.dirname(p), arq = path.posix.basename(p);
          const existentes = lerPasta(pasta);
          if (!existentes.has(arq)) {
            const outra = [...existentes].find((n) => n.toLowerCase() === arq.toLowerCase());
            const msg = outra
              ? `imagem com maiúsculas diferentes: existe ${publico}/${pasta}/${outra}, mas a página procura ${arq} (no GitHub faz diferença) — renomeie`
              : `imagem ${publico}/${p} não encontrada: a página usa a imagem padrão`;
            AVISO(arquivo, typeof d.image === 'string' ? linhaDe('image') : 1, msg);
          }
        }
      }
    }
  }
  return { arquivos: Object.values(contagem).reduce((s, n) => s + n, 0), colecoes: contagem, erros, avisos };
}

// ───────── ajudantes ─────────

// mesma leitura de cabeçalho do Astro (@astrojs/markdown-remark); devolve dados + linhas
async function leitorDoAstro() {
  let parse = null, yamlLoad = null;
  try { ({ parseFrontmatter: parse } = await import('@astrojs/markdown-remark')); } catch { /* usa o js-yaml do projeto */ }
  if (!parse) ({ load: yamlLoad } = await import('js-yaml'));
  const RE = /(?:^﻿?|^\s*\n)(?:---|\+\+\+)([\s\S]*?\n)(?:---|\+\+\+)/; // o mesmo do Astro
  return (bruto) => {
    const m = RE.exec(bruto);
    if (!m) return { temCabecalho: false };
    const abertura = bruto.slice(0, m.index + m[0].indexOf(m[1])).split('\n').length - 1; // linha (0-based) do ---
    const linhasCab = m[1].split(/\r?\n/);
    const linhaFim = abertura + linhasCab.length; // linha (1-based) do --- de fechamento
    let dados;
    try {
      dados = parse ? parse(bruto).frontmatter : (yamlLoad(m[1]) ?? {});
      if (!dados || typeof dados !== 'object' || Array.isArray(dados)) dados = {};
    } catch (e) {
      // aspas não fechadas: o js-yaml acusa o fim do cabeçalho; aponta a linha onde a aspa abriu
      let i = Math.min(e?.mark?.line ?? 0, linhasCab.length - 1);
      if (/quoted scalar/.test(e?.reason || '')) {
        const q = /single quoted/.test(e.reason) ? "'" : '"';
        for (let j = i; j >= 0; j--) if (((linhasCab[j].match(new RegExp(q, 'g')) || []).length) % 2) { i = j; break; }
      }
      return { temCabecalho: true, erroYaml: e, linha: abertura + i + 1, textoLinha: linhasCab[i] ?? '' };
    }
    const linhaDoCampo = (campo) => {
      const i = linhasCab.findIndex((l) => new RegExp(`^${campo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`).test(l));
      return i >= 0 ? abertura + i + 1 : null;
    };
    return { temCabecalho: true, dados, linhaFim, linhaDoCampo };
  };
}

async function calendario(publico) {
  try {
    const arq = path.resolve(publico, 'js/calendario.js');
    const mod = await import(/* @vite-ignore */ pathToFileURL(arq).href);
    const c = mod?.default?.valido ? mod.default : globalThis.odCalendario;
    return c && typeof c.valido === 'function' ? c : null;
  } catch {
    return null;
  }
}

function conferirTipo(def, v, k, CAL) {
  const comoTexto = v instanceof Date ? v.toISOString().slice(0, 10) : JSON.stringify(v);
  switch (def.tipo) {
    case 'texto':
      if (typeof v === 'string') return null; // vazio: quem é obrigatório já foi acusado acima
      if (v instanceof Date) return `"${k}" virou data no cabeçalho: escreva entre aspas (${k}: "${comoTexto}")`;
      return `"${k}" deve ser um texto: escreva entre aspas (${k}: "${Array.isArray(v) ? v.join(', ') : v}")`;
    case 'inteiro':
      if (Number.isInteger(v) && (def.min == null || v >= def.min)) return null;
      return `"${k}" deve ser um número inteiro${def.min ? ` (a partir de ${def.min})` : ''}, sem aspas (ex.: ${k}: ${def.exemplo ?? 1}) — está ${comoTexto}`;
    case 'numero':
      return typeof v === 'number' && Number.isFinite(v) ? null : `"${k}" deve ser um número, sem aspas — está ${comoTexto}`;
    case 'booleano':
      return typeof v === 'boolean' ? null : `"${k}" deve ser true ou false — está ${comoTexto}`;
    case 'lista':
      return Array.isArray(v) ? null : `"${k}" deve ser uma lista: [item 1, item 2] — está ${comoTexto}`;
    case 'enum':
      return def.valores.includes(v) ? null : `${k}: ${comoTexto} não é válido (use: ${def.valores.join(', ')})`;
    case 'categorias': {
      const lista = (typeof v === 'string' ? v.split(',') : Array.isArray(v) ? v : [v])
        .map((x) => String(x ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()).filter(Boolean);
      const ruins = lista.filter((x) => !CATEGORIAS_BIO.includes(x));
      return ruins.length ? `categoria desconhecida (ignorada): ${ruins.join(', ')} — use: ${CATEGORIAS_BIO.join(', ')}` : null;
    }
    case 'mmdd': {
      const s = typeof v === 'string' ? v : null;
      const m = s && /^(\d{2})-(\d{2})$/.exec(s);
      if (m && dataValida(2024, +m[1], +m[2])) return null;
      return `${k}: ${comoTexto} não é uma data válida — use "MM-DD" entre aspas (ex.: ${k}: "08-15")`;
    }
    case 'festa': {
      const s = typeof v === 'string' ? v.trim() : null;
      const ok = s && (CAL ? CAL.valido(s) : /^(\d{2})-(\d{2})$/.test(s) && dataValida(2024, +s.slice(0, 2), +s.slice(3)));
      if (ok) return null;
      const moveis = CAL?.CODIGOS?.length ? CAL.CODIGOS.join(', ') : 'pentecostes, corpus-christi…';
      return `${k}: ${comoTexto} não é uma data de festa válida — use "MM-DD" entre aspas (ex.: "12-08") ou uma festa móvel: ${moveis}`;
    }
  }
  return null;
}

function dataValida(a, m, d) {
  const dt = new Date(Date.UTC(a, m - 1, d));
  return m >= 1 && m <= 12 && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function explicarYaml(e, textoLinha = '') {
  const r = String(e?.reason || e?.message || e);
  const m = /^\s*([\w-]+):\s+([^"'\s].*:\s.*)$/.exec(textoLinha);
  if (m && !/quoted scalar/.test(r)) return `o valor tem ":" — um valor com ":" precisa de aspas: ${m[1]}: "${m[2].trim().replace(/"/g, "'")}" (${r})`;
  const dicas = [
    [/mapping values are not allowed/, 'um valor com ":" precisa de aspas (ex.: title: "Oração: de manhã")'],
    [/end of the stream|unexpected end/, 'aspas abertas e não fechadas'],
    [/bad indentation/, 'recuo (espaços no começo da linha) errado ou aspas faltando'],
    [/duplicated mapping key/, 'o mesmo campo aparece duas vezes'],
    [/can not read a block mapping entry|multiline key/, 'faltou ": " depois do nome do campo, ou aspas faltando'],
    [/unexpected end of the stream within a (double|single) quoted scalar/, 'aspas abertas e não fechadas'],
    [/missed comma between flow collection entries|end of the flow/, 'lista [ … ] com vírgula ou colchete faltando'],
    [/tab characters must not be used|tab/i, 'há um TAB no recuo: use espaços'],
  ];
  const dica = dicas.find(([re]) => re.test(r));
  return dica ? `${dica[1]} (${r})` : `${r} — confira aspas, dois-pontos e o recuo`;
}

function parecido(k, candidatos) {
  const a = k.toLowerCase();
  let melhor = null, dist = 3;
  for (const c of candidatos) {
    const dd = levenshtein(a, c.toLowerCase());
    if (dd < dist) { dist = dd; melhor = c; }
  }
  return melhor;
}
function levenshtein(a, b) {
  const v = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let ant = v[0]; v[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = v[j]; v[j] = Math.min(v[j] + 1, v[j - 1] + 1, ant + (a[i - 1] === b[j - 1] ? 0 : 1)); ant = t; }
  }
  return v[b.length];
}
function sugerirNome(nome) {
  return nome.replace(/\.md$/i, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.md';
}

// ───────── linha de comando ─────────
async function principal() {
  const QUARENTENA = process.argv.includes('--quarentena');
  const iJson = process.argv.indexOf('--json');
  const arqJson = iJson > 0 ? process.argv[iJson + 1] : (QUARENTENA ? '.relatorio/conteudo.json' : null);
  const r = await validarConteudo();
  const gh = !!process.env.GITHUB_ACTIONS;
  const limpa = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const mostrar = (nivel, p) => gh
    ? console.log(`::${nivel === 'erro' ? 'error' : 'warning'} file=${p.arquivo},line=${p.linha},title=${nivel === 'erro' ? 'Arquivo fora do site' : 'Aviso do conteúdo'}::${limpa(p.msg)}`)
    : console.log(`${nivel === 'erro' ? '✗ ERRO ' : '! aviso'} ${p.arquivo}:${p.linha} — ${p.msg}`);
  r.erros.forEach((p) => mostrar('erro', p));
  r.avisos.forEach((p) => mostrar('aviso', p));

  const comErro = [...new Set(r.erros.map((p) => p.arquivo))];
  const quarentena = [];
  if (QUARENTENA) {
    for (const f of comErro) {
      if (!fs.existsSync(f) || !f.startsWith(`${RAIZ}/`)) continue;
      const destino = path.join('quarentena', f.slice(RAIZ.length + 1));
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.renameSync(f, destino);
      quarentena.push({ arquivo: f, problemas: r.erros.filter((p) => p.arquivo === f).map((p) => `linha ${p.linha}: ${p.msg}`) });
    }
  }
  if (arqJson) {
    fs.mkdirSync(path.dirname(arqJson), { recursive: true });
    fs.writeFileSync(arqJson, JSON.stringify({ quando: new Date().toISOString(), ...r, quarentena }, null, 2));
  }
  if (process.env.GITHUB_OUTPUT) {
    const lista = quarentena.map((q) => `${q.arquivo} — ${q.problemas.join(' · ')}`).join('\n');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `quarentena=${quarentena.length}\nlista<<FIM_DA_LISTA\n${lista}\nFIM_DA_LISTA\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY && (r.erros.length || r.avisos.length)) {
    const esc = (s) => String(s).replace(/\|/g, '\\|');
    const tabela = (lista, icone) => lista.map((p) => `| ${icone} | \`${p.arquivo}\` | ${p.linha} | ${esc(p.msg)} |`).join('\n');
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `### Conferência do conteúdo: ${r.erros.length} erro(s), ${r.avisos.length} aviso(s)\n\n` +
      (quarentena.length ? `**${quarentena.length} arquivo(s) com erro ficaram fora do site** (pasta quarentena/) até serem corrigidos. O resto foi publicado.\n\n` : '') +
      `| | Arquivo | Linha | O que fazer |\n|---|---|---|---|\n${tabela(r.erros, '❌')}${r.erros.length && r.avisos.length ? '\n' : ''}${tabela(r.avisos, '⚠️')}\n`);
  }
  const resumo = `${r.arquivos} arquivo(s) conferido(s): ${r.erros.length} erro(s) em ${comErro.length} arquivo(s), ${r.avisos.length} aviso(s).`;
  if (!r.erros.length) console.log(`\n✓ ${resumo}`);
  else if (QUARENTENA) console.log(`\n${resumo}\n${quarentena.length} arquivo(s) foram para a quarentena: ficam fora do site até serem corrigidos.`);
  else console.log(`\n${resumo}\nCorrija os ERROS antes de publicar: no GitHub, esses arquivos ficariam fora do site.`);
  return r.erros.length && !QUARENTENA ? 1 : 0;
}

// só roda como comando (importado pelo relatório, não faz nada sozinho)
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  principal().then((c) => process.exit(c), (e) => { console.error('Erro inesperado no validador:', e); process.exit(2); });
}
