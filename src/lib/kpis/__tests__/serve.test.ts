/**
 * Testes unitários para KPIs de Saque
 */

import { computeServeKpis } from '../serve'
import { ServeAction, ServeSubAction, ServeType, ActionType, EFFICIENCY_VALUES } from '@/types/volleyball'

describe('Serve KPIs', () => {
  const createServeAction = (subAction: ServeSubAction, overrides = {}): ServeAction => ({
    id: '1',
    gameId: 'game-1',
    setNumber: 1,
    rallyNumber: 1,
    rotation: 1,
    timestamp: new Date(),
    teamId: 'team-1',
    playerId: 'player-1',
    actionType: ActionType.SERVE,
    subAction,
    serveType: ServeType.JUMP,
    efficiencyValue: EFFICIENCY_VALUES.SERVE[subAction],
    ...overrides,
  })

  test('calcula Ace% corretamente', () => {
    const actions: ServeAction[] = [
      createServeAction(ServeSubAction.ACE),
      createServeAction(ServeSubAction.ACE),
      createServeAction(ServeSubAction.NEUTRAL),
      createServeAction(ServeSubAction.ERROR),
    ]

    const kpis = computeServeKpis(actions)
    const aceKpi = kpis.find((k) => k.key === 'aceRate')

    expect(aceKpi).toBeDefined()
    expect(aceKpi?.value).toBe(0.5) // 2/4 = 0.5
    expect(aceKpi?.sampleSize).toBe(4)
  })

  test('calcula Erro% corretamente', () => {
    const actions: ServeAction[] = [
      createServeAction(ServeSubAction.ACE),
      createServeAction(ServeSubAction.ERROR),
      createServeAction(ServeSubAction.ERROR),
      createServeAction(ServeSubAction.NEUTRAL),
    ]

    const kpis = computeServeKpis(actions)
    const errorKpi = kpis.find((k) => k.key === 'serveErrorRate')

    expect(errorKpi).toBeDefined()
    expect(errorKpi?.value).toBe(0.5) // 2/4 = 0.5
  })

  test('calcula Pressão de Saque% corretamente', () => {
    const actions: ServeAction[] = [
      createServeAction(ServeSubAction.ACE),
      createServeAction(ServeSubAction.EFFICIENT),
      createServeAction(ServeSubAction.EFFICIENT),
      createServeAction(ServeSubAction.NEUTRAL),
      createServeAction(ServeSubAction.ERROR),
    ]

    const kpis = computeServeKpis(actions)
    const pressureKpi = kpis.find((k) => k.key === 'servePressure')

    expect(pressureKpi).toBeDefined()
    expect(pressureKpi?.value).toBe(0.6) // 3/5 = 0.6
  })

  test('calcula Eficiência de Saque corretamente', () => {
    const actions: ServeAction[] = [
      createServeAction(ServeSubAction.ACE), // +1.0
      createServeAction(ServeSubAction.EFFICIENT), // +0.5
      createServeAction(ServeSubAction.NEUTRAL), // 0.0
      createServeAction(ServeSubAction.ERROR), // -1.0
    ]

    const kpis = computeServeKpis(actions)
    const efficiencyKpi = kpis.find((k) => k.key === 'serveEfficiency')

    expect(efficiencyKpi).toBeDefined()
    expect(efficiencyKpi?.value).toBe(0.125) // (1.0 + 0.5 + 0 - 1.0) / 4 = 0.125
  })

  test('retorna KPIs vazios quando não há ações', () => {
    const actions: ServeAction[] = []
    const kpis = computeServeKpis(actions)

    expect(kpis.length).toBeGreaterThan(0)
    kpis.forEach((kpi) => {
      expect(kpi.sampleSize).toBe(0)
      expect(kpi.value).toBe(0)
      expect(kpi.explanation).toContain('insuficiente')
    })
  })

  test('todos os KPIs têm metadados obrigatórios', () => {
    const actions: ServeAction[] = [createServeAction(ServeSubAction.ACE)]
    const kpis = computeServeKpis(actions)

    kpis.forEach((kpi) => {
      expect(kpi.key).toBeDefined()
      expect(kpi.label).toBeDefined()
      expect(kpi.value).toBeDefined()
      expect(kpi.sampleSize).toBeDefined()
      expect(kpi.explanation).toBeDefined()
      expect(kpi.formula).toBeDefined()
      expect(kpi.format).toBeDefined()
    })
  })
})
