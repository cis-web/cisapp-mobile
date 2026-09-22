// /api/send-notification.js
// -----------------------------------------------------------------------
// Vercel Serverless Function — Proxy بۆ OneSignal REST API
// -----------------------------------------------------------------------

const ONESIGNAL_APP_ID =
    process.env.ONESIGNAL_APP_ID || "f103e0e1-472e-4533-9661-31bd9c91f743";
const ONESIGNAL_REST_API_KEY =
    process.env.ONESIGNAL_REST_API_KEY ||
    "";

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    try {
        const { target, title, body } = req.body || {};

        if (!target || !title || !body) {
            res.status(400).json({ error: "target, title, and body پێویستن" });
            return;
        }

        const payload = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title },
            contents: { en: body }
        };

        if (target.externalId) {
            payload.include_aliases = { external_id: [String(target.externalId)] };
            payload.target_channel = "push";
        } else if (target.externalIds && target.externalIds.length) {
            payload.include_aliases = { external_id: target.externalIds.map(String) };
            payload.target_channel = "push";
        } else if (target.role && target.level && target.group) {
            payload.filters = [
                { field: "tag", key: "role", relation: "=", value: target.role },
                { operator: "AND" },
                { field: "tag", key: "level", relation: "=", value: String(target.level) },
                { operator: "AND" },
                { field: "tag", key: "group", relation: "=", value: String(target.group) }
            ];
        } else if (target.role) {
            payload.filters = [
                { field: "tag", key: "role", relation: "=", value: target.role }
            ];
        } else if (target.includeAll) {
            payload.included_segments = ["Subscribed Users"];
        } else {
            res.status(400).json({ error: "target دروست نییە" });
            return;
        }

        const osResponse = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Basic " + ONESIGNAL_REST_API_KEY
            },
            body: JSON.stringify(payload)
        });

        const osData = await osResponse.json().catch(() => ({}));

        if (!osResponse.ok) {
            res.status(osResponse.status).json({ error: "OneSignal error", details: osData });
            return;
        }

        res.status(200).json({ success: true, data: osData });
    } catch (e) {
        res.status(500).json({ error: "Server error", details: e.message });
    }
};
