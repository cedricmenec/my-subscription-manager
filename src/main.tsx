import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { selectBootstrapTarget } from './bootstrap'
import { saveDexieCloudUrl } from './config/dexieCloudConfiguration'
import DexieCloudSetupPage from './pages/DexieCloudSetupPage'
import './styles.css'

const root = createRoot(document.getElementById('root')!)

async function renderApplication() {
  const target = await selectBootstrapTarget(async () => {
    const [{ default: App }, { db }] = await Promise.all([
      import('./App'),
      import('./data/db'),
    ])
    return { App, db }
  })

  if (target.mode === 'configuration') {
    root.render(
      <StrictMode>
        <DexieCloudSetupPage
          onConfigured={url => {
            saveDexieCloudUrl(url)
            window.location.reload()
          }}
        />
      </StrictMode>,
    )
    return
  }

  const { App, db } = target.application
  ;(window as Window & { db?: typeof db }).db = db
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void renderApplication()
