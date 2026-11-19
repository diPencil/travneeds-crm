import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api';

export function useApiResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedPath, setResolvedPath] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    void apiRequest<T>(path, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setResolvedPath(path);
          setError(false);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResolvedPath(path);
          setError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [path, revision]);
  return {
    data: resolvedPath === path ? data : null,
    error: resolvedPath === path && error,
    loading: path !== null && (loading || resolvedPath !== path),
    reload,
  };
}
