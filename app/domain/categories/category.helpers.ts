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
  // Special-case: size labels appear when unit is 'size_label'
  if (key === 'size' && config.dependsOn === 'unit' && config.options && config.options.length) {
    const v = context['unit']
    const units = Array.isArray(v) ? v : (v ? [v] : [])
    if (units.includes('size_label')) return config.options
  }
  if (!config.rules) return []
  const dependsArr = Array.isArray(dependsValue)
    ? dependsValue
    : (dependsValue ? [dependsValue] : [])
  if (dependsArr.length === 0) {
    const all = config.rules.flatMap(rule => rule.options)
    return all.filter((o, i, arr) => arr.findIndex(x => x.id === o.id) === i)
  }

  const matchedRules = config.rules.filter(rule =>
    rule.when.values.some(v => dependsArr.includes(v)),
  )
  const opts = matchedRules.flatMap(rule => rule.options)
  return opts.filter((o, i, arr) => arr.findIndex(x => x.id === o.id) === i)
}

export const getCategoryLabel = (key: CategoryKey): string =>
  CATEGORY_CONFIG[key]?.label ?? key

export const isCategoryVisible = (key: CategoryKey, context: CategoryContext = {}): boolean => {
  const config = CATEGORY_CONFIG[key]
  if (!config) return false
  if (!config.dependsOn) return true
  const dependsValue = context[config.dependsOn]
  const hasDep = Array.isArray(dependsValue) ? dependsValue.length > 0 : !!dependsValue
  if (!hasDep) return false
  return getCategoryOptions(key, context).length > 0
}

export const isCategoryRequired = (key: CategoryKey, context: CategoryContext = {}): boolean => {
  const config = CATEGORY_CONFIG[key]
  if (!config) return false
  if (config.required) return true
  if (!config.requiredWhen) return false
  return config.requiredWhen.some(rule => {
    const v = context[rule.category]
    if (Array.isArray(v)) {
      return v.length > 0 && v.some(x => rule.values.includes(x))
    }
    return !!v && rule.values.includes(v as string)
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
      const has = Array.isArray(v) ? v.length > 0 : !!v
      if (!has) {
        issues.push({ key: k, message: `${getCategoryLabel(k)} is required` })
      }
    }
  }
  return issues
}
