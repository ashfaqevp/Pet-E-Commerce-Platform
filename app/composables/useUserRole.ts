import { useState } from '#imports'

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
 * The plugin that already watches auth state calls `loadUserRole()` once; cards
 * read this state synchronously and re-render when it lands. Order pricing is
 * unaffected — `useCheckoutOrder` still reads the role server-side at creation
 * time, which is the only place it is authoritative.
 */
export const useUserRole = () =>
  useState<UserRole>('user-role', () => 'customer')

export const useLoadUserRole = () => {
  const role = useUserRole()
  const user = useSupabaseUser()
  const { getProfile } = useProfile()
  // Auth fires several events per page load (INITIAL_SESSION, SIGNED_IN, and a
  // TOKEN_REFRESHED about once an hour). The role only changes when the user
  // does, so the query runs on a change of identity, not on every event.
  const loadedFor = useState<string | null>('user-role-loaded-for', () => null)

  return async (): Promise<void> => {
    const userId = user.value?.id ?? null
    if (loadedFor.value === userId) return
    loadedFor.value = userId

    if (!userId) {
      role.value = 'customer'
      return
    }
    try {
      const profile = await getProfile()
      role.value = (profile?.role as UserRole) || 'customer'
    } catch {
      // A failed lookup falls back to retail pricing, which is what a signed-out
      // visitor sees anyway — never a reason to break the page.
      role.value = 'customer'
      loadedFor.value = null
    }
  }
}
