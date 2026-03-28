// utils/backup.ts

/**
 * Exporta todos os jogadores para arquivo JSON
 */
export const exportPlayers = (): void => {
  try {
    const playersData = localStorage.getItem('scout-team-players')

    if (!playersData) {
      alert('⚠️ Nenhum jogador encontrado para exportar.')
      return
    }

    const players = JSON.parse(playersData)

    if (!Array.isArray(players) || players.length === 0) {
      alert('⚠️ Nenhum jogador encontrado para exportar.')
      return
    }

    // Adiciona metadados ao backup
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalPlayers: players.length,
      data: players,
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)

    const timestamp = new Date().toISOString().slice(0, 10)
    const fileName = `ScoutTeam_Jogadores_${timestamp}.json`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    console.log(`✅ Backup exportado: ${fileName}`)
    alert(`✅ Backup de ${players.length} jogador(es) exportado com sucesso!`)
  } catch (error) {
    console.error('❌ Erro ao exportar jogadores:', error)
    alert('❌ Erro ao exportar jogadores. Verifique o console.')
  }
}

/**
 * Importa jogadores de arquivo JSON
 */
export const importPlayers = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const backup = JSON.parse(content)

        // Validação básica
        if (!backup.data || !Array.isArray(backup.data)) {
          throw new Error('Formato de arquivo inválido')
        }

        // Verifica se tem jogadores
        if (backup.data.length === 0) {
          alert('⚠️ O arquivo não contém jogadores.')
          reject(new Error('Sem jogadores no arquivo'))
          return
        }

        // Pergunta se quer sobrescrever ou mesclar
        const currentData = localStorage.getItem('scout-team-players')
        let shouldProceed = true

        if (currentData) {
          const current = JSON.parse(currentData)
          const action = confirm(
            `Você tem ${current.length} jogador(es) cadastrado(s).\n\n` +
            `O arquivo contém ${backup.data.length} jogador(es).\n\n` +
            `Clique OK para SUBSTITUIR todos os jogadores atuais.\n` +
            `Clique CANCELAR para ADICIONAR aos jogadores existentes.`
          )

          if (!action) {
            // Mesclar: adicionar jogadores do backup aos existentes
            // Evita duplicatas por ID
            const existingIds = new Set(current.map((p: any) => p.id))
            const newPlayers = backup.data.filter((p: any) => !existingIds.has(p.id))
            backup.data = [...current, ...newPlayers]

            if (newPlayers.length === 0) {
              alert('⚠️ Todos os jogadores do backup já existem.')
              reject(new Error('Sem novos jogadores'))
              return
            }
          }
        }

        // Salva no localStorage
        localStorage.setItem('scout-team-players', JSON.stringify(backup.data))

        console.log(`✅ Importados ${backup.data.length} jogadores`)
        alert(
          `✅ Importação concluída!\n\n` +
          `${backup.data.length} jogador(es) agora cadastrados.\n` +
          `Recarregue a página para ver as mudanças.`
        )

        // Recarrega a página para atualizar o estado
        setTimeout(() => {
          window.location.reload()
        }, 1000)

        resolve()
      } catch (error) {
        console.error('❌ Erro ao importar:', error)
        alert('❌ Erro ao importar arquivo. Verifique se é um backup válido.')
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'))
    }

    reader.readAsText(file)
  })
}

/**
 * Exporta TODOS os dados do app (jogadores + partidas + preferências)
 */
export const exportAllData = (): void => {
  try {
    // Coleta todos os dados relevantes do localStorage
    const allData: Record<string, any> = {}

    const keys = [
      'scout-team-players',
      'scout_matches_history',
      'scout_current_match_actions',
      'scout_current_match_info',
    ]

    keys.forEach(key => {
      const data = localStorage.getItem(key)
      if (data) {
        try {
          allData[key] = JSON.parse(data)
        } catch {
          allData[key] = data // Se não for JSON, salva como string
        }
      }
    })

    // Adiciona backups também
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('scout_backup_')) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            allData[key] = JSON.parse(data)
          } catch {
            allData[key] = data
          }
        }
      }
    })

    if (Object.keys(allData).length === 0) {
      alert('⚠️ Nenhum dado encontrado para exportar.')
      return
    }

    // Cria backup completo
    const fullBackup = {
      version: '1.0',
      app: 'Scout Team',
      exportDate: new Date().toISOString(),
      data: allData,
    }

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)

    const timestamp = new Date().toISOString().slice(0, 10)
    const fileName = `ScoutTeam_BackupCompleto_${timestamp}.json`

    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)

    console.log(`✅ Backup completo exportado: ${fileName}`)
    alert(`✅ Backup completo exportado com sucesso!`)
  } catch (error) {
    console.error('❌ Erro ao exportar dados:', error)
    alert('❌ Erro ao exportar. Verifique o console.')
  }
}

/**
 * Importa backup completo
 */
export const importAllData = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const backup = JSON.parse(content)

        if (!backup.data || typeof backup.data !== 'object') {
          throw new Error('Formato de backup inválido')
        }

        // Confirmação
        const confirmed = confirm(
          `⚠️ ATENÇÃO: Esta ação irá SUBSTITUIR todos os dados atuais!\n\n` +
          `Backup de: ${new Date(backup.exportDate).toLocaleString('pt-BR')}\n\n` +
          `Deseja continuar?`
        )

        if (!confirmed) {
          reject(new Error('Cancelado pelo usuário'))
          return
        }

        // Restaura todos os dados
        Object.entries(backup.data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value))
        })

        alert(
          `✅ Backup restaurado com sucesso!\n\n` +
          `A página será recarregada.`
        )

        // Recarrega a página
        setTimeout(() => {
          window.location.reload()
        }, 1000)

        resolve()
      } catch (error) {
        console.error('❌ Erro ao importar backup:', error)
        alert('❌ Erro ao importar backup. Verifique se é um arquivo válido.')
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'))
    }

    reader.readAsText(file)
  })
}

/**
 * Verifica tamanho dos dados armazenados
 */
export const getStorageInfo = (): {
  totalSize: number
  players: number
  matches: number
  sizeFormatted: string
} => {
  let totalSize = 0
  let playersSize = 0
  let matchesSize = 0

  // Calcula tamanho
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const size = (localStorage[key].length + key.length) * 2 // aprox em bytes

      if (key === 'scout-team-players') {
        playersSize = size
      } else if (key.includes('match')) {
        matchesSize += size
      }

      totalSize += size
    }
  }

  const sizeKB = totalSize / 1024
  const sizeFormatted = sizeKB > 1024
    ? `${(sizeKB / 1024).toFixed(2)} MB`
    : `${sizeKB.toFixed(2)} KB`

  return {
    totalSize,
    players: playersSize,
    matches: matchesSize,
    sizeFormatted,
  }
}
