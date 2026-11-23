export function runBcftools(args, files = [], outputs = [], options = {}) {
    return new Promise((resolve, reject) => {
        // Mỗi lệnh một worker mới => một instance WASM mới
        // console.log("New worker")
        const worker = new Worker(
            new URL('./bcftools.worker.js', import.meta.url),
            { type: 'module' }
        );
        worker.onmessage = (e) => { resolve(e.data); worker.terminate(); }; 
        worker.onerror = (err) => { reject(err); worker.terminate(); };
        worker.postMessage({ args, files, outputs, forceMode: options.forceMode});
    });
}

export function downloadBlob(data, filename) {
    const url = URL.createObjectURL(new Blob([data]));
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}