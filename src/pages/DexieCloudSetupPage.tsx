import DexieCloudConfigurationForm from '../components/DexieCloudConfigurationForm'

interface DexieCloudSetupPageProps {
  onConfigured: (normalizedUrl: string) => void
}

export default function DexieCloudSetupPage({ onConfigured }: DexieCloudSetupPageProps) {
  return (
    <main className="setup-page">
      <section className="setup-card" aria-labelledby="setup-title">
        <p className="section-label">Configuration obligatoire</p>
        <h1 id="setup-title">Connecter votre base Dexie Cloud</h1>
        <p>
          Abos est une application individuelle. L’adresse de votre base n’est pas incluse dans
          le site publié et doit être configurée sur chaque navigateur.
        </p>
        <div className="setup-warning" role="note">
          <strong>Installation existante :</strong> saisissez exactement la même URL qu’avant la
          migration pour retrouver la même base locale et vos données synchronisées. Une autre URL
          sélectionnera une base séparée sans supprimer l’ancienne.
        </div>
        <DexieCloudConfigurationForm
          submitLabel="Enregistrer et ouvrir Abos"
          onSubmit={onConfigured}
        />
        <p className="setup-security-note">
          Aucun fichier <code>dexie-cloud.key</code>, secret client ou mot de passe ne vous sera
          demandé. La connexion utilisateur s’effectuera ensuite par e-mail et OTP.
        </p>
      </section>
    </main>
  )
}
