// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper for CSV escaping
const escapeCsv = (str: any) => {
  if (str === null || str === undefined) return "";
  const string = String(str);
  if (string.includes(",") || string.includes('"') || string.includes("\n")) {
    return `"${string.replace(/"/g, '""')}"`;
  }
  return string;
};

Deno.serve(async (req) => {
  console.log("[generate-report] Function invoked.");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[generate-report] Missing Authorization header.");
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("[generate-report] Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    console.log(`[generate-report] Authenticated as user: ${user.id}`);

    const { group_id, format = 'pdf' } = await req.json();
    if (!group_id) {
      console.error("[generate-report] Missing group_id.");
      return new Response(JSON.stringify({ error: "group_id is required" }), { status: 400, headers: corsHeaders });
    }
    console.log(`[generate-report] Generating report for group: ${group_id}, format: ${format}`);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    console.log(`[generate-report] Fetching data for period: ${startOfMonth} to ${endOfMonth}`);
    const [groupRes, expensesRes, balancesRes, paymentsRes] = await Promise.all([
      supabase.from("groups").select("name").eq("id", group_id).single(),
      supabase.from("expenses").select("title, amount, category, expense_type, created_at, purchase_date, created_by").eq("group_id", group_id).gte("purchase_date", startOfMonth).lte("purchase_date", endOfMonth).order("purchase_date"),
      supabase.rpc("get_member_balances", { _group_id: group_id }),
      supabase.from("payments").select("amount, status, created_at").eq("group_id", group_id).gte("created_at", startOfMonth).lte("created_at", endOfMonth),
    ]);

    if (groupRes.error) throw new Error(`Failed to fetch group: ${groupRes.error.message}`);
    if (expensesRes.error) throw new Error(`Failed to fetch expenses: ${expensesRes.error.message}`);
    if (balancesRes.error) throw new Error(`Failed to fetch balances: ${balancesRes.error.message}`);
    if (paymentsRes.error) throw new Error(`Failed to fetch payments: ${paymentsRes.error.message}`);
    
    console.log("[generate-report] Data fetched successfully.");

    const groupName = groupRes.data?.name ?? "República";
    const expenses = expensesRes.data ?? [];
    const balances = balancesRes.data ?? [];
    const payments = paymentsRes.data ?? [];
    
    const userIds = new Set();
    balances.forEach((b) => userIds.add(b.user_id));
    expenses.forEach((e) => userIds.add(e.created_by));
    
    let nameMap = {};
    if (userIds.size > 0) {
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, full_name").in("id", Array.from(userIds));
      if (profileError) throw new Error(`Failed to fetch profiles: ${profileError.message}`);
      (profiles ?? []).forEach((p) => { nameMap[p.id] = p.full_name; });
    }
    console.log("[generate-report] Profile names mapped.");

    let fileData = "";
    let contentType = "";

    if (format === 'csv') {
      contentType = "text/csv";
      const header = ["Data", "Título", "Categoria", "Tipo", "Valor", "Criado Por"].join(",");
      const rows = expenses.map((e) => {
        const date = new Date(e.purchase_date || e.created_at).toLocaleDateString("pt-BR");
        const name = nameMap[e.created_by] || "Desconhecido";
        return [
          escapeCsv(date),
          escapeCsv(e.title),
          escapeCsv(e.category),
          escapeCsv(e.expense_type),
          e.amount,
          escapeCsv(name)
        ].join(",");
      });
      
      const csvContent = [header, ...rows].join("\n");
      fileData = btoa(unescape(encodeURIComponent(csvContent)));
    } else {
      contentType = "application/pdf";
      const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const totalPayments = payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + Number(p.amount), 0);
      const monthName = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let page = pdfDoc.addPage();
      let { height } = page.getSize();
      let y = height - 50;
      const margin = 50;

      const drawText = (text, options = {}) => {
        const size = options.size || 10;
        const f = options.font || font;
        if (y < margin) {
          page = pdfDoc.addPage();
          y = height - margin;
        }
        page.drawText(text, { x: margin, y, size, font: f, ...options });
        y -= (size + 5);
      };

      drawText(`RELATÓRIO MENSAL - ${groupName.toUpperCase()}`, { size: 18, font: fontBold });
      y -= 10;
      drawText(`Período: ${monthName}`, { size: 12 });
      y -= 20;

      drawText("RESUMO", { size: 14, font: fontBold });
      drawText(`Total de despesas: R$ ${totalExpenses.toFixed(2)}`);
      drawText(`Pagamentos confirmados: R$ ${totalPayments.toFixed(2)}`);
      y -= 20;

      drawText("DESPESAS DO MÊS", { size: 14, font: fontBold });
      if (expenses.length === 0) {
        drawText("Nenhuma despesa registrada.");
      } else {
        for (const e of expenses) {
          const date = new Date(e.purchase_date || e.created_at).toLocaleDateString("pt-BR");
          const type = e.expense_type === "collective" ? "Coletiva" : "Individual";
          const title = e.title.length > 40 ? e.title.substring(0, 40) + "..." : e.title;
          drawText(`${date} | R$ ${Number(e.amount).toFixed(2)} | ${type} | ${title}`);
        }
      }
      y -= 20;

      drawText("SALDOS", { size: 14, font: fontBold });
      if (balances.length === 0) drawText("Nenhum saldo calculado.");
      else {
        for (const b of balances) {
          const name = nameMap[b.user_id] || "Desconhecido";
          drawText(`${name}: Saldo R$ ${Number(b.balance).toFixed(2)} (Devido: R$ ${Number(b.total_owed).toFixed(2)})`);
        }
      }

      const pdfBytes = await pdfDoc.save();
      let binary = '';
      const len = pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      fileData = btoa(binary);
    }

    return new Response(JSON.stringify({ file: fileData, contentType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[generate-report] CATCH BLOCK ERROR:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), { status: 500, headers: corsHeaders });
  }
});