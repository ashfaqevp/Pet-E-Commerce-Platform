import { CATEGORY_CONFIG } from './category.config'
import type {
  CategoryContext,
  CategoryKey,
  CategoryOption,
} from './category.types'

export const getCategoryOptions = (
  key: CategoryKey,
  context: CategoryContext = {},
): CategoryOption[] => {
  const config = CATEGORY_CONFIG[key]
  if (!config) return []

  // No dependency → static options
  if (!config.dependsOn) {
    return config.options ?? []
  }

  const dependsValue = context[config.dependsOn]
  if (!dependsValue || !config.rules) return []

  const matchedRule = config.rules.find(rule =>
    rule.when.values.includes(dependsValue),
  )

  return matchedRule?.options ?? []
}

export const getCategoryLabel = (key: CategoryKey): string =>
  CATEGORY_CONFIG[key]?.label ?? key
