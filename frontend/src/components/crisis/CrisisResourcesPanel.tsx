import { useEffect, useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { crisisService } from '../../lib/crisis';
import { authService } from '../../lib/auth';

type Props = {
    eventId: string;
    canManage?: boolean;
    immediateNeeds?: string[];
};

export function CrisisResourcesPanel({ eventId, canManage, immediateNeeds = [] }: Props) {
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [item, setItem] = useState('');
    const [quantity, setQuantity] = useState(100);
    const [unit, setUnit] = useState('units');
    const [pledgeQty, setPledgeQty] = useState<Record<string, number>>({});
    const [busy, setBusy] = useState(false);
    const user = authService.getCurrentUser();

    const load = async () => {
        try {
            setLoading(true);
            setResources(await crisisService.getResources(eventId));
        } catch {
            setResources([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [eventId]);

    const createRequest = async () => {
        if (!item.trim()) return;
        setBusy(true);
        try {
            await crisisService.createResourceRequest(eventId, {
                item: item.trim(),
                quantityNeeded: quantity,
                unit
            });
            setItem('');
            await load();
        } finally {
            setBusy(false);
        }
    };

    const pledge = async (resourceId: string) => {
        const qty = pledgeQty[resourceId] || 1;
        setBusy(true);
        try {
            await crisisService.pledgeResource(resourceId, qty);
            await load();
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
            </div>
        );
    }

    return (
        <section className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 text-rose-900">
                <Package className="h-5 w-5" /> Resource requests
            </h2>

            {canManage && (
                <div className="grid sm:grid-cols-3 gap-2 items-end bg-white border border-rose-100 rounded-xl p-4">
                    <Input
                        label="Item needed"
                        placeholder="Food packs, blankets..."
                        value={item}
                        onChange={(e) => setItem(e.target.value)}
                    />
                    <Input
                        label="Quantity"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                    />
                    <Input
                        label="Unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                    />
                    <Button size="sm" className="sm:col-span-3" onClick={createRequest} isLoading={busy}>
                        Post resource need
                    </Button>
                    {immediateNeeds.length > 0 && (
                        <div className="sm:col-span-3 flex flex-wrap gap-2">
                            {immediateNeeds.map((need) => (
                                <button
                                    key={need}
                                    type="button"
                                    className="text-xs px-2 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800"
                                    onClick={() => setItem(need)}
                                >
                                    + {need}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {resources.length === 0 ? (
                <p className="text-sm text-slate-500">No resource requests posted yet.</p>
            ) : (
                <div className="space-y-3">
                    {resources.map((r) => {
                        const pledged = (r.pledges || []).reduce(
                            (s: number, p: any) => s + (p.quantity || 0),
                            0
                        );
                        const pct = Math.min(100, Math.round((pledged / r.quantityNeeded) * 100));
                        return (
                            <div
                                key={r._id}
                                className="border border-slate-200 rounded-xl p-4 bg-white space-y-2"
                            >
                                <div className="flex justify-between gap-2">
                                    <div>
                                        <p className="font-bold">{r.item}</p>
                                        <p className="text-xs text-slate-500 capitalize">
                                            {r.priority} priority · {r.status}
                                        </p>
                                    </div>
                                    <p className="text-sm font-bold text-rose-700">
                                        {pledged} / {r.quantityNeeded} {r.unit}
                                    </p>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-rose-500 rounded-full transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                {(r.pledges || []).length > 0 && (
                                    <p className="text-xs text-slate-500">
                                        Pledged by{' '}
                                        {(r.pledges || [])
                                            .map((p: any) => p.user?.name || 'Volunteer')
                                            .join(', ')}
                                    </p>
                                )}
                                {user && r.status === 'open' && !canManage && (
                                    <div className="flex gap-2 items-end pt-1">
                                        <Input
                                            label="Pledge qty"
                                            type="number"
                                            min={1}
                                            className="w-28"
                                            value={pledgeQty[r._id] || 1}
                                            onChange={(e) =>
                                                setPledgeQty((prev) => ({
                                                    ...prev,
                                                    [r._id]: Number(e.target.value) || 1
                                                }))
                                            }
                                        />
                                        <Button size="sm" onClick={() => pledge(r._id)} isLoading={busy}>
                                            Pledge support
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
