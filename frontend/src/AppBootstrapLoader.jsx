import { useEffect, useMemo, useState } from 'react';
import { checkHealth, onRequestCountChange } from './apiClient';

const LOADER_STATES = {
  INITIALIZING: 'initializing',
  READY: 'ready',
  FAILED: 'failed',
};

export default function AppBootstrapLoader({ children }) {
  const [status, setStatus] = useState(LOADER_STATES.INITIALIZING);
  const [error, setError] = useState('');
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        await checkHealth();
        if (isMounted) {
          setStatus(LOADER_STATES.READY);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || 'No se pudo conectar con el backend');
          setStatus(LOADER_STATES.FAILED);
        }
      }
    };

    load();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => onRequestCountChange(setPendingRequests), []);

  const isGlobalLoading = status === LOADER_STATES.INITIALIZING;
  const showLocalLoader = !isGlobalLoading && pendingRequests > 0;

  if (isGlobalLoading) {
    return (
      <div className="bootstrap-shell">
        <div className="bootstrap-card">
          <div className="bootstrap-logo"></div>
          <div className="bootstrap-copy">
            <div className="bootstrap-logo-wrap">
              <img className="header-logo bootstrap-loader-logo" src="/images/alphaw.jpeg" alt="Alpha logo" />
            </div>
            <p>Getting everything ready...</p>
          </div>
          <div className="bootstrap-spinner">
            <div className="spinner-ring" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {showLocalLoader ? <div className="local-loader">Almost there…</div> : null}
      {status === LOADER_STATES.FAILED ? (
        <div className="bootstrap-fail">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <p>Reloading in a few seconds...</p>
        </div>
      ) : children}
    </div>
  );
}
