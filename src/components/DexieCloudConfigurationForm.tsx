import { useState, type FormEvent } from 'react'
import {
  DexieCloudUrlValidationError,
  normalizeDexieCloudUrl,
} from '../config/dexieCloudConfiguration'

interface DexieCloudConfigurationFormProps {
  initialUrl?: string
  submitLabel: string
  onSubmit: (normalizedUrl: string) => void
}

export default function DexieCloudConfigurationForm({
  initialUrl = '',
  submitLabel,
  onSubmit,
}: DexieCloudConfigurationFormProps) {
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      onSubmit(normalizeDexieCloudUrl(url))
    } catch (caughtError) {
      setError(
        caughtError instanceof DexieCloudUrlValidationError
          ? caughtError.message
          : 'Impossible de valider cette URL Dexie Cloud.',
      )
    }
  }

  return (
    <form className="dexie-cloud-config-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="dexie-cloud-url">URL de la base Dexie Cloud</label>
      <input
        id="dexie-cloud-url"
        name="dexieCloudUrl"
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://votre-base.dexie.cloud"
        value={url}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? 'dexie-cloud-url-error' : 'dexie-cloud-url-help'}
        onChange={event => setUrl(event.target.value)}
      />
      <p id="dexie-cloud-url-help" className="settings-hint">
        Cette URL n’est pas un secret. Elle reste enregistrée uniquement dans ce navigateur.
      </p>
      {error ? (
        <p id="dexie-cloud-url-error" className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit">{submitLabel}</button>
    </form>
  )
}
