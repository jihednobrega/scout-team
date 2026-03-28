import {
  Box,
  Flex,
  Heading,
  Badge,
  Grid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react'
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface FundamentalCardProps {
  title: string
  emoji: string
  total: number
  stats: Array<{
    label: string
    value: number
    color: string
    helpColor: string
  }>
  badgeColor: string
}

export function FundamentalCard({
  title,
  emoji,
  total,
  stats,
  badgeColor,
}: FundamentalCardProps) {
  const pieData = stats.map((stat) => ({
    name: stat.label,
    value: stat.value,
    fill: stat.color,
  }))

  const getPercentage = (value: number) => {
    return ((value / total) * 100).toFixed(1)
  }

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      p={6}
      borderWidth="1px"
      borderColor="gray.700"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md" color="white">
          {emoji} {title}
        </Heading>
        <Badge colorScheme={badgeColor} fontSize="md" px={3} py={1}>
          {total} tentativas
        </Badge>
      </Flex>

      {/* Gráfico de Pizza */}
      <Box mb={4}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={(props: Record<string, unknown>) => `${props.name}: ${((props.percent as number) * 100).toFixed(1)}%`}
              labelLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#2D3748',
                border: '1px solid #4A5568',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [
                `${value} (${getPercentage(value)}%)`,
                '',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>

      {/* Estatísticas */}
      <Grid
        templateColumns={`repeat(${stats.length}, 1fr)`}
        gap={3}
      >
        {stats.map((stat) => (
          <Stat key={stat.label} textAlign="center">
            <StatLabel color={stat.color} fontSize="xs">
              {stat.label}
            </StatLabel>
            <StatNumber color={stat.color} fontSize="xl">
              {stat.value}
            </StatNumber>
            <StatHelpText color={stat.helpColor} fontSize="xs">
              {getPercentage(stat.value)}%
            </StatHelpText>
          </Stat>
        ))}
      </Grid>
    </Box>
  )
}
