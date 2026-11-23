import { useState, useCallback } from 'react';
import { runTracy } from '../services/tracy/tracy.service';

function useTracy() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = useCallback(async (args, files, outputs, options) => {
        setLoading(true); setError(null);
        try {
            const r = await runTracy(args, files, outputs, options);
            if (r.code !== 0) setError(r.stderr);
            return r;
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    }, []);

    return { run, loading, error };
}
export default useTracy;