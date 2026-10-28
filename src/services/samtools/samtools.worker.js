import createSamtools from './samtools.js';

const BASE = import.meta.env.BASE_URL + 'wasm/samtools/';

// Ngưỡng
const MAX_FILE_IN_RAM = 3 * 1024 * 1024 * 1024; // 3Gb   // 1 file lớn hơn mức này -> WORKERFS
const MAX_TOTAL_IN_RAM = 4 * 1024 * 1024 * 1024; // 4Gb   // tổng file nạp RAM không vượt mức này

// Chia file thành 2 nhóm: nạp RAM / mount
function planFiles(files) {
    // File nhỏ nạp trước để tận dụng ngân sách RAM
    const sorted = [...files].sort((a, b) => a.size - b.size);
    const inRam = [];
    const mounted = [];
    let total = 0;

    for (const f of sorted) {
        if (f.size <= MAX_FILE_IN_RAM && total + f.size <= MAX_TOTAL_IN_RAM) {
            inRam.push(f);
            total += f.size;
        } else {
            mounted.push(f);
        }
    }
    return { inRam, mounted };
}

self.onmessage = async (e) => {
    const { args, files = [], outputs = [], forceMode } = e.data;
    const stdout = [];
    const stderr = [];

    try {
        const mod = await createSamtools({
            print: (t) => stdout.push(t),
            printErr: (t) => stderr.push(t),
            locateFile: (p) => BASE + p, // chỉ còn samtools.wasm và samtools.data
        });

        // forceMode: 'ram' | 'mount' | undefined (tự động)
        let { inRam, mounted } = planFiles(files);
        if (forceMode === 'ram') { inRam = files; mounted = []; }
        if (forceMode === 'mount') { inRam = []; mounted = files; }

        const paths = {};   // tên file -> đường dẫn thật trong FS
        try { mod.FS.mkdir('/work'); } catch { 
            // /work đã tồn tại, không cần làm gì
        }
        if (inRam.length > 0) console.time('copy-files');
        for (const f of inRam) {
            try {
                const buf = new Uint8Array(await f.arrayBuffer());
                mod.FS.writeFile('/work/' + f.name, buf);
                paths[f.name] = '/work/' + f.name;
            } catch (err) {
                mounted.push(f);   // không đủ RAM -> chuyển sang mount
                stderr.push(`Fallback to WORKERFS for ${f.name}: ${err.message}`);
            }
        }
        if (inRam.length > 0) console.timeEnd('copy-files');

        // Nhóm 2: mount WORKERFS tại /big (đọc theo yêu cầu)
        if (mounted.length > 0) {
            try { mod.FS.mkdir('/big'); } catch { /* đã tồn tại */ }
            mod.FS.mount(mod.WORKERFS, { files: mounted }, '/big');
            for (const f of mounted) paths[f.name] = '/big/' + f.name;
        }

        const finalArgs = args.map((a) => {
            const m = /^\{(.+)\}$/.exec(a);
            return m && paths[m[1]] ? paths[m[1]] : a;
        });

        let code = 0;
        try {
            console.time("samtools");
            console.log("Start running samtools")
            code = mod.callMain(finalArgs);
            console.timeEnd("samtools");
            console.log(`Done running samtools (exit code: ${code})`)
        } catch (err) {
            code = err?.status ?? 1;
            if (err?.status === undefined) stderr.push(String(err));
        }

        const results = {};
        for (const name of outputs) {
            try {
                results[name] = mod.FS.readFile('/tmp/' + name);
            } catch {
                // Hoặc có thể in ra stderr của worker
                stderr.push(`Output '${name}' not found in /tmp/ (${err.message})`);
            }
        }

        self.postMessage(
            { 
                code, 
                stdout: stdout.join('\n'), 
                stderr: stderr.join('\n'), 
                results,
                modes: {   // để giao diện hiển thị/debug
                    inRam: inRam.map((f) => f.name),
                    mounted: mounted.map((f) => f.name),
                },
            },
            Object.values(results).map((u8) => u8.buffer)
        );
    } catch (err) {
        self.postMessage({ code: -1, stdout: '', stderr: String(err), results: {} });
    }
};