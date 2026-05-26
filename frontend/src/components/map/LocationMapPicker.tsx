import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Search, MapPin, Crosshair } from 'lucide-react';
import { Button } from '../ui/Button';
import { searchLocations, reverseGeocode, type GeocodeResult } from '../../lib/geocoding';
import '../../lib/leafletIcon';
import 'leaflet/dist/leaflet.css';

export interface LocationValue {
    address: string;
    coords: [number, number] | null; // [lat, lng]
}

interface Props {
    value: LocationValue;
    onChange: (value: LocationValue) => void;
    defaultCenter?: [number, number];
    defaultZoom?: number;
}

function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom, { animate: true });
    }, [center, zoom, map]);
    return null;
}

function ClickHandler({
    onPick
}: {
    onPick: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onPick(e.latlng.lat, e.latlng.lng);
        }
    });
    return null;
}

export function LocationMapPicker({
    value,
    onChange,
    defaultCenter = [6.9271, 79.8612],
    defaultZoom = 13
}: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GeocodeResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isResolvingClick, setIsResolvingClick] = useState(false);

    const center: [number, number] = value.coords || defaultCenter;
    const zoom = value.coords ? 16 : defaultZoom;

    const handleSearch = async () => {
        if (query.trim().length < 3) {
            setSearchError('Enter at least 3 characters to search.');
            return;
        }
        setIsSearching(true);
        setSearchError(null);
        setResults([]);
        try {
            const places = await searchLocations(query);
            setResults(places);
            if (places.length === 0) {
                setSearchError('No places found. Try a more specific address.');
            }
        } catch (err: any) {
            setSearchError(err.message);
        } finally {
            setIsSearching(false);
        }
    };

    const selectResult = (place: GeocodeResult) => {
        onChange({
            address: place.displayName,
            coords: [place.lat, place.lng]
        });
        setResults([]);
        setQuery(place.displayName.split(',')[0]);
    };

    const handleMapClick = async (lat: number, lng: number) => {
        onChange({
            address: value.address,
            coords: [lat, lng]
        });
        setIsResolvingClick(true);
        try {
            const name = await reverseGeocode(lat, lng);
            if (name) {
                onChange({ address: name, coords: [lat, lng] });
            }
        } catch {
            // Keep coords even if reverse geocode fails
        } finally {
            setIsResolvingClick(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-bold text-hive-text-primary">
                    Search location
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary"
                            placeholder="e.g. Viharamahadevi Park, Colombo"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                        />
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleSearch}
                        isLoading={isSearching}
                        className="shrink-0"
                    >
                        Search
                    </Button>
                </div>
                {searchError && (
                    <p className="text-xs text-rose-600">{searchError}</p>
                )}
                {results.length > 0 && (
                    <ul className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm max-h-48 overflow-y-auto">
                        {results.map((place, i) => (
                            <li key={`${place.lat}-${place.lng}-${i}`}>
                                <button
                                    type="button"
                                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-hive-primary/5 border-b border-slate-50 last:border-0 flex gap-2"
                                    onClick={() => selectResult(place)}
                                >
                                    <MapPin className="h-4 w-4 text-hive-primary shrink-0 mt-0.5" />
                                    <span className="text-hive-text-secondary leading-relaxed">
                                        {place.displayName}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <label className="text-sm font-bold text-hive-text-primary">
                    Meeting point label
                </label>
                <input
                    type="text"
                    className="w-full mt-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hive-primary/20 focus:border-hive-primary"
                    placeholder="e.g. Main gate, near fountain"
                    value={value.address}
                    onChange={(e) => onChange({ ...value, address: e.target.value })}
                    required
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-hive-secondary uppercase tracking-wider flex items-center gap-1">
                        <Crosshair className="h-3 w-3" />
                        Click map to fine-tune pin
                    </span>
                    {value.coords && (
                        <span className="text-[10px] font-mono text-slate-500">
                            {value.coords[0].toFixed(5)}, {value.coords[1].toFixed(5)}
                            {isResolvingClick && ' · resolving…'}
                        </span>
                    )}
                </div>
                <div className="h-72 rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative z-10">
                    <MapContainer
                        center={center}
                        zoom={zoom}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapRecenter center={center} zoom={zoom} />
                        <ClickHandler onPick={handleMapClick} />
                        {value.coords && <Marker position={value.coords} />}
                    </MapContainer>
                </div>
                <p className="text-[10px] text-slate-400">
                    Free maps by OpenStreetMap. Search an address or click the map to set the exact volunteer meeting point.
                </p>
            </div>
        </div>
    );
}
