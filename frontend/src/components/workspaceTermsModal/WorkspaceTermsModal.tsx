import { useState } from 'react'
import { useAuth } from '@context'
import { Btn } from '../ui/Button'
import { STORAGE_KEY } from './STORAGE_KEY.constant'
import { WORKSPACE_TERMS_MODAL_TEXT as TEXT } from './WorkspaceTermsModal.constant'
import './WorkspaceTermsModal.style.css'

export function WorkspaceTermsModal() {
  const { user } = useAuth()
  const [accepted, setAccepted] = useState(
    () => !user || localStorage.getItem(STORAGE_KEY) === user.name,
  )
  const [checked, setChecked] = useState(false)

  if (accepted || !user) return null

  function confirm() {
    localStorage.setItem(STORAGE_KEY, user!.name)
    setAccepted(true)
  }

  return (
    <div className="workspace-terms-modal__overlay">
      <div className="workspace-terms-modal__card">
        <h2 className="workspace-terms-modal__title">{TEXT.TITLE}</h2>
        <p className="workspace-terms-modal__subtitle">{TEXT.SUBTITLE}</p>

        <div className="workspace-terms-modal__terms">
          <div>
            <p className="workspace-terms-modal__section-title">{TEXT.PURPOSE_HEADING}</p>
            <p>{TEXT.PURPOSE_BODY}</p>
          </div>
          <div>
            <p className="workspace-terms-modal__section-title">{TEXT.WARRANTY_HEADING}</p>
            <p>{TEXT.WARRANTY_BODY}</p>
          </div>
          <div>
            <p className="workspace-terms-modal__section-title">{TEXT.PRIVACY_HEADING}</p>
            <p>{TEXT.PRIVACY_BODY}</p>
          </div>
          <div>
            <p className="workspace-terms-modal__section-title">{TEXT.USE_HEADING}</p>
            <p>{TEXT.USE_BODY}</p>
          </div>
          <div>
            <p className="workspace-terms-modal__section-title">{TEXT.LICENSE_HEADING}</p>
            <p>{TEXT.LICENSE_BODY}</p>
          </div>
        </div>

        <label className="workspace-terms-modal__accept-label">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="workspace-terms-modal__checkbox"
          />
          <span className="workspace-terms-modal__accept-text">{TEXT.ACCEPT_LABEL}</span>
        </label>

        <Btn
          onClick={confirm}
          disabled={!checked}
          className="workspace-terms-modal__submit"
        >
          {TEXT.SUBMIT_LABEL}
        </Btn>
      </div>
    </div>
  )
}
