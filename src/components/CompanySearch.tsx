import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Building2, Loader2 } from "lucide-react";
import { Company, mockCompanies } from "@/data/mockCompanies";

interface CompanySearchProps {
  onSelect: (company: Company) => void;
}

const statusColors: Record<Company["status"], string> = {
  aktiv: "text-success",
  aufgelöst: "text-warning",
  gelöscht: "text-destructive",
  "in Liquidation": "text-warning",
  "Insolvenz eröffnet": "text-destructive",
};

export default function CompanySearch({ onSelect }: CompanySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((q: string) => {
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    // Simulate API delay
    timerRef.current = setTimeout(() => {
      const lower = q.toLowerCase();
      setResults(mockCompanies.filter(c => c.name.toLowerCase().includes(lower)));
      setOpen(true);
      setLoading(false);
    }, 400);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    setActiveIndex(-1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && activeIndex >= 0) { onSelect(results[activeIndex]); setOpen(false); setQuery(results[activeIndex].name); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Unternehmensname eingeben..."
          className="w-full h-14 pl-12 pr-12 rounded-xl border border-border bg-card text-foreground text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-[400px] overflow-y-auto">
          {results.map((c, i) => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setOpen(false); setQuery(c.name); }}
              className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors border-b border-border last:border-b-0 ${i === activeIndex ? "bg-muted" : "hover:bg-muted/50"}`}
            >
              <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{c.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {c.city} · {c.court} · {c.registerNumber}
                </div>
                <span className={`text-xs font-medium ${statusColors[c.status]}`}>
                  Status: {c.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.length >= 3 && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-lg p-6 text-center text-muted-foreground">
          Keine Treffer für „{query}"
        </div>
      )}
    </div>
  );
}
