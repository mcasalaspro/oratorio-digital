// ════════════════════════════════════════════════════════════════
//  NÚMEROS DE RESERVA DO CONTADOR (usados só no build)
//  O robô diário (.github/workflows/contador-diario.yml) guarda uma cópia dos
//  contadores no ramo "dados" do GitHub; a publicação traz essa cópia para
//  src/data/contadores.json antes de compilar. Se o serviço do contador estiver
//  fora do ar, as páginas mostram estes números em vez de nada.
//  Sem o arquivo (por exemplo, num build no seu computador), não há reserva e
//  tudo funciona igual.
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';

const ARQUIVO = 'src/data/contadores.json';
let _todos: Record<string, number> | null = null;

/** Todos os números de reserva { chave: valor } (só valores maiores que zero). */
export function reservas(): Record<string, number> {
  if (_todos) return _todos;
  _todos = {};
  try {
    if (fs.existsSync(ARQUIVO)) {
      const j = JSON.parse(fs.readFileSync(ARQUIVO, 'utf-8'));
      const m = j && typeof j === 'object' ? (j.contadores ?? j) : {};
      for (const [k, v] of Object.entries(m)) {
        const n = typeof v === 'string' ? Number(v) : v;
        if (typeof n === 'number' && Number.isFinite(n) && n > 0) _todos[k] = n;
      }
    }
  } catch (e) {
    console.warn(`⚠️  ${ARQUIVO} ilegível — o site segue sem números de reserva.`);
  }
  return _todos;
}

/** Número de reserva de uma chave (null se não houver). */
export function reserva(chave: string): number | null {
  const v = reservas()[chave];
  return typeof v === 'number' ? v : null;
}
