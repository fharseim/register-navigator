import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ companies: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Layer 1: pg_trgm search in local companies table
    const { data: localResults, error } = await supabase
      .from("companies")
      .select("id, name, city, court, register_number, legal_form, status")
      .ilike("name", "%" + query + "%")
      .eq("status", "aktiv")
      .limit(20);

    if (error) console.error("DB search error:", error);

    const results = localResults || [];

    // Layer 2: Live fallback from handelsregister.de if fewer than 5 local hits
    if (results.length < 5) {
      try {
        const liveResults = await fetchFromHandelsregister(query);
        // Merge: add live results not already in local DB
        const localIds = new Set(results.map((r) => r.id));
        for (const lr of liveResults) {
          if (!localIds.has(lr.id)) {
            results.push(lr);
          }
        }
      } catch (liveErr) {
        console.error("Live handelsregister fetch failed:", liveErr);
      }
    }

    return new Response(
      JSON.stringify({ companies: results.slice(0, 20) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("search-companies error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchFromHandelsregister(query) {
  const params = new URLSearchParams({
    "form:schlagwoerter": query,
    "form:schlagwortOptionen": "2",
    "form:ergebnisseProSeite": "20",
    "form:btnSuche": "Suchen",
    "javax.faces.ViewState": "stateless",
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

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
    if (!res.ok) throw new Error("HR returned " + res.status);
    const html = await res.text();
    return parseHandelsregisterResults(html);
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function parseHandelsregisterResults(html) {
  const results = [];
  // Match table rows with company data
  const rowRegex = /<tr[^>]*role="row"[^>]*>([sS]*?)</tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    const cells = [];
    const cellRegex = /<td[^>]*>([sS]*?)</td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(row)) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length >= 4) {
      const name = cells[0] || "";
      const city = cells[1] || "";
      const court = cells[2] || "";
      const registerNumber = cells[3] || "";
      if (name && registerNumber) {
        results.push({
          id: "live_" + registerNumber.replace(/\s/g, "_") + "_" + court.replace(/\s/g, "_"),
          name,
          city,
          court,
          register_number: registerNumber,
          legal_form: "",
          status: "aktiv",
        });
      }
    }
  }
  return results;
    }
