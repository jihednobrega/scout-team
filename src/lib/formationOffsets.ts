import { VolleyballPosition } from '@/types/player'

export type FormationOffset = { top: number; right: number } // em %, relativo à meia-quadra do time da casa
export type FormationMode = 'serve' | 'reception' | 'transition'

// Cada role pode ter 1 ou mais offsets (ex: 2 ponteiros, 2 centrais).
// Valor único = aplica ao 1º jogador desse role. Array = 1 offset por jogador na ordem de zona lógica.
type OffsetEntry = FormationOffset | FormationOffset[]
type OffsetMap = Partial<Record<VolleyballPosition, OffsetEntry>>

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de coordenadas (relativo à MEIA-QUADRA do home — lado direito):
//
//   top:   0% = topo da quadra,  100% = base da quadra
//          (aplicado diretamente como CSS top)
//
//   right: 0% = linha lateral direita (sideline),  100% = rede (centro da quadra)
//          (escalado por ÷2 no PlayerCard: right 80 → CSS right: 40%)
//          (a meia-quadra ocupa CSS right: 0% a 50%)
//
// ATENÇÃO: esses valores são aproximações das imagens de referência do rodízio 5×1.
// Ajuste visualmente após confirmar o funcionamento.
// ─────────────────────────────────────────────────────────────────────────────

// ── SAQUE ────────────────────────────────────────────────────────────────────
// Jogadores mantêm posições legais de rotação (levantador saca de Z1)

const SERVE_OFFSETS: Record<number, OffsetMap> = {
  // P1 — levantador saca de Z1 (fundo direita)
  1: {
    levantador: { top: 25, right: 45 },
    central:    [
      { top: 50, right: 85 },           // 1º central – frente (Z3)
      { top: 75, right: 45 },           // 2º central – fundo (Z6, onde líbero entraria)
    ],
    ponteiro:   [
      { top: 75, right: 85 },           // 1º ponteiro – frente (Z2)
      { top: 50, right: 15 },           // 2º ponteiro – fundo (Z5)
    ],
    oposto:     { top: 25, right: 85 },  // Z4 – frente esquerda
    libero:     { top: 75, right: 45 },  // Z6 – fundo centro
  },
  // P2 — levantador rotacionou para Z6 (fundo centro)
  2: {
    levantador: { top: 25, right: 85 },
    central:    [
      { top: 50, right: 85 },           // 1º central – frente (Z2)
      { top: 75, right: 40 },           // 2º central – fundo (Z6, onde líbero entraria)
    ],
    ponteiro:   [
      { top: 75, right: 85 },           // 1º ponteiro – frente (Z4)
      { top: 50, right: 25 },           // 2º ponteiro – fundo (Z5)
    ],
    oposto:     { top: 25, right: 40 },  // Z1 – fundo direita
    libero:     { top: 50, right: 45 },  // Z6 – fundo centro
  },
  // P3 — levantador em Z5 (fundo esquerda)
  3: {
    levantador: { top: 25, right: 85 },
    central:    [
      { top: 45, right: 10 },           // 1º central – fundo (Z1)
      { top: 50, right: 85 },           // 2º central – frente (Z3)
    ],
    ponteiro:   [
      { top: 75, right: 85 },           // 1º ponteiro – frente (Z2)
      { top: 50, right: 15 },           // 2º ponteiro – fundo (Z1)
    ],
    oposto:     { top: 25, right: 45 },  // Z2 – frente direita
    libero:     { top: 75, right: 45 },  // Z1 – fundo direita
  },
  // P4 — levantador em Z4 (frente esquerda)
  4: {
    levantador: { top: 25, right: 85 },
    central:    [
      { top: 50, right: 85 },           // 1º central – frente (Z3)
      { top: 50, right: 85 },           // 2º central – fundo (Z6, onde líbero entraria)
    ],
    ponteiro:   [
      { top: 75, right: 85 },           // 1º ponteiro – frente (Z2)
      { top: 50, right: 25 },           // 2º ponteiro – fundo (Z1)
    ],
    oposto:     { top: 25, right: 45 },  // Z5 – fundo esquerda
    libero:     { top: 75, right: 45 },  // Z6 – fundo centro
  },
  // P5 — levantador em Z3 (frente centro)
  5: {
    levantador: { top: 25, right: 45 },
    central:    [
      { top: 75, right: 45 },           // 1º central – frente (Z3)
      { top: 50, right: 85 },           // 2º central – fundo (Z5, onde líbero entraria)
    ],
    ponteiro:   [
      { top: 50, right: 25 },           // 2º ponteiro – frente (Z2)
      { top: 75, right: 85 },           // 1º ponteiro – frente (Z4)
    ],
    oposto:     { top: 25, right: 85 },  // Z6 – fundo centro
    libero:     { top: 75, right: 80 },  // Z5 – fundo esquerda
  },
  // P6 — levantador em Z2 (frente direita)
  6: {
    levantador: { top: 25, right: 45 },
    central:    [
      { top: 50, right: 85 },           // 1º central – frente (Z4)
      { top: 75, right: 45 },           // 2º central – fundo (Z5)
    ],
    ponteiro:   [
      { top: 50, right: 15 },           // 1º ponteiro – frente (Z1)
      { top: 75, right: 85 },           // 2º ponteiro – frente (Z3)
    ],
    oposto:     { top: 25, right: 85 },  // Z1 – fundo direita
    libero:     { top: 75, right: 45 },  // Z6 – fundo centro
  },
}

// ── RECEPÇÃO ─────────────────────────────────────────────────────────────────
// Jogadores se abrem para o sistema de recepção W ou U

const RECEPTION_OFFSETS: Record<number, OffsetMap> = {
  // P1 – levantador corre para Z2/Z3 (frente), recepção W aberta
  1: {
    levantador: { top:  10, right: 25 },
    central:    [
      { top: 65, right: 85 },           // 1º central – frente
      { top: 50, right: 35 },           // 2º central – fundo (onde líbero entraria)
    ],
    ponteiro:   [
      { top: 20, right: 45 },           // 1º ponteiro – recebe (aberto)
      { top: 80, right: 45 },           // 2º ponteiro – fundo
    ],
    oposto:     { top: 90, right: 70 },
    libero:     { top: 50, right: 35 },
  },
  2: {
    levantador: { top:  15, right: 80 },
    central:    [
      { top: 85, right: 80 },           // 1º central – rede direita
      { top: 40, right: 45 },           // 2º central – fundo (onde líbero entraria)
    ],
    ponteiro:   [
      { top: 80, right: 40 },           // 1º ponteiro – fundo direita (recebe)
      { top: 50, right: 35 },           // 2º ponteiro – fundo esquerda
    ],
    oposto:     { top: 70, right: 10 },
    libero:     { top: 20, right: 40 },
  },
  3: {
    levantador: { top:  40, right: 85 },
    central:    [
      { top:  8, right: 45 },           // 1º central – rede centro
      { top: 8, right: 60 },           // 2º central – fundo direita
    ],
    ponteiro:   [
      { top: 75, right: 45 },           // 1º ponteiro – rede esquerda
      { top: 25, right: 45 },           // 2º ponteiro – fundo direita
    ],
    oposto:     { top: 30, right: 10 },
    libero:     { top: 50, right: 25 },
  },
  4: {
    levantador: { top: 90, right: 85 },
    central:    [
      { top: 75, right: 70 },           // 1º central – rede esquerda
      { top: 35, right: 80 },           // 2º central – fundo (onde líbero entraria)
    ],
    ponteiro:   [
      { top: 65, right: 45 },           // 1º ponteiro – fundo centro (recebe)
      { top: 45, right: 25 },           // 2º ponteiro – fundo direita
    ],
    oposto:     { top: 10, right: 15 },
    libero:     { top: 22, right: 45 },
  },
  5: {
    levantador: { top: 60, right: 85 },
    central:    [
      { top:  25, right: 45 },           // 1º central – rede centro
      { top: 85, right: 70 },           // 2º central – fundo (onde líbero entraria)
    ],
    ponteiro:   [
      { top: 50, right: 25 },           // 2º ponteiro – frente direita
      { top: 75, right: 45 },           // 1º ponteiro – fundo esquerda (recebe)
    ],
    oposto:     { top: 15, right: 80 },
    libero:     { top: 25, right: 45 },
  },
  6: {
    levantador: { top: 20, right: 72 },
    central:    [
      { top: 8, right: 55 },           // 1º central – rede direita
      { top: 55, right: 35 },           // 2º central – fundo direita
    ],
    ponteiro:   [
      { top: 32, right: 40 },           // 1º ponteiro – fundo direita (recebe)
      { top: 80, right: 50 },           // 2º ponteiro – frente esquerda
    ],
    oposto:     { top: 30, right: 90 },
    libero:     { top: 58, right: 35 },
  },
}

// ── TRANSIÇÃO / CONTRA-ATAQUE ──────────────────────────────────────────────
// Após o primeiro contato do rally, jogadores se reposicionam:
// - Levantador corre para a zona de levantamento (perto da rede, Z2-Z3)
// - Atacantes de frente se preparam na rede para atacar
// - Linha de trás recua para defesa (cobertura de contra-ataque)
// - Líbero cobre a zona central de defesa

const TRANSITION_OFFSETS: Record<number, OffsetMap> = {
  // P1 — levantador na posição 1 (linha de trás), infiltra para a rede
  1: {
    levantador: { top: 25, right: 40 },   // infiltra para Z2-Z3 (perto da rede)
    central:    [
      { top: 50, right: 85 },              // 1º central – frente (Z3, pronto para atacar)
      { top: 70, right: 40 },              // 2º central – defesa fundo (líbero substitui)
    ],
    ponteiro:   [
      { top: 20, right: 85 },              // 1º ponteiro – entrada de rede (Z4, ataca pela ponta)
      { top: 50, right: 15 },              // 2º ponteiro – defesa fundo (Z5)
    ],
    oposto:     { top: 80, right: 85 },    // Z2 – saída de rede, ataca pela direita
    libero:     { top: 75, right: 40 },    // defesa central (Z6)
  },
  // P2 — levantador na posição 2 (frente), já está na rede
  2: {
    levantador: { top: 20, right: 85 },   // já na rede (Z2)
    central:    [
      { top: 50, right: 85 },              // 1º central – frente (Z3)
      { top: 75, right: 45 },              // 2º central – defesa fundo
    ],
    ponteiro:   [
      { top: 80, right: 85 },              // 1º ponteiro – frente (Z4)
      { top: 50, right: 25 },              // 2º ponteiro – defesa fundo (Z5)
    ],
    oposto:     { top: 25, right: 45 },    // Z1 – defesa fundo direita
    libero:     { top: 75, right: 45 },    // defesa central (Z6)
  },
  // P3 — levantador na posição 3 (frente centro)... na prática não ocorre no 5×1,
  // mas mantemos para completude. Levantador infiltra de Z5.
  3: {
    levantador: { top: 20, right: 85 },   // infiltra para a rede
    central:    [
      { top: 25, right: 25 },              // 1º central – defesa (Z1)
      { top: 50, right: 85 },              // 2º central – frente (Z3)
    ],
    ponteiro:   [
      { top: 80, right: 85 },              // 1º ponteiro – frente (Z2)
      { top: 50, right: 25 },              // 2º ponteiro – defesa (Z5)
    ],
    oposto:     { top: 25, right: 45 },    // defesa central
    libero:     { top: 75, right: 45 },    // defesa central (Z6)
  },
  // P4 — levantador na posição 4 (frente esquerda), está na rede
  4: {
    levantador: { top: 15, right: 85 },   // já na rede (Z4), desloca para levantar
    central:    [
      { top: 50, right: 90 },              // 1º central – frente (Z3)
      { top: 50, right: 85 },              // 2º central – defesa fundo
    ],
    ponteiro:   [
      { top: 50, right: 25 },              // 2º ponteiro – defesa (Z1)
      { top: 85, right: 85 },              // 1º ponteiro – frente (Z2)
    ],
    oposto:     { top: 25, right: 45 },    // Z5 – defesa fundo esquerda
    libero:     { top: 75, right: 45 },    // defesa central (Z6)
  },
  // P5 — levantador na posição 5 (linha de trás esquerda), infiltra
  5: {
    levantador: { top: 25, right: 45 },   // infiltra para a rede (entre Z3-Z4)
    central:    [
      { top: 75, right: 45 },              // 2º central – defesa fundo
      { top: 50, right: 85 },              // 1º central – frente (Z3)
    ],
    ponteiro:   [
      { top: 50, right: 25 },    // Z1 – defesa fundo
      { top: 85, right: 85 },              // 1º ponteiro – frente (Z4)
    ],
    oposto:     { top: 15, right: 85 },              // 2º ponteiro – frente (Z2)
    libero:     { top: 75, right: 45 },    // defesa central (Z6)
  },
  // P6 — levantador na posição 6 (linha de trás centro), infiltra
  6: {
    levantador: { top: 25, right: 45 },   // infiltra para a rede (Z2-Z3)
    central:    [
      { top: 50, right: 85 },              // 1º central – frente meio (Z3, ataca pelo meio)
      { top: 55, right: 35 },              // 2º central – defesa fundo
    ],
    ponteiro:   [
      { top: 50, right: 25 },              // 1º ponteiro – defesa (Z1)
      { top: 85, right: 85 },              // 2º ponteiro – entrada de rede (Z4, ataca pela ponta)
    ],
    oposto:     { top: 15, right: 85 },    // Z2 – frente direita
    libero:     { top: 75, right: 45 },    // defesa central (Z6)
  },
}

const OFFSET_TABLES: Record<FormationMode, Record<number, OffsetMap>> = {
  serve:      SERVE_OFFSETS,
  reception:  RECEPTION_OFFSETS,
  transition: TRANSITION_OFFSETS,
}

// ── MAPEAMENTO 5×1: lineup position → [role, índice dentro do role] ────────
// Independe da posição natural do jogador — o que importa é o slot na súmula.
const LINEUP_ROLE_MAP: Record<number, [VolleyballPosition, number]> = {
  1: ['levantador', 0],
  2: ['ponteiro', 0],
  3: ['central', 0],
  4: ['oposto', 0],
  5: ['ponteiro', 1],
  6: ['central', 1],
}

/**
 * Retorna o offset livre para uma dada rotação, modo, role e índice.
 * `index` distingue jogadores do mesmo role (0 = primeiro, 1 = segundo).
 * Retorna null quando não há mapeamento — o chamador deve usar getPositionClasses como fallback.
 */
export function getFormationOffset(
  rotation: number,
  mode: FormationMode,
  role: VolleyballPosition,
  index: number = 0
): FormationOffset | null {
  const entry = OFFSET_TABLES[mode]?.[rotation]?.[role]
  if (!entry) return null
  if (Array.isArray(entry)) return entry[index] ?? null
  return index === 0 ? entry : null
}

/**
 * Retorna o offset baseado na posição de lineup (1-6) em vez da posição natural do jogador.
 * Usa o mapeamento fixo do sistema 5×1: P1=levantador, P2=ponteiro, P3=central, P4=oposto, P5=ponteiro, P6=central.
 */
export function getFormationOffsetByLineup(
  rotation: number,
  mode: FormationMode,
  lineupPosition: number
): FormationOffset | null {
  const mapping = LINEUP_ROLE_MAP[lineupPosition]
  if (!mapping) return null
  const [role, index] = mapping
  return getFormationOffset(rotation, mode, role, index)
}
