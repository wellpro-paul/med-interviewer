# Testing Guide for Intake Interviewer

We use [Vitest](https://vitest.dev/) and [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) for unit and component testing.

## Running Tests

- To run all tests:
  ```
  npm test
  ```
  or
  ```
  npm run test
  ```
- To run tests in watch mode:
  ```
  npm run test -- --watch
  ```

## Where to Put Tests
- Place test files next to the code they test, using the `.test.tsx` or `.test.ts` suffix.
- Example: `src/components/MyComponent.test.tsx`

## Writing Tests
- Use [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) for React component tests.
- Use Vitest for utility and logic tests.

### Sample Test
```tsx
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders the correct text', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

## Coverage
- To check test coverage:
  ```
  npm run test -- --coverage
  ```

## Best Practices
- Write tests for all new components and utilities.
- Aim for high coverage, but prioritize meaningful tests over 100% coverage.
- Prefer user-centric tests (what the user sees/does) over implementation details.

---
Happy testing! 