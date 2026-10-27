import { useState, useCallback } from 'react';
import { runSamtools } from '../services/samtools/samtools.service';

function useSamtools() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = useCallback(async (args, files, outputs) => {
        setLoading(true); setError(null);
        try {
            const r = await runSamtools(args, files, outputs);
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
export default useSamtools;