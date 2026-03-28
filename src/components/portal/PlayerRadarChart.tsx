'use client'

import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts'

interface ChartPoint { subject: string; A: number; fullMark: number }

export function PlayerRadarChart({ data, playerName }: { data: ChartPoint[]; playerName: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600 }}
        />
        <PolarRadiusAxis angle={30} domain={[0, 10]} hide tick={false} tickCount={0} />
        <Radar
          name={playerName}
          dataKey="A"
          stroke="#63b3ed"
          strokeWidth={2.5}
          fill="url(#portalRadarGradient)"
          fillOpacity={1}
          isAnimationActive={false}
        />
        <defs>
          <radialGradient id="portalRadarGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#63b3ed" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#3182ce" stopOpacity={0.12} />
          </radialGradient>
        </defs>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(15,22,40,0.95)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '12px',
            padding: '6px 12px',
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
