import createBcftools from './bcftools.js';

const BASE = import.meta.env.BASE_URL + 'wasm/bcftools/';

self.onmessage = async (e) => {
    const { args, files = [], outputs = [] } = e.data;
    const stdout = [];
    const stderr = [];
    const missingFiles = [];

    try {
        const mod = await createBcftools({
            print: (t) => stdout.push(t),
            printErr: (t) => stderr.push(t),
            locateFile: (p) => BASE + p,
        });

        mod.FS.mkdir('/work');
        mod.FS.mount(mod.WORKERFS, { files }, '/work');

        let code = 0;
        try {
            // console.log("Start runing tools")
            code = mod.callMain(args);
            // console.log("Done")
        } catch (err) {
            code = err?.status ?? 1;
        }

        const results = {};
        for (const name of outputs) {
            try {
                results[name] = mod.FS.readFile('/tmp/' + name);
            } catch {
                // Ghi lại tên file và thông điệp lỗi để dễ debug
                missingFiles.push({ name, error: err.message });
                // Hoặc có thể in ra stderr của worker
                stderr.push(`Warning: Không tìm thấy file đầu ra '${name}' tại /tmp/`);
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