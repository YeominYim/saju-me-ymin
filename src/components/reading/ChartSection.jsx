import SajuChartCard from '@/components/reading/SajuChartCard'

export default function ChartSection({ chartViews }) {
  if (!Array.isArray(chartViews) || chartViews.length === 0) return null

  return (
    <section className="reading chart-reading">
      <h2 className="reading-title">사주 명식</h2>
      <div className="chart-cards">
        {chartViews.map((item, index) => (
          <SajuChartCard
            key={item.label || `chart-${index}`}
            label={item.label}
            view={item.view}
          />
        ))}
      </div>
    </section>
  )
}
