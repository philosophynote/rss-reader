# ReactCodingConventions

## Purpose

This document defines the behavioral rules and development standards that AI agents must follow when generating or modifying **React** code in this repository. The objective is to ensure consistency, maintainability, performance, accessibility, and security while aligning with official React guidance.

---

## Scope

* Applies to:

  * `**/*.jsx`
  * `**/*.tsx`
  * `**/*.js`
  * `**/*.ts`
  * `**/*.css`, `**/*.scss`
* Assumes **React 19+**
* Functional components with hooks are mandatory
* TypeScript is preferred when applicable

---

## Core Intent

Agents must:

* Follow official React documentation and idiomatic patterns
* Prefer explicit, readable implementations over clever abstractions
* Design components for reuse, testability, and long-term maintenance
* Keep logic, data flow, and responsibilities clear and predictable

---

## Project Context Assumptions

* Latest React version (React 19+)
* Modern build tools (Vite, CRA, or custom Webpack)
* ES modules and modern JavaScript / TypeScript syntax
* Hooks-based architecture by default

---

## Architecture Guidelines

* Use **functional components with hooks** exclusively
* Prefer **composition over inheritance**
* Organize code by **feature or domain**, not by technical type
* Separate presentational and container logic where it improves clarity
* Extract reusable stateful logic into **custom hooks**
* Maintain a clear, top-down data flow

---

## TypeScript Integration

When TypeScript is used, agents must:

* Define explicit types for:

  * Component props
  * State
  * Event handlers
  * Refs
* Use interfaces or type aliases consistently
* Prefer strict typing (`strict: true` in `tsconfig.json`)
* Leverage React-provided utility types (`React.FC`, `React.ComponentProps`, etc.) when they add clarity
* Model component variants and states using union types

---

## Component Design

Agents must:

* Follow the **single responsibility principle**
* Keep components small and focused
* Use descriptive, consistent names (PascalCase for components)
* Design components to be reusable and testable
* Use composition patterns such as:

  * `children`
  * render props
  * compound components

---

## State Management

* Use `useState` for simple, local state
* Use `useReducer` for complex or multi-step state transitions
* Use `useContext` for shared, cross-tree state
* Introduce external state management (Redux Toolkit, Zustand, etc.) only when justified
* Normalize state where appropriate
* Use **React Query** or **SWR** for server state and caching

---

## Hooks and Effects

Agents must:

* Follow the **Rules of Hooks** strictly
* Use `useEffect` with correct dependency arrays
* Always clean up effects to prevent leaks
* Use `useMemo` and `useCallback` only when there is a measurable benefit
* Use `useRef` for DOM access or mutable values that should not trigger re-renders
* Extract reusable logic into custom hooks

---

## Styling Guidelines

* Use modern styling approaches:

  * CSS Modules
  * Styled Components
  * CSS-in-JS solutions
* Follow consistent class naming conventions (e.g. BEM)
* Use CSS custom properties for theming
* Apply mobile-first, responsive design principles
* Ensure accessibility through semantic HTML and ARIA attributes

---

## Performance Optimization

Agents should:

* Use `React.memo` when memoization is beneficial
* Apply code splitting with `React.lazy` and `Suspense`
* Optimize bundle size with tree shaking and dynamic imports
* Avoid unnecessary re-renders
* Use virtualization for large lists
* Profile with React DevTools when performance is critical

---

## Data Fetching

* Use modern libraries (React Query, SWR, Apollo Client)
* Always model loading, error, and success states
* Handle request cancellation and race conditions
* Apply optimistic updates where appropriate
* Implement caching and retry strategies
* Handle offline and network-failure scenarios gracefully

---

## Error Handling

Agents must:

* Use **Error Boundaries** for component-level failures
* Provide meaningful fallback UI
* Log errors via the project’s logging or telemetry tools
* Handle async errors in effects and event handlers
* Present clear, user-facing error messages

---

## Forms and Validation

* Use controlled components for form inputs
* Prefer form libraries (React Hook Form, Formik) for complex forms
* Validate inputs and surface errors clearly
* Ensure form accessibility (labels, ARIA attributes)
* Debounce validation where appropriate
* Handle file uploads and complex form states carefully

---

## Routing

* Use React Router for client-side routing
* Implement nested routes and route guards where required
* Handle route params and query strings explicitly
* Apply lazy loading for route-based code splitting
* Maintain correct navigation and back-button behavior

---

## Testing Expectations

Agents must:

* Write unit tests using **React Testing Library**
* Test observable behavior, not implementation details
* Use Vitest (or the project’s configured runner)
* Add integration tests for complex interactions
* Mock external APIs and dependencies appropriately
* Validate accessibility and keyboard navigation

---

## Security Practices

Agents must:

* Sanitize and validate all user-provided input
* Prevent XSS by escaping or encoding rendered data
* Use HTTPS for all external requests
* Avoid storing sensitive data in `localStorage` or `sessionStorage`
* Follow secure authentication and authorization patterns
* Respect Content Security Policy (CSP) constraints

---

## Accessibility

* Use semantic HTML elements
* Apply correct ARIA roles and attributes
* Ensure full keyboard navigation support
* Provide alternative text for images and icons
* Maintain sufficient color contrast
* Test with screen readers and accessibility tools

---

## Implementation Process

When generating new features, agents should follow this order:

1. Plan component structure and data flow
2. Define types and interfaces
3. Implement core components and styling
4. Add state management and data fetching
5. Integrate routing and navigation
6. Implement loading and error states
7. Add tests
8. Optimize performance
9. Verify accessibility
10. Update documentation and comments

---

## Documentation & Comments

* Document public components and hooks with JSDoc
* Use comments to explain intent and non-obvious decisions
* Remove outdated comments during refactors
* Update architectural or design docs when patterns change

---

## Enforcement

* All generated code must conform to this document
* Deviations require explicit justification
* Consistency across the codebase is mandatory
