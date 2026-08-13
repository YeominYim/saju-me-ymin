import HistorySidebar from '@/components/history/HistorySidebar'
import ProfileModal from '@/components/profile/ProfileModal'
import ProfilePickerModal from '@/components/profile/ProfilePickerModal'
import ComposeReadingView from '@/components/reading/ComposeReadingView'
import GenreNav from '@/components/reading/GenreNav'
import SavedReadingView from '@/components/reading/SavedReadingView'
import ShareModal from '@/components/share/ShareModal'
import PageBackdrop from '@/components/ui/PageBackdrop'
import Toast from '@/components/ui/Toast'
import { useSajuApp } from '@/hooks/useSajuApp'
import { emptyPerson } from '@/lib/person'

export default function App() {
  const app = useSajuApp()

  return (
    <div className="page">
      <PageBackdrop />

      <GenreNav
        genreId={app.genreId}
        user={app.user}
        onChange={app.handleGenreChange}
      />

      <HistorySidebar
        user={app.user}
        ready={app.ready}
        profileName={app.self.name}
        readings={app.readings}
        activeId={app.activeReadingId || app.editingId}
        onSelect={app.handleSelectReading}
        onNew={app.handleNewReading}
        onDelete={app.handleDeleteReading}
        onAuthError={app.setError}
        onEditProfile={() => app.setPickerOpen(true)}
      />

      <main className="shell">
        {app.isViewing ? (
          <SavedReadingView app={app} />
        ) : (
          <ComposeReadingView app={app} />
        )}
      </main>

      <ProfilePickerModal
        open={app.pickerOpen && Boolean(app.user)}
        profiles={app.profiles}
        activeId={app.selectedProfileId}
        onSelect={(row) => {
          app.setPickerOpen(false)
          app.applyProfile(row)
        }}
        onCreate={app.openCreateProfile}
        onClose={() => app.setPickerOpen(false)}
      />

      <ProfileModal
        open={app.profileOpen && Boolean(app.user)}
        mode={app.profileMode}
        initialPerson={app.profileMode === 'create' ? emptyPerson : app.self}
        onSave={app.handleSaveProfile}
        onClose={() => {
          if (app.profileMode !== 'required') app.setProfileOpen(false)
        }}
      />

      <ShareModal
        open={app.shareOpen}
        shareId={app.shareId}
        title={`${app.self.name}의 ${app.genre.label} | 사주미`}
        onClose={() => app.setShareOpen(false)}
        onRevoke={app.user ? app.handleRevokeShare : undefined}
      />

      <Toast notice={app.toast} />
    </div>
  )
}
