import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'

export default function SkillRadar({ points }: { points: { skill: string; score: number | null }[] }) {
  return <div className="skill-radar" aria-hidden="true">
    <ResponsiveContainer>
      <RadarChart data={points} outerRadius="65%">
        <PolarGrid />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} />
        <Radar dataKey="score" stroke="#18577e" fill="#83c5ed" fillOpacity={0.4} />
      </RadarChart>
    </ResponsiveContainer>
  </div>
}
