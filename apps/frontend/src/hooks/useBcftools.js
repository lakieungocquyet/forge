import { useState, useCallback } from 'react';
import { runBcftools } from '../services/bcftools/bcftools.service';

function useBcftools() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = useCallback(async (args, files, outputs, options) => {
        setLoading(true); setError(null);
        try {
            const r = await runBcftools(args, files, outputs, options);
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
export default useBcftools;