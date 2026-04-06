import { useState, useEffect } from "react";
import { FileText, Download, ArrowLeft, Loader2, AlertCircle, CheckSquare, Square } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Company } from "./CompanySearch";

interface Document {
  id: string;
  label: string;
  type: string;
  meta: string;
  url: string;
}

interface DocumentViewProps {
  company: Company;
  onBack: () => void;
}

export default function DocumentView({ company, onBack }: DocumentViewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("fetch-documents", {
          body: {
            companyId: company.id,
            court: company.court || "",
            registerNumber: company.register_number || "",
          },
        });
        if (fnError) throw fnError;
        if (!cancelled) {
          setDocuments(data?.documents || []);
          setSource(data?.source || "");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("fetch-documents error:", err);
          setError("Dokumente konnten nicht geladen werden. Bitte versuche es erneut.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [company]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === documents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(documents.map((d) => d.id)));
    }
  };

  const handleDownload = (doc: Document) => {
    window.open(doc.url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadSelected = () => {
    documents
      .filter((d) => selected.has(d.id))
      .forEach((d) => window.open(d.url, "_blank", "noopener,noreferrer"));
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Suche
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        {/* Company header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{company.name}</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
            {company.city && <span>{company.city}</span>}
            {company.register_number && (
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                {company.register_number}
              </span>
            )}
            {company.court && <span>{company.court}</span>}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Dokumente werden geladen...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Document list */}
        {!loading && !error && documents.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {selected.size === documents.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  Alle auswahlen
                </button>
                <span className="text-xs text-muted-foreground">
                  {documents.length} Dokument{documents.length !== 1 ? "e" : ""}
                  {source === "cache" && " (gecacht)"}
                </span>
              </div>
              {selected.size > 0 && (
                <button
                  onClick={handleDownloadSelected}
                  className="flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  {selected.size} herunterladen
                </button>
              )}
            </div>

            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
                >
                  <button onClick={() => toggleSelect(doc.id)} className="shrink-0">
                    {selected.has(doc.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{doc.label}</div>
                    <div className="text-xs text-muted-foreground">{doc.meta}</div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    className="shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-accent transition-all"
                    title="Herunterladen"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Empty state */}
        {!loading && !error && documents.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Keine Dokumente gefunden.</p>
          </div>
        )}
      </div>
    </div>
  );
}
