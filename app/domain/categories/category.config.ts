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
    required: true,
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
    requiredWhen: [
      { category: 'pet', values: ['cat', 'dog'] },
    ],
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
    requiredWhen: [
      { category: 'unit', values: ['gram', 'ml', 'liter', 'piece'] },
    ],
    rules: [
      {
        when: { category: 'unit', values: ['gram'] },
        options: [
          { id: '250g', label: '250 g' },
          { id: '500g', label: '500 g' },
          { id: '1kg', label: '1 kg' },
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
    requiredWhen: [
      { category: 'type', values: ['food', 'treats'] },
    ],
    rules: [
      {
        when: { category: 'type', values: ['food', 'treats'] },
        options: [
          { id: 'chicken', label: 'Chicken' },
          { id: 'fish', label: 'Fish' },
          { id: 'lamb', label: 'Lamb' },
          { id: 'vanilla', label: 'Vanilla' },
        ],
      },
    ],
  },
} as const
