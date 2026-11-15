import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { store } from '../gameStore'
import { createSave } from '../persistence/saveFile'
import { downloadSaveFile } from '../persistence/fileTransfer'
import { t } from './i18n'
import { ISSUES_URL } from './links'
import './ErrorBoundary.css'

interface State {
  error: Error | null
}

// A friendly crash screen (Milestone 9; development plan: "an error boundary
// that shows a friendly screen and a 'download my save' button. Never lose a
// player's town"). React only supports error boundaries as class components,
// the one deliberate exception to the function-components rule.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept in the console for bug reports; nothing is sent anywhere.
    console.error('Common Ground crashed:', error, info.componentStack)
  }

  private downloadSave = (): void => {
    try {
      downloadSaveFile(createSave(store.getState()))
    } catch {
      // If even that fails, the autosave in the browser is still there.
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash">
        <div className="crash-card" role="alert">
          <div className="crash-emoji" aria-hidden="true">
            🌧️
          </div>
          <h1>{t('crash.title')}</h1>
          <p>{t('crash.body')}</p>
          <div className="crash-actions">
            <button type="button" className="crash-primary" onClick={this.downloadSave}>
              {t('crash.download')}
            </button>
            <button type="button" onClick={() => window.location.reload()}>
              {t('crash.reload')}
            </button>
          </div>
          <p className="crash-small">
            {t('crash.report')}{' '}
            <a href={ISSUES_URL} target="_blank" rel="noreferrer">
              {t('crash.reportLink')}
            </a>
          </p>
          <details>
            <summary>{t('crash.details')}</summary>
            <code>{this.state.error.message}</code>
          </details>
        </div>
      </div>
    )
  }
}
