// ═══════════════════════════════════════════════════════════════
// LightCenter.kz — серверная функция: заявка в Telegram + сохранение в базу
// Токен бота и доступ к базе — на сервере, в браузер не попадают.
//
// Куда вставить: Supabase → Edge Functions → функция send-lead → Code → вставить всё → Deploy updates
// Verify JWT: ВЫКЛЮЧЕН
// Секреты (Edge Functions → Secrets): TG_BOT_TOKEN, TG_CHAT_IDS
// (SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY доступны в функции автоматически)
// ═══════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const token = Deno.env.get("TG_BOT_TOKEN");
    const chatIds = (Deno.env.get("TG_CHAT_IDS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!token || chatIds.length === 0) {
      console.error("[send-lead] Секреты TG_BOT_TOKEN / TG_CHAT_IDS не заданы");
      return json({ ok: false, error: "not_configured" }, 500);
    }

    let payload: { text?: unknown; lead?: Record<string, unknown> };
    try { payload = await req.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

    const text = String(payload?.text ?? "").slice(0, 3500).trim();
    if (!text) return json({ ok: false, error: "empty_text" }, 400);

    // 1) отправка в Telegram
    const results = await Promise.all(chatIds.map(async (chatId) => {
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
        });
        if (!r.ok) console.error("[send-lead] Telegram отклонил:", r.status, await r.text());
        return r.ok;
      } catch (e) { console.error("[send-lead] Ошибка Telegram:", e); return false; }
    }));

    // 2) сохранение в базу (не блокирует ответ, ошибки только логируем)
    if (payload?.lead && typeof payload.lead === "object") {
      try {
        const supaUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supaUrl && serviceKey) {
          const admin = createClient(supaUrl, serviceKey);
          const l = payload.lead as Record<string, unknown>;
          const clip = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));
          const amt = Number(l.amount);
          await admin.from("leads").insert({
            type: clip(l.type, 20) ?? "lead",
            order_id: clip(l.order_id, 40),
            name: clip(l.name, 200),
            phone: clip(l.phone, 40),
            message: clip(l.message, 2000),
            product: clip(l.product, 400),
            amount: Number.isFinite(amt) ? Math.trunc(amt) : null,
          });
        }
      } catch (e) { console.error("[send-lead] Не удалось сохранить заявку в базу:", e); }
    }

    return json({ ok: results.some(Boolean) });
  } catch (e) {
    console.error("[send-lead] Непредвиденная ошибка:", e);
    return json({ ok: false, error: "server_error" }, 500);
  }
});
