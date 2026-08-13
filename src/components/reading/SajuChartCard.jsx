const ELEMENT_CLASS = {
  목: 'el-wood',
  화: 'el-fire',
  토: 'el-earth',
  금: 'el-metal',
  수: 'el-water',
}

function ElementCell({ hanja, ko, element, sub }) {
  return (
    <div className={`chart-cell ${ELEMENT_CLASS[element] || ''}`}>
      <span className="chart-hanja">{hanja}</span>
      <span className="chart-meta">
        {ko}
        {element ? ` · ${element}` : ''}
      </span>
      {sub ? <span className="chart-sub">{sub}</span> : null}
    </div>
  )
}

export default function SajuChartCard({ label, view }) {
  if (!view) return null

  return (
    <div className="saju-card">
      {label ? <h3 className="saju-card-label">{label}</h3> : null}

      <div className="saju-summary">
        <div className="saju-summary-item">
          <div className={`saju-badge ${ELEMENT_CLASS[view.dayElement] || ''}`}>
            <span>{view.dayStem}</span>
          </div>
          <p>일간 · {view.dayStemKo}{view.dayElement}</p>
        </div>
        <div className="saju-summary-item">
          <div className={`saju-badge ${ELEMENT_CLASS[view.dominantElement] || ''}`}>
            <span>{view.dominantElement || '-'}</span>
          </div>
          <p>강한 오행</p>
        </div>
        <div className="saju-summary-item">
          <div className="saju-badge el-neutral">
            <span className="saju-badge-text">{view.geukguk || '-'}</span>
          </div>
          <p>격국</p>
        </div>
      </div>

      <div className="saju-table-wrap" role="table" aria-label="사주 네 기둥">
        <div className="saju-table" role="rowgroup">
          <div className="saju-row saju-row-head" role="row">
            {view.pillars.map((p) => (
              <div key={p.key} className="saju-col-label" role="columnheader">
                {p.label}
              </div>
            ))}
          </div>

          <div className="saju-row" role="row">
            {view.pillars.map((p) => (
              <div key={`${p.key}-stem-god`} className="saju-god" role="cell">
                {p.stemGod}
              </div>
            ))}
          </div>

          <div className="saju-row" role="row">
            {view.pillars.map((p) => (
              <div key={`${p.key}-stem`} role="cell">
                <ElementCell
                  hanja={p.stem}
                  ko={p.stemKo}
                  element={p.stemElement}
                />
              </div>
            ))}
          </div>

          <div className="saju-row" role="row">
            {view.pillars.map((p) => (
              <div key={`${p.key}-branch`} role="cell">
                <ElementCell
                  hanja={p.branch}
                  ko={p.branchKo}
                  element={p.branchElement}
                />
              </div>
            ))}
          </div>

          <div className="saju-row" role="row">
            {view.pillars.map((p) => (
              <div key={`${p.key}-branch-god`} className="saju-god" role="cell">
                {p.branchGod}
              </div>
            ))}
          </div>

          <div className="saju-row" role="row">
            {view.pillars.map((p) => (
              <div key={`${p.key}-stage`} className="saju-god muted" role="cell">
                {p.stage}
              </div>
            ))}
          </div>
        </div>
      </div>

      {view.timeUnknown ? (
        <p className="saju-note">출생 시각 미상 · 시주는 정오 기준 참고값입니다.</p>
      ) : null}
    </div>
  )
}
