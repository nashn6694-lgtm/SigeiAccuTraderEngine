# AccuTrader — Vercel deployment

This package converts the original single-file AccuTrader page into a Vercel-ready project.

## What changed

- The trading page remains a static `index.html`.
- The Deriv App ID used by the browser is kept as a client-side value because the trading WebSocket flow needs it in the browser.
- The markup PAT is no longer embedded in the HTML.
- The markup admin password is no longer embedded in the HTML.
- Markup validation and the Deriv markup-statistics request now run through `api/markup.js`.
- The markup PAT and admin password are supplied through Vercel Environment Variables.

## Vercel setup

1. Create a new Vercel project and import this folder/repository.
2. In **Project Settings → Environment Variables**, add:

   - `DERIV_APP_ID` — the same Deriv App ID used by the original build.
   - `MARKUP_PAT_TOKEN` — your Deriv markup/partner PAT.
   - `MARKUP_ADMIN_PASSWORD` — choose a strong new admin password.

3. Apply the variables to the environment you will deploy (normally Production, and Preview if you want preview deployments to access markup).
4. Deploy the project.
5. Open the deployed site over `https://...vercel.app`.
6. Test **Trading → Connect** with a valid user PAT.
7. Test **Markup → Unlock**, then **REFRESH MARKUP**.

## Important security note

Do not put the markup PAT or admin password in `index.html`, GitHub, or `.env` files committed to source control. If the old PAT has been used elsewhere or shared publicly, rotate/revoke it in Deriv and put the replacement in Vercel.

The user trading PAT is still entered by the user in the browser, matching the original app design.

## Local testing

A normal `file://` open is not suitable for this app because the original source expects HTTP and WebSocket/CORS access. Use Vercel, or a local Vercel development server.


## OAuth 2.0 / PKCE notes

- Start OAuth from `https://www.nashdbot.space`.
- The registered callback is `https://www.nashdbot.space/callback`.
- OAuth `state` and PKCE `code_verifier` are stored only in same-origin `sessionStorage` for the short-lived login transaction.
- OAuth does not load, persist, or populate the PAT field.
- If OAuth is started from another host, the app first redirects to the canonical `www.nashdbot.space` origin before creating the OAuth transaction.
