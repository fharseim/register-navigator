import { useState } from "react";
import CompanySearch, { Company } from "@/components/CompanySearch";
import DocumentView from "@/components/DocumentView";

export default function Index() {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {!selectedCompany ? (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight">RegisterPilot</h1>
              <p className="mt-3 text-lg text-muted-foreground">
                Handelsregister-Dokumente schnell finden und herunterladen
              </p>
            </div>
            <CompanySearch onSelect={setSelectedCompany} />
          </div>
        ) : (
          <DocumentView
            company={selectedCompany}
            onBack={() => setSelectedCompany(null)}
          />
        )}
      </div>
    </div>
  );
}
