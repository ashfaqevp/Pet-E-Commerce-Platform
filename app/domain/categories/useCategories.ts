import { computed, reactive } from 'vue'
import { getCategoryOptions, getCategoryLabel, isCategoryVisible, isCategoryRequired, getVisibleKeys, getDependents, collectCategoryIssues } from './category.helpers'
import type { CategoryContext, CategoryKey } from './category.types'

export const useCategories = () => {
  const context = reactive<CategoryContext>({})

  const setCategory = (key: CategoryKey, value: string | string[]) => {
    context[key] = value
  }

  const clearCategory = (key: CategoryKey) => {
    delete context[key]
  }

  const options = (key: CategoryKey) =>
    computed(() => getCategoryOptions(key, context))

  return {
    context,
    setCategory,
    clearCategory,
    options,
    getCategoryLabel,
    isCategoryVisible: (key: CategoryKey) => isCategoryVisible(key, context),
    isCategoryRequired: (key: CategoryKey) => isCategoryRequired(key, context),
    getVisibleKeys: () => getVisibleKeys(context),
    getDependents,
    collectCategoryIssues: () => collectCategoryIssues(context),
  }
}
