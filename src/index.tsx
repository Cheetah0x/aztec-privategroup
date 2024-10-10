import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import * as ReactDOM from 'react-dom/client';
import Dashboard from './pages/dashboard';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <>
    <Dashboard />
  </>,
);