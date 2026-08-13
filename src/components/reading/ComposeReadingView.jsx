import GenreAuthGate from '@/components/auth/GenreAuthGate'
import GuestUpgrade from '@/components/auth/GuestUpgrade'
import PersonForm from '@/components/profile/PersonForm'
import ProfileSummary from '@/components/profile/ProfileSummary'
import SajuGirl from '@/components/ui/SajuGirl'
import ChartSection from '@/components/reading/ChartSection'
import InterpretingScene from '@/components/reading/InterpretingScene'
import ReadingActions from '@/components/reading/ReadingActions'
import ReadingCount from '@/components/reading/ReadingCount'
import ReadingSkeleton from '@/components/reading/ReadingSkeleton'
import ResultReading from '@/components/reading/ResultReading'
import { DEFAULT_GENRE_ID } from '@/lib/genres'

export default function ComposeReadingView({ app }) {
  const {
    genre,
    self,
    partner,
    needsPartner,
    requiresAuth,
    resultLocked,
    result,
    loading,
    error,
    user,
    editingId,
    usesSavedProfile,
    profileComplete,
    profileReady,
    readingCount,
    chartViews,
    sharing,
    formKey,
    formPanelRef,
    nameInputRef,
    handleAnalyze,
    handleShare,
    handleNewReading,
    handleDeleteReading,
    handleGenreChange,
    setSelf,
    setPartner,
    setPickerOpen,
    setProfileMode,
    setProfileOpen,
    setError,
  } = app

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <SajuGirl size="lg" />
          <div className="hero-copy">
            <p className="brand">사주미</p>
            <h1 className="headline">{genre.label}</h1>
            <p className="sub-lead">{genre.headline}</p>
            <p className="sub">{genre.description}</p>
            <div className="genre-tags" aria-label="장르 태그">
              {genre.tags.map((tag) => (
                <span key={tag} className="genre-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section
        ref={formPanelRef}
        className="panel"
        key={formKey}
        aria-label={`${genre.label} 입력`}
      >
        {editingId && (
          <p className="edit-banner">
            {needsPartner
              ? '저장된 사주를 수정합니다. 상대 정보를 바꾸면 이 기록이 바뀝니다.'
              : '저장된 사주를 다시 봅니다. 다시 저장하면 이 기록이 바뀝니다.'}
          </p>
        )}

        {usesSavedProfile ? (
          <ProfileSummary
            title={needsPartner ? '본인' : ''}
            person={self}
            onChangeProfile={() => setPickerOpen(true)}
            onEdit={() => {
              setProfileMode('edit')
              setProfileOpen(true)
            }}
          />
        ) : (
          <PersonForm
            title={needsPartner ? '본인' : ''}
            person={self}
            onChange={setSelf}
            nameRef={nameInputRef}
          />
        )}

        {needsPartner && (
          <PersonForm
            title="상대"
            person={partner}
            onChange={setPartner}
          />
        )}

        {!user && requiresAuth ? (
          <GenreAuthGate
            genre={genre}
            onAuthError={setError}
            onSeeLife={() => handleGenreChange(DEFAULT_GENRE_ID)}
          />
        ) : (
          <button
            type="button"
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || (Boolean(user) && !profileComplete)}
          >
            {loading
              ? '명식을 들여다보는 중이에요!'
              : editingId
                ? `${genre.label} 다시 저장`
                : genre.buttonLabel}
          </button>
        )}

        {user && !profileComplete && profileReady && (
          <p className="auth-hint">프로필을 저장하면 사주를 볼 수 있습니다.</p>
        )}

        {error && <p className="error">{error}</p>}
      </section>

      <ReadingCount
        count={readingCount}
        visible={!result && !loading}
      />

      {loading && chartViews.length === 0 && (
        <ReadingSkeleton
          title="사주 명식"
          lines={5}
          status="명식을 그리는 중이에요!"
        />
      )}

      <ChartSection chartViews={chartViews} />

      {loading && !result && (
        <InterpretingScene title={`${genre.label} 해석`} />
      )}

      {result && (
        <ResultReading
          genre={genre}
          self={self}
          partner={partner}
          needsPartner={needsPartner}
          result={result}
          locked={resultLocked}
          onAuthError={setError}
        >
          <ReadingActions
            sharing={sharing}
            onShare={handleShare}
            onNew={handleNewReading}
            onDelete={() =>
              handleDeleteReading({
                id: editingId,
                partner_name: partner.name,
              })
            }
            showDelete={Boolean(editingId && user)}
          />
          {!user && !requiresAuth && <GuestUpgrade onAuthError={setError} />}
        </ResultReading>
      )}
    </>
  )
}
