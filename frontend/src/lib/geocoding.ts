/**
 * Free geocoding via OpenStreetMap Nominatim.
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * - Max ~1 request/second
 * - Include a valid User-Agent
 * - Attribute OpenStreetMap on maps (already on tile layer)
 */

export interface GeocodeResult {
    displayName: string;
    lat: number;
    lng: number;
}

const USER_AGENT = 'HiveVolunteerPlatform/1.0 (university project; contact: hive@local.dev)';

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1100;

const throttle = async () => {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    lastRequestAt = Date.now();
};

export async function searchLocations(query: string): Promise<GeocodeResult[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    await throttle();

    const params = new URLSearchParams({
        q,
        format: 'json',
        addressdetails: '1',
        limit: '5'
    });

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
            headers: {
                Accept: 'application/json',
                'User-Agent': USER_AGENT
            }
        }
    );

    if (!response.ok) {
        throw new Error('Location search failed. Please try again in a moment.');
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
    }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    await throttle();

    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'json'
    });

    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
        {
            headers: {
                Accept: 'application/json',
                'User-Agent': USER_AGENT
            }
        }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.display_name || null;
}
