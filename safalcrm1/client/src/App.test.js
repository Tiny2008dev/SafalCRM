import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Safal CRM sign-in screen', () => {
    render( < App / > );
    expect(screen.getByRole('heading', { name: /safal crm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});