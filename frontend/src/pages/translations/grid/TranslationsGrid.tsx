import { useTranslation } from 'react-i18next'
import { useTranslationsContext, LANGS } from '@hooks'
import { Card } from '@components/ui/Card'
import { TRANSLATIONS_GRID_I18N } from './TranslationsGrid.constant'
import './TranslationsGrid.style.css'

function TranslationsGrid() {
  const { t } = useTranslation()
  const { data, filteredKeys, handleChange } = useTranslationsContext()
  return (
    <Card noPadding>
      <div className="translations-grid__header">
        <div className="translations-grid__header-cell">Key</div>
        <div className="translations-grid__header-cell--lang">EN</div>
        <div className="translations-grid__header-cell--lang">RO</div>
      </div>
      {filteredKeys.length === 0 ? (
        <div className="translations-grid__empty">
          {t(TRANSLATIONS_GRID_I18N.NO_RESULTS)}
        </div>
      ) : (
        <div className="translations-grid__body">
          {filteredKeys.map(key => (
            <div key={key} className="translations-grid__row">
              <div className="px-4 py-2 flex items-center">
                <code className="translations-grid__key">{key}</code>
              </div>
              {LANGS.map(lang => (
                <div key={lang} className="translations-grid__cell">
                  <textarea
                    rows={1}
                    value={data[lang][key] ?? ''}
                    onChange={e => handleChange(lang, key, e.target.value)}
                    className="translations-grid__textarea"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export { TranslationsGrid }
