import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { companyId, court, registerNumber } = await req.json();

    if (!companyId || !court || !registerNumber) {
      return new Response(
        JSON.stringify({ error: "companyId, court and registerNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Layer 1: Check document cache
    const { data: cached } = await supabase
      .from("document_cache")
      .select("documents, fetched_at")
      .eq("company_id", companyId)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return new Response(
          JSON.stringify({ documents: cached.documents, source: "cache" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Layer 2: Fetch live from handelsregister.de
    const documents = await fetchDocumentsFromHandelsregister(court, registerNumber);

    // Upsert into cache
    await supabase.from("document_cache").upsert({
      company_id: companyId,
      court,
      register_number: registerNumber,
      documents,
      fetched_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ documents, source: "live" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-documents error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchDocumentsFromHandelsregister(court, registerNumber) {
  const params = new URLSearchParams({
    "form:schlagwoerter": registerNumber,
    "form:schlagwortOptionen": "2",
    "form:registerArt": extractRegisterType(registerNumber),
    "form:ergebnisseProSeite": "10",
    "form:btnSuche": "Suchen",
    "javax.faces.ViewState": "stateless",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      "https://www.handelsregister.de/rp_web/erweitertesuche.xhtml",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (compatible; RegisterPilot/1.0; +https://registerpilot.de)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "de-DE,de;q=0.9",
        },
        body: params.toString(),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) throw new Error("Handelsregister returned " + res.status);
    const html = await res.text();
    return parseDocumentList(html, court, registerNumber);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function extractRegisterType(registerNumber) {
  const match = registerNumber.match(/^(HRA|HRB|GnR|PR|VR)/i);
  if (!match) return "HRB";
  const typeMap = { HRA: "HRA", HRB: "HRB", GNR: "GnR", PR: "PR", VR: "VR" };
  return typeMap[match[1].toUpperCase()] || "HRB";
}

function parseDocumentList(html, court, registerNumber) {
  const documents = [];

  // Try to find document links
  const linkRegex = /href="([^"]*dokumentenansicht[^"]*)"[^>]*>([^<]+)</gi;
  let match;
  let idx = 0;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1].startsWith("http")
      ? match[1]
      : "https://www.handelsregister.de" + match[1];
    documents.push({
      id: court + "-" + registerNumber + "-doc-" + idx++,
      label: match[2].trim(),
      type: inferDocType(match[2]),
      meta: court + " - " + registerNumber,
      url,
    });
  }

  // Fallback: synthesize standard document types
  if (documents.length === 0) {
    const base = "https://www.handelsregister.de/rp_web/documents.xhtml?" +
      new URLSearchParams({ gericht: court, registerNummer: registerNumber }).toString();
    const standardDocs = [
      { type: "AD", label: "Aktueller Ausdruck (AD)" },
      { type: "CD", label: "Chronologischer Ausdruck (CD)" },
      { type: "HD", label: "Historischer Ausdruck (HD)" },
      { type: "UT", label: "Unternehmensträger (UT)" },
    ];
    for (const doc of standardDocs) {
      documents.push({
        id: court + "-" + registerNumber + "-" + doc.type,
        label: doc.label,
        type: doc.type,
        meta: court + " - " + registerNumber,
        url: base + "&docType=" + doc.type,
      });
    }
  }

  return documents;
}

function inferDocType(label) {
  const l = label.toUpperCase();
  if (l.includes("AKTUELL") || l.startsWith("AD")) return "AD";
  if (l.includes("CHRONOLOG") || l.startsWith("CD")) return "CD";
  if (l.includes("HISTOR") || l.startsWith("HD")) return "HD";
  if (l.includes("UNTERNEHM") || l.startsWith("UT")) return "UT";
  return "OTHER";
}
