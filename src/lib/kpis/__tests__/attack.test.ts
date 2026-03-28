/**
 * Testes unitários para KPIs de Ataque
 */

import { computeAttackKpis } from '../attack'
import {
  AttackAction,
  AttackSubAction,
  AttackType,
  ActionType,
  Phase,
  LiftCondition,
  EFFICIENCY_VALUES,
} from '@/types/volleyball'

describe('Attack KPIs', () => {
  const createAttackAction = (
    subAction: AttackSubAction,
    phase: Phase = Phase.SIDEOUT,
    overrides = {}
  ): AttackAction => ({
    id: '1',
    gameId: 'game-1',
    setNumber: 1,
    rallyNumber: 1,
    rotation: 1,
    timestamp: new Date(),
    teamId: 'team-1',
    playerId: 'player-1',
    actionType: ActionType.ATTACK,
    subAction,
    attackType: AttackType.OUTSIDE,
    liftCondition: LiftCondition.A,
    phase,
    efficiencyValue: EFFICIENCY_VALUES.ATTACK[subAction],
    ...overrides,
  })

  test('calcula Kill% corretamente', () => {
    const actions: AttackAction[] = [
      createAttackAction(AttackSubAction.POINT),
      createAttackAction(AttackSubAction.POINT),
      createAttackAction(AttackSubAction.DEFENDED),
      createAttackAction(AttackSubAction.ERROR),
    ]

    const kpis = computeAttackKpis(actions)
    const killKpi = kpis.find((k) => k.key === 'killRate')

    expect(killKpi).toBeDefined()
    expect(killKpi?.value).toBe(0.5) // 2/4 = 0.5
  })

  test('calcula Hitting% corretamente', () => {
    const actions: AttackAction[] = [
      createAttackAction(AttackSubAction.POINT), // +1
      createAttackAction(AttackSubAction.POINT), // +1
      createAttackAction(AttackSubAction.BLOCKED), // -1
      createAttackAction(AttackSubAction.ERROR), // -1
      createAttackAction(AttackSubAction.DEFENDED), // 0
    ]

    const kpis = computeAttackKpis(actions)
    const hittingKpi = kpis.find((k) => k.key === 'hittingPercentage')

    expect(hittingKpi).toBeDefined()
    expect(hittingKpi?.value).toBe(0) // (2 - 1 - 1) / 5 = 0
  })

  test('calcula Conversão Side-out corretamente', () => {
    const actions: AttackAction[] = [
      createAttackAction(AttackSubAction.POINT, Phase.SIDEOUT),
      createAttackAction(AttackSubAction.POINT, Phase.SIDEOUT),
      createAttackAction(AttackSubAction.ERROR, Phase.SIDEOUT),
      createAttackAction(AttackSubAction.POINT, Phase.BREAK), // Não conta
    ]

    const kpis = computeAttackKpis(actions)
    const sideoutKpi = kpis.find((k) => k.key === 'sideoutConversion')

    expect(sideoutKpi).toBeDefined()
    expect(sideoutKpi?.value).toBeCloseTo(0.667, 2) // 2/3
    expect(sideoutKpi?.sampleSize).toBe(3)
  })

  test('calcula Conversão Break corretamente', () => {
    const actions: AttackAction[] = [
      createAttackAction(AttackSubAction.POINT, Phase.BREAK),
      createAttackAction(AttackSubAction.ERROR, Phase.BREAK),
      createAttackAction(AttackSubAction.ERROR, Phase.BREAK),
      createAttackAction(AttackSubAction.POINT, Phase.SIDEOUT), // Não conta
    ]

    const kpis = computeAttackKpis(actions)
    const breakKpi = kpis.find((k) => k.key === 'breakConversion')

    expect(breakKpi).toBeDefined()
    expect(breakKpi?.value).toBeCloseTo(0.333, 2) // 1/3
    expect(breakKpi?.sampleSize).toBe(3)
  })

  test('calcula Índice de Ataque corretamente', () => {
    const actions: AttackAction[] = [
      createAttackAction(AttackSubAction.POINT), // +1.0
      createAttackAction(AttackSubAction.EFFICIENT), // +0.5
      createAttackAction(AttackSubAction.DEFENDED), // 0.0
      createAttackAction(AttackSubAction.BLOCKED), // -0.5
      createAttackAction(AttackSubAction.ERROR), // -1.0
    ]

    const kpis = computeAttackKpis(actions)
    const efficiencyKpi = kpis.find((k) => k.key === 'attackEfficiency')

    expect(efficiencyKpi).toBeDefined()
    expect(efficiencyKpi?.value).toBe(0) // (1.0 + 0.5 + 0 - 0.5 - 1.0) / 5 = 0
  })

  test('retorna KPIs vazios quando não há ações', () => {
    const actions: AttackAction[] = []
    const kpis = computeAttackKpis(actions)

    expect(kpis.length).toBeGreaterThan(0)
    kpis.forEach((kpi) => {
      expect(kpi.sampleSize).toBe(0)
      expect(kpi.value).toBe(0)
    })
  })
})
