import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface Company {
  id: string;
  name: string;
  city?: string;
  court?: string;
  register_number?: string;
  legal_form?: string;
  status?: string;
}

interface CompanySearchProps {
  onSelect: (company: Company) => void;
}

const statusColors: Record<string, string> = {
  aktiv: "text-success",
  aufgelost: "text-warning",
  geloscht: "text-destructive",
  "in Liquidation": "text-warning",
  "Insolvenz eroffnet": "text-destructive",
};

export default function CompanySearch({ onSelect }: CompanySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-companies", {
        body: { query: q },
      });
      if (error) throw error;
      const companies: Company[] = (data?.companies || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        city: r.city,
        court: r.court,
        register_number: r.register_number,
        legal_form: r.legal_form,
        status: r.status || "aktiv",
      }));
      setResults(companies);
      setOpen(companies.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      onSelect(results[activeIndex]);
      setOpen(false);
      setQuery(results[activeIndex].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Unternehmen suchen (z.B. Siemens AG)..."
          className="w-full pl-10 pr-10 py-3 rounded-lg border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Unternehmenssuche"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden"
        >
          {results.map((company, i) => (
            <li
              key={company.id}
              role="option"
              aria-selected={i === activeIndex}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-accent transition-colors ${
                i === activeIndex ? "bg-accent" : ""
              }`}
              onMouseDown={() => {
                onSelect(company);
                setQuery(company.name);
                setOpen(false);
              }}
            >
              <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{company.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  {company.city && <span>{company.city}</span>}
                  {company.register_number && (
                    <span className="font-mono">{company.register_number}</span>
                  )}
                  {company.court && <span>{company.court}</span>}
                  {company.status && (
                    <span className={statusColors[company.status] || "text-muted-foreground"}>
                      {company.status}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
