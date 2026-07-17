import { useTranslation } from 'react-i18next'
import { useTranslationsContext, LANGS } from '@hooks'
import { Btn } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { PageTitle } from '@components/ui/PageTitle'
import { TRANSLATIONS_TOOLBAR_I18N } from './TranslationsToolbar.constant'
import './TranslationsToolbar.style.css'

function TranslationsToolbar() {
  const { t } = useTranslation()
  const { search, setSearch, saveState, handleSave, isDirty } = useTranslationsContext()
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <PageTitle>{t(TRANSLATIONS_TOOLBAR_I18N.TITLE)}</PageTitle>
      <div className="flex-1 min-w-48">
        <Input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t(TRANSLATIONS_TOOLBAR_I18N.SEARCH)}
        />
      </div>
      <div className="flex gap-2 ml-auto">
        {LANGS.map(lang => (
          <Btn
            key={lang}
            type="button"
            onClick={() => handleSave(lang)}
            disabled={saveState[lang] === 'saving' || !isDirty(lang)}
            className="flex items-center gap-2"
          >
            {saveState[lang] === 'saving'
              ? t(TRANSLATIONS_TOOLBAR_I18N.SAVING)
              : saveState[lang] === 'saved'
              ? t(TRANSLATIONS_TOOLBAR_I18N.SAVED)
              : `${t(TRANSLATIONS_TOOLBAR_I18N.SAVE)} ${lang.toUpperCase()}`}
            {isDirty(lang) && saveState[lang] === 'idle' && (
              <span className="translations-toolbar__dirty-dot" />
            )}
          </Btn>
        ))}
      </div>
    </div>
  )
}

export { TranslationsToolbar }
