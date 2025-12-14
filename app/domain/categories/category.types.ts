export type CategoryKey =
  | 'pet'
  | 'type'
  | 'age'
  | 'size'
  | 'flavour'
  | 'unit'

export interface CategoryOption {
  id: string
  label: string
}

export interface CategoryRule {
  when: {
    category: CategoryKey
    values: string[]
  }
  options: CategoryOption[]
}

export interface CategoryConfigItem {
  label: string
  options?: CategoryOption[]
  dependsOn?: CategoryKey
  rules?: CategoryRule[]
}

export type CategoryConfig = Record<CategoryKey, CategoryConfigItem>

export type CategoryContext = Partial<Record<CategoryKey, string>>
