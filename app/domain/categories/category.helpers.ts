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
  if (!config.rules) return []
  if (!dependsValue) {
    const all = config.rules.flatMap(rule => rule.options)
    return all.filter((o, i, arr) => arr.findIndex(x => x.id === o.id) === i)
  }

  const matchedRule = config.rules.find(rule =>
    rule.when.values.includes(dependsValue),
  )

  return matchedRule?.options ?? []
}

export const getCategoryLabel = (key: CategoryKey): string =>
  CATEGORY_CONFIG[key]?.label ?? key

export const isCategoryVisible = (key: CategoryKey, context: CategoryContext = {}): boolean => {
  const config = CATEGORY_CONFIG[key]
  if (!config) return false
  if (!config.dependsOn) return true
  return getCategoryOptions(key, context).length > 0
}

export const isCategoryRequired = (key: CategoryKey, context: CategoryContext = {}): boolean => {
  const config = CATEGORY_CONFIG[key]
  if (!config) return false
  if (config.required) return true
  if (!config.requiredWhen) return false
  return config.requiredWhen.some(rule => {
    const v = context[rule.category]
    return !!v && rule.values.includes(v)
  })
}

export const getDependents = (key: CategoryKey): CategoryKey[] => {
  return (Object.keys(CATEGORY_CONFIG) as CategoryKey[]).filter(k => CATEGORY_CONFIG[k].dependsOn === key)
}

export const getVisibleKeys = (context: CategoryContext = {}): CategoryKey[] => {
  return (Object.keys(CATEGORY_CONFIG) as CategoryKey[]).filter(k => isCategoryVisible(k, context))
}

export const collectCategoryIssues = (context: CategoryContext = {}): { key: CategoryKey; message: string }[] => {
  const issues: { key: CategoryKey; message: string }[] = []
  for (const k of Object.keys(CATEGORY_CONFIG) as CategoryKey[]) {
    if (isCategoryRequired(k, context)) {
      const v = context[k]
      if (!v) {
        issues.push({ key: k, message: `${getCategoryLabel(k)} is required` })
      }
    }
  }
  return issues
}
