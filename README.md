# Scout Team

Plataforma de scout e análise estatística para voleibol. Registra ações em vídeo, calcula métricas por fundamento e expõe portais mobile para atletas e comissão técnica.

## Stack

- **Next.js 15** (App Router, Server Components)
- **Chakra UI** — design system
- **TypeScript**
- **Prisma + SQLite** — banco local para o operador
- **Turso** (libSQL) — banco cloud sincronizado para os portais

## Funcionalidades

- Scout por vídeo: registro de ações (ataque, saque, recepção, bloqueio, defesa, levantamento) por zona e resultado
- Estatísticas por atleta e por partida: eficiência, positividade, heatmaps de coordenadas, radar chart
- Portal do atleta: acesso mobile com stats pessoais, fundamentos e histórico de partidas
- Portal do treinador: visão completa do elenco, métricas de equipe e análise individual
- Sincronização local → cloud via botão "Publicar agora" em Configurações

## Rodando localmente

```bash
npm install
npx prisma migrate dev
npm run dev
```

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL="file:./dev.db"
TURSO_DATABASE_URL="libsql://..."   # opcional para dev
TURSO_AUTH_TOKEN="..."              # opcional para dev
```

Para o portal de acesso, crie `users.private.json` na raiz (ver `users.private.example.json` se existir).

## Deploy (Vercel)

Variáveis de ambiente necessárias:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | `file:./dev.db` (usado só no build para o `prisma generate`) |
| `TURSO_DATABASE_URL` | URL do banco Turso |
| `TURSO_AUTH_TOKEN` | Token de autenticação Turso |
| `PORTAL_USERS` | JSON com os usuários do portal (conteúdo de `users.private.json`) |

Antes do primeiro acesso em produção, acesse Configurações e clique em **Publicar agora** para sincronizar os dados locais com o Turso.
