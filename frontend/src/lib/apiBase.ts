import { API_URL } from './auth';

/** Origin for static uploads (no /api suffix). */
export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function resolveUploadUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}
