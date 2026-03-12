import React from 'react';
import { MainApp } from './components/MainApp';

// App.tsx теперь просто переиспользует MainApp
// Это обеспечивает единую точку входа для всей логики приложения
const App: React.FC = () => {
  return <MainApp />;
};

export default App;
