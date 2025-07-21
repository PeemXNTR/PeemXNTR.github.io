import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './Dashboard';
import Welcome from './Welcome';
import LoraSignalDisplay from './LoraSignalDisplay';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/lora-signal" element={<LoraSignalDisplay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;