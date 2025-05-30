import { render, screen } from '@testing-library/react';
import React from 'react';

// Simple sample component for demonstration
function Sample() {
  return <div>Hello World</div>;
}

describe('Sample', () => {
  it('renders the correct text', () => {
    render(<Sample />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
}); 