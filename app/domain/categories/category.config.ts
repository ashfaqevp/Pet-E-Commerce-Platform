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
    rules: [
      {
        when: { category: 'unit', values: ['g'] },
        options: [
          1.3, 3, 14, 15, 16, 19.25, 19.8, 20, 21.25, 21.8,
          25, 37, 40, 45, 50, 60, 70, 75, 80, 85, 90,
          100, 110, 140, 150, 170, 180, 185, 195, 200,
          220, 250, 350, 360, 400, 425, 500, 570, 600,
          800, 850, 900, 907, 908, 1000, 1362,
        ].map(v => ({ id: `${v}g`, label: `${v} g` })),
      },
      {
        when: { category: 'unit', values: ['kg'] },
        options: [
          1, 1.3, 1.5, 1.8, 2, 2.5, 3, 3.5, 4,
          7, 8, 10, 12.5, 15, 20, 800,
        ].map(v => ({ id: `${v}kg`, label: `${v} kg` })),
      },
      {
        when: { category: 'unit', values: ['ml'] },
        options: [
          10, 20, 30, 50, 100, 120, 135, 150,
          175, 200, 220, 250, 430, 500, 1000,
        ].map(v => ({ id: `${v}ml`, label: `${v} ml` })),
      },
      {
        when: { category: 'unit', values: ['l'] },
        options: [
          1, 5, 10, 12, 20, 25, 80, 150,
        ].map(v => ({ id: `${v}l`, label: `${v} L` })),
      },
      {
        when: { category: 'unit', values: ['cm'] },
        options: [
          2, 3, 5, 6, 8, 10, 12, 16, 18, 20,
          22, 25, 26, 30, 35, 36, 45, 60,
          75, 80, 100, 120, 150, 180, 230,
          300, 380,
        ].map(v => ({ id: `${v}cm`, label: `${v} cm` })),
      },
      {
        when: { category: 'unit', values: ['pcs'] },
        options: [1, 2, 5, 6].map(v => ({ id: `${v}pcs`, label: `${v} pcs` })),
      },
      {
        when: { category: 'unit', values: ['watt'] },
        options: [
          1, 2, 3, 4, 5, 6, 7, 8, 10, 12,
          13, 15, 18, 20, 23, 25, 30, 32,
          34, 35, 36, 40, 45, 50, 55, 60,
          82, 91, 100, 150, 200, 300,
        ].map(v => ({ id: `${v}w`, label: `${v} W` })),
      },
    ],
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
