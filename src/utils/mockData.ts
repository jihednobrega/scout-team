import { PlayerStats } from '@/types/scout';
import { Player } from '@/types/player';


export interface RallyAction {
  player: string;
  playerName: string;
  playerNumber: number;
  action: string; // 'Serve', 'Reception', 'Set', 'Attack', 'Block', 'Dig'
  quality: string; // 'Ace', 'Perfect', 'Positive', 'Error', 'Kill'
}

export interface PointHistory {
  set: number;
  score: { home: number; away: number }; // Score AFTER the point
  winner: 'home' | 'away';
  endAction: string;
  player?: string;
  description: string;
  rallyActions: RallyAction[]; // The sequence of events
  servingTeam: 'home' | 'away';
  rotation: { home: number; away: number }; // 1-6 representing the setter's zone or simply the rotation number
  homeLineup: string[]; // IDs of home players on court
}

export interface MatchReportData {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  duration: string;
  score: {
    home: number;
    away: number;
    sets: Array<{ home: number; away: number }>;
  };
  players: PlayerStats[];
  pointHistory: PointHistory[];
}

const FALLBACK_PLAYERS = [
  { id: 'p1', name: 'Bruno Rezende', number: 1, position: 'Levantador' },
  { id: 'p2', name: 'Wallace de Souza', number: 8, position: 'Oposto' },
  { id: 'p3', name: 'Yoandy Leal', number: 9, position: 'Ponteiro' },
  { id: 'p4', name: 'Ricardo Lucarelli', number: 18, position: 'Ponteiro' },
  { id: 'p5', name: 'Lucas Saatkamp', number: 16, position: 'Central' },
  { id: 'p6', name: 'Flávio Gualberto', number: 23, position: 'Central' },
  { id: 'p7', name: 'Thales Hoss', number: 6, position: 'Libero' },
  { id: 'p8', name: 'Fernando Kreling', number: 14, position: 'Levantador' },
  { id: 'p9', name: 'Alan Souza', number: 21, position: 'Oposto' },
];

// Helper to normalize player data from any source
interface NormalizedPlayer {
  id: string;
  name: string;
  number: number;
  position: string;
}

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seedStr: string) {
    let h = 0x811c9dc5;
    for (let i = 0; i < seedStr.length; i++) {
        h ^= seedStr.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    this.seed = h >>> 0;
  }

  // Returns number between 0 (inclusive) and 1 (exclusive)
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  // Returns integer between min and max (inclusive)
  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

function generateRandomStats(player: NormalizedPlayer, setsPlayed: number, rng: SeededRandom): PlayerStats {
  const isLibero = player.position.toLowerCase().includes('libero') || player.position.toLowerCase().includes('líbero');
  const isSetter = player.position.toLowerCase().includes('setter') || player.position.toLowerCase().includes('levantador');
  const isMiddle = player.position.toLowerCase().includes('middle') || player.position.toLowerCase().includes('central');

  const rnd = (min: number, max: number) => rng.range(min, max);

  // Serve
  const serveTotal = isLibero ? 0 : rnd(3, 6) * setsPlayed;
  const aces = isLibero ? 0 : rnd(0, Math.ceil(setsPlayed / 2));
  const serveErrors = isLibero ? 0 : rnd(0, setsPlayed);
  const serveEff = serveTotal > 0 ? (aces - serveErrors) / serveTotal : 0;

  // Reception
  const recTotal = (isLibero || (!isMiddle && !isSetter)) ? rnd(5, 10) * setsPlayed : rnd(0, 2);
  const recPerfect = Math.floor(recTotal * (rnd(30, 60) / 100));
  const recPositive = Math.floor(recTotal * (rnd(20, 30) / 100));
  const recErrors = Math.floor(recTotal * (rnd(0, 10) / 100));
  const recPositivity = recTotal > 0 ? (recPerfect + recPositive) / recTotal : 0;
  const recPerfRate = recTotal > 0 ? recPerfect / recTotal : 0;

  // Attack
  const atkTotal = isLibero ? 0 : (isSetter ? rnd(1, 2) * setsPlayed : rnd(5, 12) * setsPlayed);
  const atkKills = isLibero ? 0 : Math.floor(atkTotal * (rnd(35, 60) / 100));
  const atkErrors = isLibero ? 0 : Math.floor(atkTotal * (rnd(5, 15) / 100));
  const atkBlocked = isLibero ? 0 : Math.floor(atkTotal * (rnd(5, 10) / 100));
  const atkEff = atkTotal > 0 ? (atkKills - atkErrors - atkBlocked) / atkTotal : 0;
  const killRate = atkTotal > 0 ? atkKills / atkTotal : 0;

  // Block
  const blkTotal = isLibero ? 0 : rnd(2, 5) * setsPlayed;
  const blkPoints = isLibero ? 0 : (isMiddle ? rnd(1, 2) * setsPlayed : rnd(0, 1) * setsPlayed);
  const blkErrors = isLibero ? 0 : rnd(0, 1) * setsPlayed;
  const blkTouches = isLibero ? 0 : rnd(1, 3) * setsPlayed;
  const blkPtsPerSet = setsPlayed > 0 ? blkPoints / setsPlayed : 0;

  // Defense (Digs)
  const digTotal = rnd(2, 5) * setsPlayed;
  const digPerfect = Math.floor(digTotal * (rnd(40, 70) / 100));
  const digPositive = Math.floor(digTotal * (rnd(20, 30) / 100));
  const digErrors = Math.floor(digTotal * (rnd(5, 15) / 100));
  const digEff = digTotal > 0 ? (digPerfect + digPositive) / digTotal : 0;

  // Set
  const setTotal = isSetter ? rnd(20, 35) * setsPlayed : rnd(0, 2);
  const setPerfect = isSetter ? Math.floor(setTotal * (rnd(35, 55) / 100)) : 0;
  const setErrors = rnd(0, Math.ceil(setsPlayed / 2));

  const points = aces + atkKills + blkPoints;

  return {
    playerId: player.id,
    matchesPlayed: 1,
    setsPlayed,
    points,
    serve: {
      total: serveTotal,
      aces,
      errors: serveErrors,
      efficiency: parseFloat(serveEff.toFixed(3)),
      rating: rnd(60, 90)
    },
    reception: {
      total: recTotal,
      perfect: recPerfect,
      positive: recPositive,
      errors: recErrors,
      positivity: parseFloat(recPositivity.toFixed(3)),
      perfectRate: parseFloat(recPerfRate.toFixed(3)),
      rating: rnd(60, 90)
    },
    attack: {
      total: atkTotal,
      kills: atkKills,
      errors: atkErrors,
      blocked: atkBlocked,
      efficiency: parseFloat(atkEff.toFixed(3)),
      killRate: parseFloat(killRate.toFixed(3)),
      rating: rnd(60, 90)
    },
    block: {
      total: blkTotal,
      points: blkPoints,
      errors: blkErrors,
      touches: blkTouches,
      pointsPerSet: parseFloat(blkPtsPerSet.toFixed(2)),
      rating: rnd(60, 90)
    },
    defense: {
      total: digTotal,
      perfect: digPerfect,
      positive: digPositive,
      errors: digErrors,
      efficiency: parseFloat(digEff.toFixed(3)),
      rating: rnd(60, 90)
    },
    set: {
      total: setTotal,
      perfect: setPerfect,
      errors: setErrors,
      rating: rnd(60, 90)
    }
  };
}

function generateRallyActions(winner: 'home' | 'away', endAction: string, scorer: NormalizedPlayer | null, players: NormalizedPlayer[], rng: SeededRandom): RallyAction[] {
   const history: RallyAction[] = [];
   const homePlayers = players.filter(p => !p.position.toLowerCase().includes('libero')); // Simplified lineup
   const setter = players.find(p => p.position.toLowerCase().includes('levantador') || p.position.toLowerCase().includes('setter')) || players[0];
   const libero = players.find(p => p.position.toLowerCase().includes('libero') || p.position.toLowerCase().includes('líbero'));
   
   // Helper to add action
   const add = (p: NormalizedPlayer | undefined, act: string, qual: string) => {
      if (!p) return;
      history.push({
          player: p.id,
          playerName: p.name,
          playerNumber: p.number,
          action: act,
          quality: qual
      });
   };

   // Simple state machine for rally simulation
   // If Home wins with Stick/Kill, implies successful transition
   // Opponent Serve -> Reception (Home) -> Set (Home) -> Attack (Home) -> Point
   // If Home wins with Block, implies: Opponent Attack -> Home Block
   // If Home wins with Opponent Error, implies rally led to error
   
   if (winner === 'home') {
       if (endAction === 'Ace') {
           // Home Serve -> Ace
           add(scorer || undefined, 'Serve', 'Ace');
       } else if (endAction === 'Attack Kill') {
           // Opponent Serve (implicit) -> Reception -> Set -> Attack
           // Random receiver (Libero or OH)
           const receiver = libero || homePlayers[0];
           add(receiver, 'Reception', 'Perfect');
           add(setter, 'Set', 'Perfect');
           add(scorer || undefined, 'Attack', 'Kill');
       } else if (endAction === 'Block Kill') {
           // Opponent Attack -> Home Block
           add(scorer || undefined, 'Block', 'Kill');
       } else if (endAction === 'Opponent Error') {
           // Maybe Home Serve -> Opponent Reception Error?
           // Or long rally... let's do simple serve -> error
           const server = homePlayers[Math.floor(rng.next() * homePlayers.length)];
           add(server, 'Serve', 'Positive');
       }
   } else {
       // Away wins
       // If Away wins, it means Home might have received and erred, or Away attacked and killed.
       // Let's simulate Home receiving and getting killed on defense or erring.
       if (endAction === 'Attack Kill') { // Away Attack
           // Home might have dug? or just ball hits floor.
       }
   }
   return history;
}

function generatePointHistory(sets: Array<{ home: number, away: number }>, players: NormalizedPlayer[], rng: SeededRandom): PointHistory[] {
  const history: PointHistory[] = [];
  const actions = ['Attack Kill', 'Ace', 'Block Kill', 'Opponent Error'];
  
  // Basic lineup selection (First 6 non-liberos + 1 libero for swaps)
  const availablePlayers = players.filter(p => !p.position.toLowerCase().includes('libero'));
  const starters = availablePlayers.slice(0, 6);
  // Ensure we have 6 players, if not pad with available (shouldn't happen with valid team)
  while (starters.length < 6 && players.length > 0) {
      starters.push(players[Math.floor(rng.next() * players.length)]);
  }

  // Initial Rotations (1-6)
  let homeRotation = 1; 
  let awayRotation = 1;
  
  sets.forEach((setScore, setIndex) => {
    let currentHome = 0;
    let currentAway = 0;
    const setNum = setIndex + 1;
    
    // Random server start
    let servingTeam: 'home' | 'away' = rng.next() > 0.5 ? 'home' : 'away';

    // Simulate point by point
    while (currentHome < setScore.home || currentAway < setScore.away) {
      // Determine winner
      let winner: 'home' | 'away';
      
      if (currentHome === setScore.home) winner = 'away';
      else if (currentAway === setScore.away) winner = 'home';
      else {
          winner = rng.next() > 0.5 ? 'home' : 'away';
      }

      const actionType = actions[Math.floor(rng.next() * actions.length)];
      
      // Determine scorer based on action
      let player: NormalizedPlayer | null | undefined = null;

      if (winner === 'home') {
          // If Home wins, pick a player from the current starters
          player = starters[Math.floor(rng.next() * starters.length)];
      }

      if (winner === 'home') currentHome++;
      else currentAway++;

      let description = '';
      if (winner === 'home') {
        if (actionType === 'Opponent Error') {
           description = 'Opponent Error';
        } else {
           description = `${actionType} by #${player?.number} ${player?.name}`;
        }
      } else {
        description = 'Point for Opponent';
      }
      
      // Generate detailed rally actions
      const rallyActions = generateRallyActions(winner, actionType, player, players, rng);

      history.push({
        set: setNum,
        score: { home: currentHome, away: currentAway },
        winner,
        endAction: actionType,
        player: winner === 'home' ? player?.id : undefined,
        description,
        rallyActions,
        servingTeam,
        rotation: { home: homeRotation, away: awayRotation },
        homeLineup: starters.map(p => p.id)
      });
      
      // Rotation Logic
      // If serving team wins point, they keep serving (no rotation)
      // If receiving team wins point (Side-out), they rotate and serve next.
      
      if (winner !== servingTeam) {
          // Side-out happened. The NEW serving team (winner) rotates before serving.
          if (winner === 'home') {
              homeRotation = homeRotation === 6 ? 1 : homeRotation + 1;
              // Simulate rotation of lineup array (positions shift)
              const server = starters.shift();
              if (server) starters.push(server); // Simple array cycle to represent rotation feel
          } else {
              awayRotation = awayRotation === 6 ? 1 : awayRotation + 1;
          }
      }

      // Update serving team for next point
      servingTeam = winner;
    }
  });
  return history;
}

export function generateMockMatchReport(id?: string, providedPlayers?: Player[], teamName?: string): MatchReportData {
  const matchId = id || 'match-default';
  const rng = new SeededRandom(matchId);
  const homeTeamName = teamName || 'Scout Team';

  // Use provided players or fallback, normalizing them
  const playersList: NormalizedPlayer[] = (providedPlayers && providedPlayers.length > 0) 
    ? providedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        number: p.jerseyNumber,
        position: p.position
      }))
    : FALLBACK_PLAYERS.map(p => ({ ...p, id: p.id })); // Use fallback if empty

  // Deterministic outcomes based on seed
  const setsCount = rng.range(3, 5);
  const isHomeWin = rng.next() > 0.3; 
  
  const sets = [];
  let homeSets = 0;
  let awaySets = 0;
  
  for (let i = 0; i < 5; i++) {
    if (homeSets === 3 || awaySets === 3) break;
    
    const isTiebreak = i === 4;
    const minPoints = isTiebreak ? 15 : 25;
    
    let setWinner = 'home';
    if (isHomeWin) {
       if (homeSets === 2 && awaySets === 2) setWinner = 'home';
       else if (homeSets + (5-i) <= 3) setWinner = 'home';
       else setWinner = rng.next() > 0.4 ? 'home' : 'away';
    } else {
       if (homeSets === 2 && awaySets === 2) setWinner = 'away';
       else setWinner = rng.next() > 0.6 ? 'home' : 'away';
    }

    let scoreWinner = minPoints;
    let scoreLoser = rng.range(15, minPoints - 2);
    
    if (rng.next() > 0.8) {
      scoreWinner = minPoints + rng.range(1, 5);
      scoreLoser = scoreWinner - 2;
    }

    if (setWinner === 'home') {
        sets.push({ home: scoreWinner, away: scoreLoser });
        homeSets++;
    } else {
        sets.push({ home: scoreLoser, away: scoreWinner });
        awaySets++;
    }
  }

  const playersWithStats = playersList.map(p => {
    return generateRandomStats(p, sets.length, rng);
  });
  
  const pointHistory = generatePointHistory(sets, playersList, rng);
  
  const dateOffset = rng.range(0, 90 * 24 * 60 * 60 * 1000);
  const date = new Date(Date.now() - dateOffset).toLocaleDateString();

  return {
    matchId,
    homeTeam: homeTeamName,
    awayTeam: 'Opponent Volei',
    date,
    duration: `${1 + rng.range(0, 1)}h ${rng.range(10, 59)}m`,
    score: {
      home: homeSets,
      away: awaySets,
      sets: sets
    },
    players: playersWithStats,
    pointHistory
  };
}

export function generateMatchList(count: number = 8, players?: Player[], teamName?: string): MatchReportData[] {
    const list: MatchReportData[] = [];
    for (let i = 0; i < count; i++) {
        list.push(generateMockMatchReport(`match-${i}`, players, teamName));
    }
    return list.sort((a,b) => b.matchId.localeCompare(a.matchId)); 
}
