import type { CategoryConfig } from './category.types'

export const CATEGORY_CONFIG: CategoryConfig = {
  pet: {
    label: 'Pet Type',
    required: true,
    options: [
      { id: 'cat', label: 'Cat' },
      { id: 'dog', label: 'Dog' },
      { id: 'bird', label: 'Bird' },
      { id: 'fish', label: 'Fish' },
      { id: 'other', label: 'Other' },
    ],
  },

  type: {
    label: 'Product Type',
    dependsOn: 'pet',
    rules: [
      {
        when: { category: 'pet', values: ['cat', 'dog', 'bird', 'fish', 'other'] },
        options: [
          { id: 'food', label: 'Food & Nutrition' },
          { id: 'treats', label: 'Treats & Supplements' },
          { id: 'health', label: 'Health & Wellness' },
          { id: 'grooming', label: 'Grooming & Hygiene' },
          { id: 'accessories', label: 'Accessories & Essentials' },
          { id: 'equipment', label: 'Equipment & Hardware' },
          { id: 'habitat', label: 'Tanks, Cages & Habitat' },
        ],
      },
    ],
  },

  age: {
    label: 'Age Group',
    dependsOn: 'pet',
    rules: [
      {
        when: { category: 'pet', values: ['cat'] },
        options: [
          { id: 'kitten', label: 'Kitten' },
          { id: 'adult', label: 'Adult' },
          { id: 'senior', label: 'Senior' },
        ],
      },
      {
        when: { category: 'pet', values: ['dog'] },
        options: [
          { id: 'puppy', label: 'Puppy' },
          { id: 'adult', label: 'Adult' },
          { id: 'senior', label: 'Senior' },
        ],
      },
      {
        when: { category: 'pet', values: ['fish', 'other'] },
        options: [
          { id: 'small', label: 'Small' },
          { id: 'medium', label: 'Medium' },
          { id: 'large', label: 'Large' },
        ],
      },
    ],
  },

  unit: {
    label: 'Unit',
    options: [
      { id: 'g', label: 'Gram (g)' },
      { id: 'kg', label: 'Kilogram (kg)' },
      { id: 'ml', label: 'Millilitre (ml)' },
      { id: 'l', label: 'Litre (L)' },
      { id: 'cm', label: 'Centimetre (cm)' },
      { id: 'pcs', label: 'Pieces (pcs)' },
      { id: 'watt', label: 'Watt (W)' },
    ],
  },

  size: {
    label: 'Size',
    dependsOn: 'unit',
    rules: [],
  },

flavour: {
  label: 'Flavour',
  dependsOn: 'type',
  rules: [
    {
      when: { category: 'type', values: ['food', 'treats'] },
      options: [
        // =====================
        // Poultry & Meat
        // =====================
        { id: 'chicken', label: 'Chicken' },
        { id: 'beef', label: 'Beef' },
        { id: 'lamb', label: 'Lamb' },
        { id: 'duck', label: 'Duck' },
        { id: 'turkey', label: 'Turkey' },
        { id: 'game', label: 'Game Meat' },
        { id: 'meat_mix', label: 'Meat Mix' },

        // =====================
        // Fish & Seafood
        // =====================
        { id: 'tuna', label: 'Tuna' },
        { id: 'salmon', label: 'Salmon' },
        { id: 'sardine', label: 'Sardine' },
        { id: 'mackerel', label: 'Mackerel' },
        { id: 'anchovy', label: 'Anchovy' },
        { id: 'shrimp', label: 'Shrimp' },
        { id: 'krill', label: 'Krill' },
        { id: 'mussels', label: 'Mussels' },
        { id: 'trout', label: 'Trout' },
        { id: 'ocean_fish', label: 'Ocean Fish' },
        { id: 'fish_mix', label: 'Fish Mix' },

        // =====================
        // Plant / Add-ons
        // =====================
        { id: 'rice', label: 'Rice' },
        { id: 'vegetable', label: 'Vegetables' },
        { id: 'spinach', label: 'Spinach' },
        { id: 'pumpkin', label: 'Pumpkin' },
        { id: 'carrot', label: 'Carrot' },
        { id: 'tomato', label: 'Tomato' },
        { id: 'cheese', label: 'Cheese' },
        { id: 'algae', label: 'Algae / Spirulina' },

        // =====================
        // Special / Other
        // =====================
        { id: 'fruit', label: 'Fruit' },
        { id: 'milk', label: 'Milk' },
        { id: 'egg', label: 'Egg' },
        { id: 'insect', label: 'Insect / Worms' },
        { id: 'gourmet', label: 'Gourmet' },
      ],
    },
  ],
},

} as const
