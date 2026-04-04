import { useState } from "react";
import { Shield } from "lucide-react";
import CompanySearch from "@/components/CompanySearch";
import DocumentView from "@/components/DocumentView";
import { Company } from "@/data/mockCompanies";

export default function Index() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">RegisterPilot</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:block">Handelsregisterdokumente · automatisiert</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center px-6">
        {!selectedCompany ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl -mt-16">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground text-center tracking-tight">
              Ein Eingabefeld. Ein Klick.
              <br />
              <span className="text-primary">Alle Dokumente.</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-center max-w-lg">
              Handelsregisterauszüge, Gesellschaftsverträge und Gesellschafterlisten – sofort abrufbar.
            </p>
            <div className="mt-8 w-full">
              <CompanySearch onSelect={setSelectedCompany} />
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
              {["Aktueller Abdruck", "Chronologischer Abdruck", "Gesellschaftsvertrag", "Gesellschafterliste"].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full py-8">
            <DocumentView company={selectedCompany} onBack={() => setSelectedCompany(null)} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          RegisterPilot · Daten aus dem Gemeinsamen Registerportal der Länder · Keine Rechtsberatung
        </p>
      </footer>
    </div>
  );
}
