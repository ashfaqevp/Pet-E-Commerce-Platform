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
          { id: 'food', label: 'Food' },
          { id: 'treats', label: 'Treats' },
          { id: 'toys', label: 'Toys' },
          { id: 'medicine', label: 'Medicine' },
          { id: 'accessories', label: 'Accessories' },
          { id: 'grooming', label: 'Grooming' },
          { id: 'shelter', label: 'Shelter & Beds' },
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
      { id: 'gram', label: 'Gram (g)' },
      { id: 'kg', label: 'Kilogram (kg)' },
      { id: 'ml', label: 'Millilitre (ml)' },
      { id: 'liter', label: 'Litre (L)' },
      { id: 'piece', label: 'Piece' },
    ],
  },

  size: {
    label: 'Size',
    dependsOn: 'unit',
    rules: [
      {
        when: { category: 'unit', values: ['gram'] },
        options: [
          { id: '85g', label: '85 g' },
          { id: '100g', label: '100 g' },
          { id: '250g', label: '250 g' },
          { id: '500g', label: '500 g' },
          { id: '1kg', label: '1 kg' },
            // Multipack sizes (Felix specific)
          { id: '85g-x12', label: '85 g × 12' },
          { id: '85g-x13', label: '85 g × 13' },

          { id: '70g-12', label: '70 g × 12' },
        ],
      },
      {
        when: { category: 'unit', values: ['kg'] },
        options: [
          { id: '1kg', label: '1 kg' },
          { id: '1.5kg', label: '1.5 kg' },
          { id: '2kg', label: '2 kg' },
          { id: '5kg', label: '5 kg' },
        ],
      },
      {
        when: { category: 'unit', values: ['liter', 'ml'] },
        options: [
          { id: '250ml', label: '250 ml' },
          { id: '500ml', label: '500 ml' },
          { id: '1l', label: '1 L' },
        ],
      },
      {
        when: { category: 'unit', values: ['piece'] },
        options: [
          { id: 'small', label: 'Small' },
          { id: 'medium', label: 'Medium' },
          { id: 'large', label: 'Large' },
        ],
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
