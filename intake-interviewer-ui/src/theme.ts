import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0858C5', // Accent/primary
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#B9E1FE', // Highlight
      contrastText: '#101010',
    },
    background: {
      default: '#F5F5FA', // Surface/secondary
      paper: '#FFFFFF', // Card background
    },
    text: {
      primary: '#101010',
      secondary: '#0858C5',
    },
    error: {
      main: '#D32F2F',
    },
  },
  typography: {
    fontFamily: 'Poppins, Arial, sans-serif',
    h1: { fontWeight: 800, fontSize: '3.5rem', lineHeight: 1.5 },
    h2: { fontWeight: 700, fontSize: '2.5rem', lineHeight: 1.5 },
    h3: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.5 },
    h4: { fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.5 },
    h5: { fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.5 },
    h6: { fontWeight: 700, fontSize: '1rem', lineHeight: 1.5 },
    body1: { fontWeight: 400, fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.5 },
    button: { fontWeight: 700, fontSize: '1rem', lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0px 0px 28px 0px rgba(0,0,0,0.05)',
    '0px 5px 9px 0px rgba(195,207,232,1)',
    'none', 'none', 'none', 'none', 'none', 'none', 'none',
    'none', 'none', 'none', 'none', 'none', 'none', 'none',
    'none', 'none', 'none', 'none', 'none', 'none', 'none', 'none',
  ],
  components: {
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 32,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          textTransform: 'none',
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme; 