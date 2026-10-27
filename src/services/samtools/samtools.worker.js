import createSamtools from './samtools.js';

const BASE = import.meta.env.BASE_URL + 'wasm/samtools/';

self.onmessage = async (e) => {
    const { args, files = [], outputs = [] } = e.data;
    const stdout = [];
    const stderr = [];

    try {
        const mod = await createSamtools({
            print: (t) => stdout.push(t),
            printErr: (t) => stderr.push(t),
            locateFile: (p) => BASE + p, // chỉ còn samtools.wasm và samtools.data
        });

        mod.FS.mkdir('/work');
        mod.FS.mount(mod.WORKERFS, { files }, '/work');

        let code = 0;
        try {
            code = mod.callMain(args);
        } catch (err) {
            code = err?.status ?? 1;
        }

        const results = {};
        for (const name of outputs) {
            try {
                results[name] = mod.FS.readFile('/tmp/' + name);
            } catch {
                // file đầu ra không tồn tại (lệnh lỗi), bỏ qua
            }
        }

        self.postMessage(
            { code, stdout: stdout.join('\n'), stderr: stderr.join('\n'), results },
            Object.values(results).map((u8) => u8.buffer)
        );
    } catch (err) {
        self.postMessage({ code: -1, stdout: '', stderr: String(err), results: {} });
    }
};