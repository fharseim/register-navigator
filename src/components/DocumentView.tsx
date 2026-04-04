import { useState } from "react";
import { FileText, Download, Package, ChevronDown, ChevronRight, ArrowLeft, Paperclip } from "lucide-react";
import { Company, RegisterDocument, getDocumentsForCompany } from "@/data/mockCompanies";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface DocumentViewProps {
  company: Company;
  onBack: () => void;
}

const statusColors: Record<Company["status"], string> = {
  aktiv: "bg-success/10 text-success",
  aufgelöst: "bg-warning/10 text-warning",
  gelöscht: "bg-destructive/10 text-destructive",
  "in Liquidation": "bg-warning/10 text-warning",
  "Insolvenz eröffnet": "bg-destructive/10 text-destructive",
};

export default function DocumentView({ company, onBack }: DocumentViewProps) {
  const documents = getDocumentsForCompany(company.id);
  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    documents.forEach(d => {
      s.add(d.id);
      if (d.subDocuments?.[0]) s.add(d.subDocuments[0].id);
    });
    return s;
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(documents.filter(d => d.subDocuments).map(d => d.id)));

  const toggleDoc = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedCount = selected.size;

  const handleDownload = () => {
    toast.success(`${selectedCount} Dokument(e) werden heruntergeladen...`, {
      description: `RegisterPilot_${company.name.replace(/[^a-zA-Z0-9]/g, "_")}_2026-04-04.zip`,
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Zurück zur Suche
      </button>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{company.name}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {company.city} · {company.court} · {company.registerNumber}
              </p>
              <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[company.status]}`}>
                {company.status}
              </span>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Verfügbare Dokumente</h3>

          <div className="space-y-1">
            {documents.map(doc => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                selected={selected}
                expanded={expanded}
                onToggle={toggleDoc}
                onExpand={toggleExpand}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 border-t border-border bg-muted/30 space-y-3">
          <Button onClick={handleDownload} disabled={selectedCount === 0} className="w-full h-12 text-base gap-2">
            <Download className="h-5 w-5" />
            Ausgewählte Dokumente herunterladen ({selectedCount})
          </Button>
          <Button variant="outline" onClick={handleDownload} className="w-full h-11 gap-2">
            <Package className="h-4 w-4" />
            Alles herunterladen als ZIP
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({ doc, selected, expanded, onToggle, onExpand }: {
  doc: RegisterDocument;
  selected: Set<string>;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onExpand: (id: string) => void;
}) {
  const hasSubs = doc.subDocuments && doc.subDocuments.length > 0;
  const isExpanded = expanded.has(doc.id);

  return (
    <div>
      <div className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors">
        <Checkbox checked={selected.has(doc.id)} onCheckedChange={() => onToggle(doc.id)} />
        {hasSubs ? (
          <button onClick={() => onExpand(doc.id)} className="text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : <div className="w-4" />}
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">{doc.label}</span>
        </div>
        {doc.meta && <span className="text-xs text-muted-foreground whitespace-nowrap">{doc.meta}</span>}
      </div>

      {hasSubs && isExpanded && (
        <div className="ml-14 border-l-2 border-border pl-4 pb-1">
          {doc.subDocuments!.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors">
              <Checkbox checked={selected.has(sub.id)} onCheckedChange={() => onToggle(sub.id)} />
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">{sub.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
