import { useState, useRequestFetch } from '#imports'

export type UserRole = 'customer' | 'wholesaler' | 'admin'

/**
 * The signed-in user's role, resolved once per session.
 *
 * Pricing is role-aware, so every product card needs this. Reading it per card
 * meant an `await` in `<script setup>`, which turns each card into an async
 * component: a grid of 48 products opened 48 suspense boundaries that all had to
 * settle before anything painted, even though the shared `useAsyncData` key meant
 * they were waiting on one request.
 *
 * Under SSR this also has to be right *before* the HTML is sent. A wholesale
 * customer whose role only resolves after hydration would be served retail prices
 * in the document and watch them change under them. `plugins/user-role.ts` awaits
 * the lookup during the server render and `useState` carries the answer into the
 * payload, so the browser hydrates against the same number the server wrote.
 */
export const useUserRole = () =>
  useState<UserRole>('user-role', () => 'customer')

export const useLoadUserRole = () => {
  const role = useUserRole()
  const user = useSupabaseUser()
  // Auth fires several events per page load (INITIAL_SESSION, SIGNED_IN, and a
  // TOKEN_REFRESHED about once an hour). The role only changes when the user
  // does, so the lookup runs on a change of identity, not on every event.
  const loadedFor = useState<string | null>('user-role-loaded-for', () => null)

  /**
   * `useRequestFetch` rather than `$fetch`: during SSR it forwards the incoming
   * request's cookies, which is the only way the endpoint can see who is asking.
   * A bare `$fetch` to a relative path drops them, and `/api/auth/get-role`
   * answers 401 to an anonymous caller — so the role would silently come back
   * `customer` for every server-rendered wholesale visitor.
   *
   * Going through the endpoint rather than querying `profiles` directly is also
   * deliberate: it authenticates the caller and then reads the row with the
   * service key, so it does not depend on `profiles` being self-readable
   * under RLS.
   */
  const requestFetch = useRequestFetch()

  return async (): Promise<void> => {
    const userId = user.value?.id ?? null
    if (loadedFor.value === userId) return
    loadedFor.value = userId

    if (!userId) {
      role.value = 'customer'
      return
    }
    try {
      const { role: fetched } = await requestFetch<{ role: string | null }>('/api/auth/get-role')
      role.value = (fetched as UserRole) || 'customer'
    } catch {
      // A failed lookup falls back to retail pricing, which is what a signed-out
      // visitor sees anyway — never a reason to break the page. Clearing the
      // marker lets the next auth event retry rather than caching the fallback.
      role.value = 'customer'
      loadedFor.value = null
    }
  }
}
