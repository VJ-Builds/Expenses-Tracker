import React, { createContext, useContext } from 'react';
import { lightColors } from '../constants/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Hardcoded to light mode to completely remove dark mode
  const isDarkMode = false;
  const colors = lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme: () => {}, setDarkTheme: () => {}, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
