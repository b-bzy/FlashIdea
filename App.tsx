
import React, { useState } from 'react';
import { HashRouter, Routes, Route, useNavigate, Link } from 'react-router-dom';
import QuickNoteScreen from './screens/QuickNoteScreen';
import EditorScreen from './screens/EditorScreen';
import StudioVersionsScreen from './screens/StudioVersionsScreen';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="max-w-md mx-auto min-h-screen relative bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden flex flex-col">
        <Routes>
          <Route path="/" element={<QuickNoteScreen />} />
          <Route path="/editor" element={<EditorScreen />} />
          <Route path="/studio" element={<StudioVersionsScreen />} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
