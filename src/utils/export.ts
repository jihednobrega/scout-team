// app/utils/export.ts
import { ScoutAction, MatchInfo } from '@/types/scout'

/**
 * Converte ações para formato CSV
 */
const actionsToCSV = (actions: ScoutAction[]): string => {
  // Cabeçalho
  const headers = [
    'ID',
    'Horário',
    'Jogador',
    'Ação',
    'Sub-Ação',
    'Zona',
    'Coord. X (%)',
    'Coord. Y (%)',
    'Set',
    'Timestamp',
  ]

  // Linhas de dados
  const rows = actions.map((action) => [
    action.id,
    action.time,
    action.player,
    action.action,
    action.subAction,
    (action.zone ?? 0).toString(),
    (action.coordinates?.x ?? 0).toFixed(2),
    (action.coordinates?.y ?? 0).toFixed(2),
    action.set?.toString() || '1',
    action.timestamp.toISOString(),
  ])

  // Combinar cabeçalho e linhas
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ].join('\n')

  return csvContent
}

/**
 * Exporta ações para arquivo CSV
 */
export const exportActionsToCSV = (
  actions: ScoutAction[],
  matchInfo?: MatchInfo
): void => {
  try {
    if (actions.length === 0) {
      alert('⚠️ Não há dados para exportar!')
      return
    }

    const csv = actionsToCSV(actions)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    // Criar nome do arquivo
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const fileName = matchInfo
      ? `scout_${matchInfo.homeTeam}_vs_${matchInfo.awayTeam}_${timestamp}.csv`
      : `scout_export_${timestamp}.csv`

    // Criar link de download temporário
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'

    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Liberar o objeto URL
    URL.revokeObjectURL(url)

    console.log(`✅ Exportação concluída: ${fileName}`)
  } catch (error) {
    console.error('❌ Erro ao exportar CSV:', error)
    alert('❌ Erro ao exportar dados. Verifique o console.')
  }
}

/**
 * Gera estatísticas resumidas em formato de texto
 */
interface PlayerStats {
  total: number
  serve: { ace: number; effective: number; error: number }
  attack: { kill: number; effective: number; blocked: number; error: number }
  block: { point: number; effective: number; touch: number }
  dig: { excellent: number; good: number; error: number }
  set: { excellent: number; good: number; error: number }
  reception: { excellent: number; good: number; error: number }
}

export const generateStatsReport = (
  actions: ScoutAction[],
  matchInfo?: MatchInfo
): string => {
  if (actions.length === 0) {
    return 'Nenhuma ação registrada.'
  }

  // Estatísticas por jogador
  const playerStats: Record<string, PlayerStats> = {}

  actions.forEach((action) => {
    if (!playerStats[action.player]) {
      playerStats[action.player] = {
        total: 0,
        serve: { ace: 0, effective: 0, error: 0 },
        attack: { kill: 0, effective: 0, blocked: 0, error: 0 },
        block: { point: 0, effective: 0, touch: 0 },
        dig: { excellent: 0, good: 0, error: 0 },
        set: { excellent: 0, good: 0, error: 0 },
        reception: { excellent: 0, good: 0, error: 0 },
      }
    }

    playerStats[action.player].total++

    // Incrementar contadores específicos
    const pStats = playerStats[action.player] as unknown as Record<string, Record<string, number>>
    if (pStats[action.action]) {
      const subActionKey = action.subAction
      if (pStats[action.action][subActionKey] !== undefined) {
        pStats[action.action][subActionKey]++
      }
    }
  })

  // Gerar relatório
  let report = matchInfo
    ? `=== RELATÓRIO DO SCOUT ===\n${matchInfo.homeTeam} vs ${matchInfo.awayTeam}\nSet: ${matchInfo.currentSet}\nPlacar: ${matchInfo.score.home} - ${matchInfo.score.away}\n\n`
    : '=== RELATÓRIO DO SCOUT ===\n\n'

  report += `Total de Ações: ${actions.length}\n\n`

  report += '--- ESTATÍSTICAS POR JOGADOR ---\n'
  Object.entries(playerStats).forEach(([player, stats]) => {
    report += `\nJogador #${player} (${stats.total} ações):\n`
    report += `  Saques: ${stats.serve.ace} aces, ${stats.serve.effective} efetivos, ${stats.serve.error} erros\n`
    report += `  Ataques: ${stats.attack.kill} kills, ${stats.attack.effective} efetivos, ${stats.attack.blocked} bloqueados, ${stats.attack.error} erros\n`
    report += `  Bloqueios: ${stats.block.point} pontos, ${stats.block.effective} efetivos, ${stats.block.touch} toques\n`
    report += `  Defesas: ${stats.dig.excellent} excelentes, ${stats.dig.good} boas, ${stats.dig.error} erros\n`
    report += `  Levantamentos: ${stats.set.excellent} excelentes, ${stats.set.good} bons, ${stats.set.error} erros\n`
    report += `  Recepções: ${stats.reception.excellent} perfeitas, ${stats.reception.good} boas, ${stats.reception.error} erros\n`
  })

  return report
}

/**
 * Exporta relatório de estatísticas em formato TXT
 */
export const exportStatsToTXT = (
  actions: ScoutAction[],
  matchInfo?: MatchInfo
): void => {
  try {
    const report = generateStatsReport(actions, matchInfo)
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const fileName = matchInfo
      ? `scout_relatorio_${matchInfo.homeTeam}_vs_${matchInfo.awayTeam}_${timestamp}.txt`
      : `scout_relatorio_${timestamp}.txt`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    console.log(`✅ Relatório exportado: ${fileName}`)
  } catch (error) {
    console.error('❌ Erro ao exportar relatório:', error)
    alert('❌ Erro ao exportar relatório. Verifique o console.')
  }
}

/**
 * Exporta tanto CSV quanto TXT em uma única ação
 */
export const exportAll = (
  actions: ScoutAction[],
  matchInfo?: MatchInfo
): void => {
  exportActionsToCSV(actions, matchInfo)
  setTimeout(() => {
    exportStatsToTXT(actions, matchInfo)
  }, 500) // Pequeno delay para não conflitar os downloads
}

/**
 * Exporta para formato Excel (CSV com encoding UTF-8 BOM)
 */
export const exportToExcel = (
  actions: ScoutAction[],
  playerStats?: any[],
  matchInfo?: any
): void => {
  try {
    if (actions.length === 0 && (!playerStats || playerStats.length === 0)) {
      alert('⚠️ Não há dados para exportar!')
      return
    }

    // Gera CSV com estatísticas de jogadores
    let csvContent = ''

    // Cabeçalho do relatório
    if (matchInfo) {
      csvContent += `Scout Team - Relatório de Estatísticas\n`
      csvContent += `Partida: ${matchInfo.homeTeam} vs ${matchInfo.awayTeam}\n`
      csvContent += `Data: ${new Date(matchInfo.date).toLocaleDateString('pt-BR')}\n\n`
    }

    // Estatísticas por jogador
    if (playerStats && playerStats.length > 0) {
      csvContent += `Estatísticas por Jogador\n\n`
      csvContent += `Jogador,Camisa,Total de Ações,Saques,Aces,Ataques,Pontos,Bloqueios,Recepções,Eficiência Geral\n`

      playerStats.forEach((player) => {
        const efficiency = (
          (player.serves.efficiency +
            player.attacks.efficiency +
            player.blocks.efficiency +
            player.receptions.efficiency) /
          4
        ).toFixed(1)

        csvContent += `${player.playerName},${player.jerseyNumber},${player.totalActions},${player.serves.total},${player.serves.aces},${player.attacks.total},${player.attacks.kills},${player.blocks.total},${player.receptions.total},${efficiency}%\n`
      })

      csvContent += `\n\n`
    }

    // Detalhamento de ações
    csvContent += `Detalhamento de Ações\n\n`
    csvContent += `ID,Horário,Jogador,Ação,Sub-Ação,Zona,Coord X,Coord Y,Set,Timestamp\n`

    actions.forEach((action) => {
      csvContent += `${action.id},${action.time},${action.player},${action.action},${action.subAction},${action.zone ?? 0},${(action.coordinates?.x ?? 0).toFixed(2)},${(action.coordinates?.y ?? 0).toFixed(2)},${action.set || 1},${action.timestamp.toISOString()}\n`
    })

    // Adiciona BOM para UTF-8 (para Excel reconhecer acentos)
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)

    const timestamp = new Date().toISOString().slice(0, 10)
    const fileName = matchInfo
      ? `Scout_${matchInfo.awayTeam}_${timestamp}.csv`
      : `Scout_Estatisticas_${timestamp}.csv`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    console.log(`✅ Exportado para Excel: ${fileName}`)
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error)
    alert('❌ Erro ao exportar. Verifique o console.')
  }
}

/**
 * Exporta para formato DataVolley (formato simplificado)
 * Nota: DataVolley tem formato proprietário complexo, esta é uma versão simplificada
 */
export const exportToDataVolley = (
  actions: ScoutAction[],
  matchInfo?: any
): void => {
  try {
    if (actions.length === 0) {
      alert('⚠️ Não há dados para exportar!')
      return
    }

    // Formato simplificado inspirado no DataVolley
    let dvContent = `[3DATAVOLLEYSCOUT]\n`
    dvContent += `[3SCOUT]\n\n`

    if (matchInfo) {
      dvContent += `[3MATCH]\n`
      dvContent += `.match\n`
      dvContent += `.teamA ${matchInfo.homeTeam}\n`
      dvContent += `.teamB ${matchInfo.awayTeam}\n`
      dvContent += `.date ${new Date(matchInfo.date).toLocaleDateString('pt-BR')}\n\n`
    }

    dvContent += `[3ACTIONS]\n`

    actions.forEach((action, index) => {
      // Formato: *P{player}S{set}{action_code}{zone}{evaluation}
      const actionCodes: Record<string, string> = {
        serve: 'S',
        reception: 'R',
        set: 'E',
        attack: 'A',
        block: 'B',
        dig: 'D',
      }

      const evaluationCodes: Record<string, string> = {
        ace: '#',
        kill: '#',
        perfect: '#',
        good: '+',
        error: '=',
        blocked: '/',
      }

      const code = actionCodes[action.action] || 'X'
      const evaluation = evaluationCodes[action.subAction] || '+'

      dvContent += `*${index + 1}${code}P${action.player}Z${action.zone}${evaluation}\n`
    })

    const blob = new Blob([dvContent], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const timestamp = new Date().toISOString().slice(0, 10)
    const fileName = matchInfo
      ? `Scout_${matchInfo.awayTeam}_${timestamp}.dvw`
      : `Scout_Export_${timestamp}.dvw`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    console.log(`✅ Exportado para DataVolley: ${fileName}`)
  } catch (error) {
    console.error('❌ Erro ao exportar DataVolley:', error)
    alert('❌ Erro ao exportar. Verifique o console.')
  }
}

/**
 * Exporta relatório em formato PDF (versão simplificada usando print)
 */
export const exportToPDF = (playerStats?: any[], matchInfo?: any): void => {
  try {
    // Cria uma nova janela com o conteúdo formatado para impressão
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('⚠️ Bloqueio de pop-up detectado. Permita pop-ups para exportar PDF.')
      return
    }

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Scout Team - Relatório de Estatísticas</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          h2 {
            color: #1e40af;
            margin-top: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #2563eb;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .header-info {
            background-color: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .efficiency-high { color: #16a34a; font-weight: bold; }
          .efficiency-medium { color: #eab308; font-weight: bold; }
          .efficiency-low { color: #dc2626; font-weight: bold; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>🏐 Scout Team - Relatório de Estatísticas</h1>
    `

    if (matchInfo) {
      htmlContent += `
        <div class="header-info">
          <p><strong>Partida:</strong> ${matchInfo.homeTeam} vs ${matchInfo.awayTeam}</p>
          <p><strong>Data:</strong> ${new Date(matchInfo.date).toLocaleDateString('pt-BR')}</p>
          <p><strong>Resultado:</strong> ${matchInfo.finalScore}</p>
        </div>
      `
    }

    if (playerStats && playerStats.length > 0) {
      htmlContent += `
        <h2>Estatísticas por Jogador</h2>
        <table>
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Camisa</th>
              <th>Ações</th>
              <th>Saques</th>
              <th>Ataques</th>
              <th>Bloqueios</th>
              <th>Recepções</th>
              <th>Eficiência</th>
            </tr>
          </thead>
          <tbody>
      `

      playerStats.forEach((player) => {
        const efficiency = (
          (player.serves.efficiency +
            player.attacks.efficiency +
            player.blocks.efficiency +
            player.receptions.efficiency) /
          4
        ).toFixed(1)

        const efficiencyClass =
          parseFloat(efficiency) >= 50
            ? 'efficiency-high'
            : parseFloat(efficiency) >= 30
            ? 'efficiency-medium'
            : 'efficiency-low'

        htmlContent += `
          <tr>
            <td>${player.playerName}</td>
            <td>#${player.jerseyNumber}</td>
            <td>${player.totalActions}</td>
            <td>${player.serves.total} (${player.serves.aces} aces)</td>
            <td>${player.attacks.total} (${player.attacks.kills} pts)</td>
            <td>${player.blocks.total} (${player.blocks.kills} pts)</td>
            <td>${player.receptions.total}</td>
            <td class="${efficiencyClass}">${efficiency}%</td>
          </tr>
        `
      })

      htmlContent += `
          </tbody>
        </table>
      `
    }

    htmlContent += `
        <p style="margin-top: 40px; color: #6b7280; font-size: 12px;">
          Relatório gerado em ${new Date().toLocaleString('pt-BR')} por Scout Team
        </p>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    // Aguarda carregar e abre diálogo de impressão
    printWindow.onload = () => {
      printWindow.print()
    }

    console.log('✅ PDF gerado (use a opção "Salvar como PDF" na impressão)')
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error)
    alert('❌ Erro ao gerar PDF. Verifique o console.')
  }
}
