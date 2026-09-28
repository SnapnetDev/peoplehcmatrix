import { QueryClient } from '@tanstack/react-query';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export const TOKEN_KEY = 'peoplematrix.session';

setAuthTokenGetter(() => sessionStorage.getItem(TOKEN_KEY));

export const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function invalidate(...keys: (readonly unknown[])[]) {
  keys.forEach(queryKey => client.invalidateQueries({ queryKey }));
}