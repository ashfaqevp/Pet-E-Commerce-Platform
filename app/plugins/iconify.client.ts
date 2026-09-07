import { addCollection, type IconifyJSON } from '@iconify/vue'
import offlineIcons from '~/assets/icons/offline.json'

/**
 * `@iconify/vue` resolves an unknown icon name by fetching it from
 * api.iconify.design at runtime — a third-party DNS + TLS + request that only
 * starts once the entry bundle has booted, and that every icon on the page waits
 * behind. Registering the icons up front makes `<Icon />` render synchronously
 * and takes the API off the critical path entirely.
 *
 * `app/assets/icons/offline.json` holds only the icons this app actually uses
 * (~15 KB for all of them). Regenerate it with `pnpm icons` after adding a new
 * `<Icon name="…" />` — an icon that is missing from the bundle silently falls
 * back to the network fetch, so it renders, just slowly.
 */
export default defineNuxtPlugin(() => {
  // TS infers a union of per-collection literal shapes from the JSON; the file is
  // generated to Iconify's own schema, which the generator validates on write.
  for (const collection of offlineIcons as unknown as IconifyJSON[]) {
    addCollection(collection)
  }
})
