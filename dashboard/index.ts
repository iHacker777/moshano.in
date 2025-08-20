// src/index.ts — Cloudflare Worker API (TypeScript, ESM)
import { neon } from "@neondatabase/serverless";

type Env = {
  DATABASE_URL: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  ADMIN_API_KEY: string;
  ALLOWED_ORIGIN?: string; // e.g. https://dashboard.moshano.in
};

const allow = (env: Env) => env.ALLOWED_ORIGIN || "*";
const json = (env: Env, data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": allow(env),
      "access-control-allow-headers": "authorization,content-type",
      "access-control-allow-methods": "GET,POST,OPTIONS",
    },
  });

function needAuth(req: Request, env: Env) {
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${env.ADMIN_API_KEY}`) {
    throw new Response("unauthorized", { status: 401 });
  }
}
// Return the authenticated user from a Bearer token.
// Supports legacy admin with ADMIN_API_KEY for backward compatibility.
async function authUser(req: Request, env: Env, db: ReturnType<typeof neon>) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) {
    throw new Response("unauthorized", { status: 401 });
  }
  const token = auth.slice(7).trim();

  // Legacy admin path (keeps all your existing flows working)
  if (token === env.ADMIN_API_KEY) {
    return { id: "env-admin", name: "Admin", email: env.ADMIN_EMAIL, role: "admin" };
  }

  // Session lookup
  const rows = await db<any>`
    select u.id, u.name, u.email, u.role
    from sessions s
    join users u on u.id = s.user_id
    where s.token = ${token} and s.expires_at > now()
    limit 1`;

  if (!rows.length) throw new Response("unauthorized", { status: 401 });
  return rows[0];
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") return json(env, null);
    const url = new URL(req.url);
    const db = neon(env.DATABASE_URL);

    // --- Public endpoints ---
    if (url.pathname === "/" || url.pathname === "/api/health") {
      return json(env, { ok: true, time: new Date().toISOString() });
    }

	if (url.pathname === "/api/login" && req.method === "POST") {
	  const { email, password } = await req.json().catch(() => ({}));

	  // 1) Try DB users first
	  const users = await db<any>`
		select id, name, email, password, role from users where email = ${email} limit 1`;
	  if (users.length) {
		const u = users[0];

		// MVP: plain compare; later replace with bcrypt.compare()
		if (password !== u.password) return new Response("bad creds", { status: 401 });

		// 2) Create a session token for this user (valid 7 days)
		const token = crypto.randomUUID();
		const sevenDays = 7 * 24 * 60 * 60; // seconds
		const expiresAt = new Date(Date.now() + sevenDays * 1000).toISOString();

		await db`
		  insert into sessions (token, user_id, expires_at)
		  values (${token}::uuid, ${u.id}::uuid, ${expiresAt}::timestamptz)`;

		return json(env, {
		  token,
		  user: { id: u.id, name: u.name, email: u.email, role: u.role }
		});
	  }

	  // 3) Fallback to legacy single admin from env (keeps your current creds working)
	  if (email === env.ADMIN_EMAIL && password === env.ADMIN_PASSWORD) {
		return json(env, {
		  token: env.ADMIN_API_KEY,
		  user: { id: "env-admin", name: "Admin", email, role: "admin" }
		});
	  }

	  return new Response("bad creds", { status: 401 });
	}



	if (url.pathname === "/api/me" && req.method === "GET") {
	  try {
		const me = await authUser(req, env, db);
		return json(env, me);
	  } catch (e: any) {
		return e;
	  }
	}


    // --- Protected endpoints ---
	if (url.pathname === "/api/stats" && req.method === "GET") {
	  let me; try { me = await authUser(req, env, db); } catch (e:any) { return e; }
	  const rows = await db<{ total: number; approved: number; pending: number; declined: number }[]>`
		select
		  count(*)::int as total,
		  sum((status='approved')::int)::int as approved,
		  sum((status='pending')::int)::int as pending,
		  sum((status='declined')::int)::int as declined
		from transaction_queue`;
	  return json(env, rows[0] || { total: 0, approved: 0, pending: 0, declined: 0 });
	}


	if (url.pathname === "/api/transactions" && req.method === "GET") {
	  let me; try { me = await authUser(req, env, db); } catch (e:any) { return e; }

	  const limit  = Math.min(parseInt(url.searchParams.get("limit")  || "50", 10), 200);
	  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
	  const hideEmpty = (url.searchParams.get("hideEmptyUtr") || "false") === "true";
	  const where = hideEmpty ? "where coalesce(utr,'') <> ''" : "";

		const rows = await db<any>`
		  select id, merchant_name, sender_upi_id, receiver_upi_id, utr, status,
				 amount_paise, merchant_callback_url, created_at
		  from transaction_queue ${db.unsafe(where)}
		  order by created_at desc
		  limit ${limit} offset ${offset}`;

	  return json(env, { rows });
	}


	const approve = url.pathname.match(/^\/api\/transactions\/([^/]+)\/approve$/);
	const decline = url.pathname.match(/^\/api\/transactions\/([^/]+)\/decline$/);
	if ((approve || decline) && req.method === "POST") {
	  let me; try { me = await authUser(req, env, db); } catch (e:any) { return e; }
	  if (me.role !== "admin") return new Response("forbidden", { status: 403 });

	  const id = (approve ?? decline)![1];
	  const newStatus = approve ? "approved" : "declined";

	  const updated = await db<any>`
		update transaction_queue set status = ${newStatus}
		where id = ${id}
		returning id, merchant_name, utr, merchant_callback_url`;
	  if (!updated.length) return new Response("not found", { status: 404 });

	  const t = updated[0];
	  fetch(t.merchant_callback_url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
		  id: t.id, status: newStatus, utr: t.utr, merchant: t.merchant_name, ts: new Date().toISOString()
		})
	  }).catch(() => {});

	  return json(env, { ok: true });
	}

    return new Response("not found", { status: 404 });
  },
};
