/**
 * Resolves the signed-in user's role during the server render, before any price
 * is written into the HTML.
 *
 * This is the piece that makes role-aware pricing safe under SSR. Without it the
 * server would render every page as `customer` — retail prices — and a wholesale
 * customer would see them flip after hydration. Worse, the flip is the *good*
 * case: without the client-side correction they would simply be quoted the wrong
 * price.
 *
 * Universal, not `.client`: the point is the server pass. `useState` puts the
 * answer in the payload, so the browser hydrates against the same value instead
 * of refetching it. `auth.client.ts` keeps it current afterwards, when the user
 * signs in or out without a full page load.
 *
 * Anonymous visitors cost nothing here — `loadUserRole` returns without a request
 * when there is no session, which is the overwhelming majority of renders.
 */
export default defineNuxtPlugin(async () => {
  await useLoadUserRole()()
})
