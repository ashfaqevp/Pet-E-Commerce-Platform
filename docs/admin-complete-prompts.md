## 🎯 CORE PROMPTS

### Prompt 1: Complete Admin CRUD Page

**Use this to generate full admin pages (Products, Orders, Customers, etc.)**

```markdown
Generate a complete Nuxt 4 admin page for managing [ENTITY_NAME: e.g., "Products"] using shadcn-vue.

Requirements:
1. Use shadcn-vue components: Button, Card, Table, Dialog, Input, Select, Badge, Checkbox
2. Implement full CRUD operations:
   - List view with table
   - Add/Edit dialog with form
   - Delete with confirmation
   - Search functionality
   - Filter by status
   - Pagination

3. Data structure:
   - Table columns: [SPECIFY_COLUMNS: e.g., "name, price, stock, status, category"]
   - Use ref() for state management
   - Mock data for initial display

4. Form validation:
   - Use vee-validate + zod
   - Show validation errors
   - Success/error notifications

5. Features:
   - Responsive design (mobile, tablet, desktop)
   - Loading states
   - Empty states
   - Bulk actions (select multiple, delete all)
   - Sort and filter

6. Styling:
   - Use Tailwind CSS with shadcn-vue
   - Professional color scheme
   - Proper spacing and typography

Output: 
- Complete .vue file
- Ready to use in Nuxt 4 admin panel
- Include all necessary imports
- Use TypeScript

Make it production-ready and fully functional.
```

### Prompt 2: Custom shadcn-vue Component

**Use this to create reusable admin components**

```markdown
Create a custom shadcn-vue component called [COMPONENT_NAME] with these specifications:

Purpose: [DESCRIBE_PURPOSE]

Props:
```typescript
interface Props {
  [PROP_NAME]: [PROP_TYPE]
  // example:
  // items: Array<{id: string; name: string}>
  // isLoading?: boolean
  // maxItems?: number
}
```

Emits:
```typescript
interface Emits {
  '[EVENT_NAME]': [VALUE_TYPE]
  // example:
  // 'select': [item: any]
  // 'delete': [id: string]
}
```

Features:
- [FEATURE_1]
- [FEATURE_2]
- [FEATURE_3]

Requirements:
1. Use shadcn-vue components internally
2. Full TypeScript support
3. Proper slot management
4. Accessibility (WCAG 2.1 AA)
5. Dark mode support
6. Responsive design
7. Loading states
8. Error handling

Output:
- Complete Vue 3 component
- Ready to integrate into admin panel
- Include usage examples
- Document all props and emits
```

### Prompt 3: Admin Form with Validation

**Use this to create form components with validation**

```markdown
Create a Nuxt 4 form component for [FORM_PURPOSE: e.g., "Adding a new product"] using shadcn-vue.

Form fields:
- [FIELD_NAME]: [FIELD_TYPE] ([VALIDATION_RULES])
  // Examples:
  // - name: text (required, min 1 character)
  // - email: email (required, valid email)
  // - price: number (required, positive)
  // - category: select (required, one of: Food, Toys, Accessories)
  // - description: textarea (optional, max 500 chars)
  // - tags: checkbox (optional, multi-select)

Requirements:
1. Use vee-validate + Zod for validation
2. shadcn-vue FormField components
3. Show validation errors below each field
4. Submit button with loading state
5. Reset/Cancel button
6. Success message on submit
7. Handle form submission to API

Validation schema:
- Required field indicators
- Real-time validation
- Clear error messages
- Success feedback

Styling:
- Professional look with Tailwind
- Proper spacing
- Clear labels
- Focus states
- Error states (red)
- Success states (green)

Output:
- Complete form component
- Validation schema (Zod)
- Usage example
- API integration ready
```

### Prompt 4: Advanced Data Table

**Use this for complex table requirements**

```markdown
Create an advanced data table component for shadcn-vue with these features:

Core Features:
1. Column Management:
   - Sortable columns (click to sort A-Z or Z-A)
   - Resizable columns
   - Column visibility toggle
   - Custom column formatting

2. Data Filtering:
   - Search/filter by text
   - Filter by date range
   - Filter by status/category
   - Multiple simultaneous filters
   - Clear all filters button

3. Row Management:
   - Row selection (checkboxes)
   - Select all / deselect all
   - Bulk actions on selected rows
   - Row expansion for details
   - Inline editing option

4. Pagination:
   - Next/prev buttons
   - Page number input
   - Items per page selector
   - Total count display
   - Go to page functionality

5. Display Options:
   - Loading skeleton
   - Empty state message
   - Error state with retry
   - Hover effects
   - Status badges with colors

Generic Type Support:
- Works with any data structure
- Define columns dynamically
- Type-safe with TypeScript generics

Props interface:
- columns: Column[]
- data: T[]
- loading?: boolean
- totalRows?: number
- onSort: (column, order) => void
- onFilter: (filters) => void

Output:
- Complete table component
- Fully typed with generics
- Production-ready
- No external dependencies beyond shadcn-vue
- Usage examples with different data types
```

### Prompt 5: Navigation/Sidebar

**Use this to create navigation systems**

```markdown
Create a responsive navigation system for Nuxt 4 admin panel using shadcn-vue.

Components needed:

1. Sidebar:
   - Logo at top
   - Navigation menu with groups
   - Icons for each menu item
   - Active route highlighting
   - Collapsible sections
   - Collapse/expand sidebar (mobile)
   - Logout button at bottom

2. Top Navbar:
   - Menu toggle button (mobile)
   - Search bar
   - Notification bell with badge
   - User profile dropdown
   - Dark mode toggle

3. Mobile Navigation:
   - Hamburger menu
   - Slide-out drawer
   - Touch-friendly buttons

Menu structure:
```typescript
[
  { label: 'Dashboard', icon: 'dashboard', href: '/admin', group: 'main' },
  { label: 'Products', icon: 'package', href: '/admin/products', group: 'management' },
  { label: 'Orders', icon: 'cart', href: '/admin/orders', group: 'management' },
  // ...
]
```

Features:
- Active route detection
- Smooth transitions
- Responsive breakpoints
- Keyboard navigation
- Accessibility compliant
- Dark mode support

Output:
- Sidebar component
- Navbar component
- Layout wrapper
- Usage in admin pages
```

### Prompt 6: Authentication Pages

**Use this to create login/signup flows**

```markdown
Create complete authentication pages using shadcn-vue for a Nuxt 4 admin panel.

Pages needed:

1. Login Page (/admin/login):
   - Email field (validation: required, valid email)
   - Password field (validation: required, min 8 chars)
   - Remember me checkbox
   - Forgot password link
   - Sign up link
   - Submit button with loading state
   - Error message display

2. Sign Up Page (/admin/signup):
   - Name field (required)
   - Email field (required, valid email)
   - Password field (required, min 8 chars)
   - Confirm password field (must match password)
   - Password strength indicator
   - Terms checkbox (required)
   - Submit button
   - Link to login

3. Forgot Password Page (/admin/forgot-password):
   - Email input
   - Submit button
   - Success message ("Check your email")
   - Back to login link

4. Reset Password Page (/admin/reset-password):
   - New password field
   - Confirm password field
   - Submit button
   - Success redirect to login

Features:
- Form validation with vee-validate + Zod
- Password strength meter
- Real-time validation feedback
- Loading states on submit
- Error/success messages
- Responsive design
- Professional styling

Output:
- Complete pages (not components)
- Ready to use in Nuxt pages/admin/ directory
- Validation schemas
- API integration points commented
```

### Prompt 7: Dashboard with Analytics

**Use this to create dashboard pages**

```markdown
Create an admin dashboard page for shadcn-vue with:

1. Statistics Cards:
   - Total Sales: $45,231.89 (+20.1% from last month)
   - Total Orders: 245 (+15% from last month)
   - Total Customers: 1,234 (+5.2% from last month)
   - Active Products: 89 (+2 new this week)
   - Display in 4-column grid on desktop, responsive on mobile
   - Show trend indicator (up/down arrow with percentage)
   - Color-coded (green for positive, red for negative)

2. Charts:
   - Sales trend chart (line or area chart) - last 30 days
   - Revenue breakdown (pie or donut chart) - by category
   - Order status distribution - pending/processing/completed
   - Customer acquisition chart - new vs returning

3. Data Tables:
   - Recent Orders (order ID, customer, amount, status)
   - Top Products (product name, revenue, quantity sold)
   - Recent Customers (name, email, total spent, joined date)

4. Features:
   - Date range selector (Last 7 days, Last 30 days, Last year)
   - Refresh data button
   - Export data button
   - Real-time data (optional)

Requirements:
1. Use shadcn-vue Card, Table, Badge components
2. Mock data for charts (use Chart.js or ApexCharts)
3. Responsive grid layout
4. Loading states
5. Professional color scheme
6. Dark mode support

Output:
- Complete dashboard page
- Mock data structure
- Component for each section
- Ready to integrate APIs
```

### Prompt 8: Settings/Configuration Pages

**Use this to create settings pages**

```markdown
Create settings pages for shadcn-vue admin panel.

Pages needed:

1. Store Settings (/admin/settings/store):
   - Store name (text input)
   - Store email (email input)
   - Store phone (tel input)
   - Store address (textarea)
   - Store logo upload
   - Store description (textarea)
   - Save button with loading state

2. Payment Settings (/admin/settings/payments):
   - Payment gateway selection (Razorpay, Stripe, etc.)
   - API key input (password field)
   - Secret key input (password field)
   - Test connection button
   - Webhook URL display
   - Enable/disable payment methods

3. Shipping Settings (/admin/settings/shipping):
   - Free shipping threshold (number input with currency)
   - Standard shipping cost
   - Express shipping cost
   - Shipping methods table (add/edit/delete rows)
   - Enable local shipping only (toggle)

4. Email Settings (/admin/settings/email):
   - SMTP server (text input)
   - SMTP port (number input)
   - Encryption type (select: TLS, SSL)
   - Username (text input)
   - Password (password input)
   - Test email button
   - Email templates selector

5. Notification Settings (/admin/settings/notifications):
   - New order notifications (toggle)
   - Payment notifications (toggle)
   - Customer messages (toggle)
   - Low stock alerts (toggle)
   - Notification email address

6. Account Settings (/admin/settings/account):
   - Full name (text input)
   - Email address (email input)
   - Current password (password input)
   - New password (password input)
   - Confirm password (password input)
   - Save button

7. Danger Zone:
   - Delete account button (with confirmation dialog)
   - Clear cache button

Features:
- Form validation
- Success/error messages
- Save confirmation
- Unsaved changes warning
- Loading states
- Organized in tabs or sections

Output:
- Complete settings layout with all pages
- Form validation schemas
- API integration points
```

### Prompt 9: Modal/Dialog Components

**Use this for dialog-based interactions**

```markdown
Create reusable dialog/modal components for shadcn-vue admin panel.

Dialog types needed:

1. Confirmation Dialog:
   - Title
   - Message
   - Confirm button
   - Cancel button
   - Callback on confirm
   - Destructive action styling (red for delete)

2. Form Dialog:
   - Title
   - Form fields (generic)
   - Submit button
   - Cancel button
   - Loading state
   - Form validation

3. Detail View Dialog:
   - Title
   - Scrollable content area
   - Related data tables/lists
   - Close button
   - Action buttons (Edit, Delete, etc.)

4. Alert Dialog:
   - Icon (info, warning, error, success)
   - Title
   - Message
   - Action button
   - Dismissable

Features:
- Smooth open/close animations
- Backdrop click to close (optional)
- Keyboard escape to close
- Focus management
- Accessibility (ARIA roles)
- Responsive on mobile
- Overlay handling

Props for each dialog:
- open: boolean (v-model)
- title: string
- description?: string
- onConfirm?: () => void
- onCancel?: () => void

Output:
- 4 separate dialog components
- Ready to use in admin pages
- Usage examples for each
```

### Prompt 10: Error Handling & Notifications

**Use this to add error handling throughout admin panel**

```markdown
Create error handling and notification system for shadcn-vue admin panel.

Components needed:

1. Toast/Notification Component:
   - Success toast (green)
   - Error toast (red)
   - Warning toast (yellow)
   - Info toast (blue)
   - Auto-dismiss after 5 seconds
   - Manual dismiss button
   - Multiple toasts stacked
   - Show in top-right corner

2. Error Page Component:
   - 404 Not Found
   - 403 Forbidden
   - 500 Server Error
   - Illustration/icon
   - Error message
   - Back button
   - Home button

3. Error Boundary:
   - Catch component errors
   - Display error message
   - Retry button
   - Report error link

4. Loading States:
   - Skeleton loader for tables
   - Spinner for buttons
   - Page loading overlay
   - Progress bar

5. Empty States:
   - Empty table message with icon
   - Create first item button/link
   - Different messages for different contexts

Composable for notifications:
```typescript
export const useNotification = () => {
  const showSuccess = (message: string) => { /* ... */ }
  const showError = (message: string) => { /* ... */ }
  const showWarning = (message: string) => { /* ... */ }
  const showInfo = (message: string) => { /* ... */ }
  return { showSuccess, showError, showWarning, showInfo }
}
```

Features:
- Global error handling
- Consistent error messages
- User-friendly error displays
- Proper error recovery
- Logging (optional)

Output:
- Toast component
- Error pages
- Error boundary wrapper
- Loading skeleton components
- Notification composable
```

---

## 🎨 STYLING & CUSTOMIZATION PROMPTS

### Prompt 11: Theme Customization

```markdown
Create a dark mode theme switcher for shadcn-vue admin panel.

Requirements:
1. Theme toggle button in navbar
2. Store preference in localStorage
3. Apply theme to entire app
4. All shadcn-vue components support theme
5. Respect system preference (prefers-color-scheme)

Implementation:
- Add data-theme="dark" attribute to html
- Tailwind dark: prefix support
- Color variables for both modes
- Smooth transition between themes

Output:
- Composable: useTheme()
- Navbar button component
- Theme provider setup
- CSS variables configuration
```

### Prompt 12: Responsive Design

```markdown
Create responsive design utilities for shadcn-vue admin.

Breakpoints:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

Features:
1. Mobile: Single column, hamburger nav, full-width modals
2. Tablet: 2-3 columns, visible sidebar
3. Desktop: Full layout, multiple columns

Provide:
- Responsive grid system
- Tailwind breakpoint utilities
- Mobile-first approach examples
```

---

## 🚀 ADVANCED PROMPTS

### Prompt 13: State Management with Composables

```markdown
Create a state management system using Vue 3 composables for shadcn-vue admin.

Composables needed:
1. useProducts() - manage product data
2. useOrders() - manage order data
3. useCustomers() - manage customer data
4. useAuth() - manage authentication
5. useNotification() - manage toasts/alerts

Each composable should:
- Manage data (state)
- Fetch from API
- Update data
- Delete data
- Handle loading/error states
- Cache data

Example structure:
```typescript
export const useProducts = () => {
  const products = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchProducts = async () => { /* ... */ }
  const addProduct = async (data) => { /* ... */ }
  const updateProduct = async (id, data) => { /* ... */ }
  const deleteProduct = async (id) => { /* ... */ }

  return { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct }
}
```

Output:
- 5 complete composable files
- Type definitions
- Error handling
- API integration ready
```

### Prompt 14: API Integration Layer

```markdown
Create API integration layer for shadcn-vue admin panel.

Create:
1. API client ($fetch wrapper)
2. Request/response interceptors
3. Error handling middleware
4. Authentication token management
5. Retry logic

Features:
- Base URL configuration
- Authorization header injection
- Request timeout
- Error standardization
- Response transformation
- Loading state management
- Cache layer (optional)

Output:
- API client utility
- Middleware setup
- Usage examples
- TypeScript types for API responses
```

---

## 📋 QUICK REFERENCE PROMPTS

### Prompt 15: Code Review & Optimization

```markdown
Review this shadcn-vue admin code for:
1. Performance optimization
2. Accessibility improvements
3. Error handling
4. Type safety
5. Best practices

Provide:
- Specific improvement suggestions
- Code examples for fixes
- Performance metrics impact
- Accessibility compliance level
```

### Prompt 16: Bug Fixing

```markdown
Help me fix this bug in my shadcn-vue admin component:

[PASTE CODE HERE]

Issue: [DESCRIBE_THE_PROBLEM]
Expected behavior: [WHAT_SHOULD_HAPPEN]
Actual behavior: [WHAT_CURRENTLY_HAPPENS]

Provide:
- Root cause analysis
- Fixed code
- Explanation
- How to prevent in future
```

---

## 💡 USAGE TIPS

### Tip 1: Combine Prompts
For the best results, combine multiple prompts:
1. Start with Prompt 1 (CRUD page) for basic structure
2. Add Prompt 4 (Advanced table) for complex tables
3. Use Prompt 3 (Form validation) for better forms

### Tip 2: Customize
Always customize the generated code:
- Replace [PLACEHOLDER] values with your data
- Adjust colors to match your brand
- Modify API endpoints to your backend
- Add your business logic

### Tip 3: Iterate
Don't expect perfect output on first try:
1. Ask AI to generate code
2. Review and test it
3. Ask for improvements
4. Iterate until satisfied

### Tip 4: Combine with Components
Use the prompts with the practical examples to:
1. Generate component from prompt
2. Reference implementation from example
3. Combine best of both

---

## 🎯 WORKFLOW

### Step 1: Setup
```bash
npx shadcn-vue@latest init
npx shadcn-vue@latest add button card table dialog input select
```

### Step 2: Create Layout
Use Prompt 5 to create navigation & layout

### Step 3: Create Pages
Use Prompt 1 to generate admin pages (Products, Orders, etc.)

### Step 4: Add Forms
Use Prompt 3 to add form components with validation

### Step 5: Advanced Features
Use Prompts 4, 13, 14 for advanced tables, state management, APIs

### Step 6: Polish
Use Prompts 11, 12 for theming and responsive design

### Step 7: Error Handling
Use Prompt 10 for error handling and notifications

---

## 📚 RESOURCES

- shadcn-vue Docs: https://www.shadcn-vue.com/
- AI Model: Use Claude 3.5+, GPT-4, or similar
- Examples: Check /shadcn-vue-practical-examples.md
