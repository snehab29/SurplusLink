export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('surplus_token');
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  
  return response;
}
