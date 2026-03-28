// src/lib/scoutGuide.ts
// Textos de ajuda para operadores inexperientes em scout de vôlei

/**
 * Tooltips dos botões de resultado (sub-ações).
 * Indexado por: fundamentoId → subActionId
 */
export const subActionTooltips: Record<string, Record<string, string>> = {
  serve: {
    ace: 'O adversário não conseguiu tocar na bola ou tocou e perdeu o controle. Ponto direto do saque.',
    broken_pass: 'O adversário recebeu mal e não conseguiu organizar o ataque. A recepção foi ruim.',
    overpass: 'A bola passou direto para o lado adversário na recepção (bola de graça). Também chamado de "xeque".',
    facilitated: 'O adversário recebeu bem e conseguiu organizar o ataque normalmente. Saque sem efeito.',
    error: 'O saque foi para fora, na rede ou cometeu infração. Ponto para o adversário.',
  },
  reception: {
    perfect: 'A bola chegou exatamente onde o levantador queria. Ele tem todas as opções de ataque disponíveis.',
    positive: 'A bola foi para o levantador mas sem muita precisão. Ele consegue levantar, mas com menos opções.',
    negative: 'A bola foi para longe do levantador. Ele precisa se deslocar muito e só consegue dar bola alta.',
    overpass: 'A bola passou direto para o outro lado da rede na recepção. Bola de graça para o adversário.',
    error: 'O jogador não conseguiu recepcionar e a bola caiu ou saiu. Ponto para o adversário.',
  },
  attack: {
    kill: 'O ataque marcou ponto! A bola caiu na quadra adversária ou saiu após toque do bloqueio adversário.',
    tip: 'Toque suave (largada) que caiu na quadra adversária e marcou ponto. Diferente do spike, é um toque curto e preciso.',
    block_out: 'O atacante jogou a bola intencionalmente contra o bloqueio e a bola saiu pela lateral. Ponto para o time que atacou.',
    replay: 'O ataque foi explorado pelo bloqueio mas a bola voltou pro nosso lado e o rally continua.',
    continued: 'O adversário conseguiu defender o ataque e o rally continua. Não foi ponto nem erro.',
    blocked: 'O ataque bateu no bloqueio adversário. A bola voltou e caiu do nosso lado. Ponto do adversário.',
    error: 'O ataque foi para fora, na rede ou cometeu infração. Ponto para o adversário.',
  },
  block: {
    kill_block: 'A bola bateu no bloqueio e caiu na quadra adversária. Ponto do bloqueio!',
    touch: 'O bloqueio tocou na bola mas ela não caiu. A bola foi amortecida e o rally continua.',
    error: 'Toque na rede, invasão ou a bola tocou no bloqueio e caiu do nosso lado. Ponto do adversário.',
  },
  dig: {
    perfect: 'A defesa foi perfeita. A bola subiu controlada e o levantador tem todas as opções.',
    positive: 'A defesa foi boa, a bola subiu mas sem muita precisão. Dá pra organizar o contra-ataque.',
    bad: 'A defesa foi ruim. A bola subiu descontrolada e o time mal consegue devolver.',
    error: 'A bola caiu sem defesa ou a defesa mandou a bola pra fora. Ponto do adversário.',
  },
  set: {
    perfect: 'O levantamento foi preciso. O atacante tem tempo e espaço para atacar com força.',
    positive: 'O levantamento foi bom mas não perfeito. O atacante consegue atacar com alguma limitação.',
    negative: 'O levantamento foi ruim. Bola muito alta, longe ou apertada. Ataque difícil.',
    error: 'Erro no levantamento: bola na rede, fora, dois toques ou condução. Ponto do adversário.',
  },
}

/**
 * Guias explicativos por fundamento.
 * Mostrados no Popover ao clicar no ícone "?".
 */
export const fundamentoGuides: Record<string, { title: string; description: string; criteria: string }> = {
  serve: {
    title: 'Saque',
    description: 'O saque é a ação que inicia o rally. Avalie o resultado olhando o que aconteceu com a recepção adversária.',
    criteria: 'Ponto direto → Ace. Recepção ruim → Quebrou passe. Bola de graça → Xeque. Recepção ok → Facilitado. Fora/rede → Erro.',
  },
  reception: {
    title: 'Recepção',
    description: 'A recepção é o primeiro toque após o saque adversário. Avalie pela qualidade da bola que chegou ao levantador.',
    criteria: 'Bola perfeita pro levantador → Perfeita (A). Levantador precisa se ajustar → Positiva (B). Levantador longe → Negativa (C). Passou direto → Xeque. Caiu → Erro.',
  },
  attack: {
    title: 'Ataque',
    description: 'O ataque é a principal ação de pontuação. Avalie pelo resultado direto: marcou ponto, foi defendido ou errou.',
    criteria: 'Ataque forte que caiu → Spike. Toque suave que caiu → Largada. Bola no bloqueio e saiu → Explorou bloqueio. Bola voltou pro nosso lado → Replay. Adversário defendeu → Defendido. Bloqueio derrubou → Bloqueado. Fora/rede → Erro.',
  },
  block: {
    title: 'Bloqueio',
    description: 'O bloqueio é a primeira barreira contra o ataque adversário. Avalie se a bola caiu do lado deles ou do nosso.',
    criteria: 'Bola caiu do lado deles → Ponto. Tocou mas rally segue → Amortecido. Bola caiu do nosso lado/rede → Erro.',
  },
  dig: {
    title: 'Defesa',
    description: 'A defesa acontece quando o adversário ataca. Avalie pela qualidade da bola que subiu para o contra-ataque.',
    criteria: 'Bola subiu controlada → Perfeita. Bola subiu razoável → Positiva. Bola subiu descontrolada → Ruim. Não defendeu → Erro.',
  },
  set: {
    title: 'Levantamento',
    description: 'O levantamento é o passe que prepara o ataque. Avalie pela qualidade da bola que o atacante recebeu.',
    criteria: 'Atacante com tempo e espaço → Perfeito. Atacante com alguma limitação → Positivo. Atacante apertado → Negativo. Bola na rede/fora → Erro.',
  },
}
