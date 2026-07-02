import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AppBootstrapLoader from './AppBootstrapLoader';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppBootstrapLoader>
      <App />
    </AppBootstrapLoader>
  </React.StrictMode>,
);
