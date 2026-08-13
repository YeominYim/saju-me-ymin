import ChartSection from '@/components/reading/ChartSection'
import ReadingActions from '@/components/reading/ReadingActions'
import ResultReading from '@/components/reading/ResultReading'
import { personByline } from '@/lib/person'

export default function SavedReadingView({ app }) {
  const {
    genre,
    self,
    partner,
    needsPartner,
    result,
    resultLocked,
    chartViews,
    sharing,
    user,
    handleShare,
    handleNewReading,
    handleEditReading,
    handleDeleteReading,
    activeReadingId,
  } = app

  const editLabel = needsPartner ? '상대 다시 입력' : '다시 보기'
  const deletePayload = {
    id: activeReadingId,
    partner_name: partner.name,
  }

  return (
    <div className="view-stack">
      <header className="hero hero-view">
        <div className="hero-copy">
          <p className="brand">사주미</p>
          <h1 className="headline">
            {self.name}
            {needsPartner && partner.name ? ` · ${partner.name}` : ''}
          </h1>
          <p className="sub-lead">{genre.label}</p>
          <p className="sub">{personByline(self)}</p>
          {needsPartner && partner.name ? (
            <p className="sub">{personByline(partner)}</p>
          ) : null}
        </div>
        <ReadingActions
          sharing={sharing}
          onShare={handleShare}
          onNew={handleNewReading}
          onEdit={handleEditReading}
          onDelete={() => handleDeleteReading(deletePayload)}
          editLabel={editLabel}
          showEdit
          showDelete
        />
      </header>

      <ChartSection chartViews={chartViews} />

      <ResultReading
        genre={genre}
        self={self}
        partner={partner}
        needsPartner={needsPartner}
        result={result}
        locked={resultLocked}
        onAuthError={app.setError}
      >
        <ReadingActions
          sharing={sharing}
          onShare={handleShare}
          onNew={handleNewReading}
          onEdit={handleEditReading}
          onDelete={() => handleDeleteReading(deletePayload)}
          editLabel={editLabel}
          showEdit={Boolean(user)}
          showDelete={Boolean(user)}
        />
      </ResultReading>
    </div>
  )
}
