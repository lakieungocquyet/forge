/*
╔══════════════════════════════════════════════════════════════════════════╗
║  GIAI ĐOẠN 1: CHUNG CHO CẢ 2 TRƯỜNG HỢP                                  ║
╚══════════════════════════════════════════════════════════════════════════╝

 [Ổ ĐĨA THẬT]  C:\data\a.vcf  (200MB)
       │
       │  Người dùng bấm "Choose file" (<input type="file">)
       ▼
 [TRANG CHÍNH - main thread]
   File { name:"a.vcf", size:200MB, tham chiếu tới file thật }
   (chưa đọc byte nào, giống "lối tắt")
       │
       │  worker.postMessage({ args, files:[File] })
       ▼
 [WEB WORKER]
   createBcftools()  ->  dựng FS ảo (cây thư mục trong RAM)
       /
       ├── tmp/    (MEMFS)
       ├── dev/    (stdin, stdout, stderr)
       └── home/
       │
       │  mod.FS.mkdir('/work')
       ▼
       /
       ├── tmp/
       └── work/   (MEMFS, đang rỗng)
       │
       │
       ├────────────────────────┬─────────────────────────────┐
       │                        │                             │
       ▼                        │                             ▼
╔═════════════════════════╗     │     ╔═══════════════════════════════════╗
║ NHÁNH A: MOUNT          ║     │     ║ NHÁNH B: WRITEFILE                ║
║ (WORKERFS)              ║     │     ║ (MEMFS)                           ║
╚═════════════════════════╝     │     ╚═══════════════════════════════════╝

 FS.mount(WORKERFS,                    buf = await f.arrayBuffer()
          {files}, '/work')              └─ đọc CẢ 200MB từ ổ đĩa
       │                                    vào RAM, 1 LẦN (đắt, nhưng 1 lần)
       ▼                                        │
 /work bị "che" bởi WORKERFS                    ▼
 /                                       FS.writeFile('/work/a.vcf', buf)
 ├── tmp/                                       │
 └── work/ ══► [WORKERFS] (chỉ đọc)             ▼
        └── a.vcf ──► tham chiếu tới        /
                      File gốc              ├── tmp/
                      (KHÔNG có dữ liệu)    └── work/ (MEMFS, ghi được)
                                                   └── a.vcf = Uint8Array
                                                       200MB (BẢN SAO trong RAM)

 Dữ liệu thật nằm ở: Ổ ĐĨA                Dữ liệu thật nằm ở: RAM (heap JS)
 RAM tốn: ~0                              RAM tốn: ~2x file lúc chép, ~1x sau đó

       │                                        │
       └────────────────┬───────────────────────┘
                        ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  GIAI ĐOẠN 2: bcftools chạy - callMain(['stats','/work/a.vcf'])          ║
║  (C chỉ thấy đường dẫn /work/a.vcf, KHÔNG biết đang ở nhánh nào)         ║
╚══════════════════════════════════════════════════════════════════════════╝

   bcftools: fopen -> read(fd, buf, n)  (lặp rất nhiều lần)
        │
        ▼
   FS tìm node "/work/a.vcf" -> gọi stream_ops.read GẮN TRÊN NODE ĐÓ
        │
        ├──────────────────────────────┬───────────────────────────────────
        ▼                              ▼
   NHÁNH A: WORKERFS.read         NHÁNH B: MEMFS.read
        │                              │
   file.slice(p, p+n)                  │
        │                              │
   FileReaderSync.readAsArrayBuffer    │
        │  (hỏi trình duyệt, đọc       │
        │   ổ đĩa/cache, tạo           │
        │   ArrayBuffer mới)           │
        ▼                              ▼
   chép vào HEAP8 (WASM)          HEAPU8.set(mảng.subarray(p,p+n))
                                   = memcpy trong RAM
   MỖI LẦN read() đều trả          Không gọi trình duyệt,
   chi phí cố định cao             chi phí mỗi lần rất thấp

   Ví dụ: 600 giây                 Ví dụ: 3,5 giây

        │                              │
        └──────────────┬───────────────┘
                       ▼
╔══════════════════════════════════════════════════════════════════════════╗
║  GIAI ĐOẠN 3: LẤY KẾT QUẢ (giống nhau ở cả 2 nhánh)                      ║
╚══════════════════════════════════════════════════════════════════════════╝

   bcftools in ra stdout  ──►  print() ──► stdout[] ──► r.stdout
   hoặc ghi -o /tmp/out.vcf ──► FS.readFile('/tmp/out.vcf')
                       │
                       │  postMessage({ code, stdout, results })
                       ▼
   [TRANG CHÍNH] hiển thị / Blob + <a download> ──► file thật trên ổ đĩa
                       │
                       ▼
   worker.terminate() ──► toàn bộ FS ảo (cả /work, /tmp) biến mất khỏi RAM
*/


// Giải thích nguyên lý đọc file từ FS


/*
╔══════════════════════════════════════════════════════════════════════════╗
║  CƠ CHẾ TRA CỨU ĐƯỜNG DẪN CỦA FS (lookupPath) VÀ "CHE" KHI MOUNT         ║
║  Ví dụ: C gọi fopen("/work/a.vcf")                                       ║
╚══════════════════════════════════════════════════════════════════════════╝

 Đường dẫn "/work/a.vcf" được tách thành:  [ "work" , "a.vcf" ]
 FS đi dọc cây từ gốc, mỗi bước tìm 1 phần của đường dẫn.


 ┌─────────────────────────────────────────────────────────────────────────┐
 │ BƯỚC 0: bắt đầu tại root "/"                                            │
 └─────────────────────────────────────────────────────────────────────────┘
        rootNode
        └── contents: { tmp, dev, home, work }


 ┌─────────────────────────────────────────────────────────────────────────┐
 │ BƯỚC 1: tìm "work" trong rootNode.contents  →  được workNode            │
 │ (workNode là node MEMFS do mkdir('/work') tạo ra)                       │
 └─────────────────────────────────────────────────────────────────────────┘
        workNode = {
          name: 'work',
          mounted: ???,        ◄── đây là ô quyết định ở bước 2
          contents: {...}
        }


 ┌─────────────────────────────────────────────────────────────────────────┐
 │ BƯỚC 2: kiểm tra  workNode.mounted  có giá trị không?                   │
 │ (bước này chạy TRƯỚC khi nhìn vào workNode.contents)                    │
 └─────────────────────────────────────────────────────────────────────────┘
                              │
                 workNode.mounted ?
                              │
          ┌───────────────────┴────────────────────┐
          │                                        │
        null                                   có giá trị
   (KHÔNG mount)                              (ĐÃ mount)
   Trường hợp: mkdir + writeFile              Trường hợp: mkdir + mount(WORKERFS)
          │                                        │
          ▼                                        ▼
 ┌──────────────────────────┐        ┌───────────────────────────────────┐
 │ BƯỚC 3A                  │        │ BƯỚC 3B                           │
 │ Ở lại workNode (MEMFS)   │        │ "Nhảy" sang gốc filesystem gắn    │
 │                          │        │ vào:  node = mountObj.root        │
 │ tìm "a.vcf" trong        │        │                                   │
 │ workNode.contents        │        │ tìm "a.vcf" trong gốc WORKERFS    │
 └────────────┬─────────────┘        └────────────────┬──────────────────┘
              │                                       │
              ▼                                       ▼
 ┌──────────────────────────┐        ┌───────────────────────────────────┐
 │ node "a.vcf" của MEMFS   │        │ node "a.vcf" của WORKERFS         │
 │  contents: Uint8Array    │        │  tham chiếu tới File gốc          │
 │  (bản sao trong RAM)     │        │  (KHÔNG chứa dữ liệu)             │
 │  stream_ops = MEMFS      │        │  stream_ops = WORKERFS            │
 └────────────┬─────────────┘        └────────────────┬──────────────────┘
              │                                       │
              ▼                                       ▼
   read() = memcpy từ RAM                 read() = file.slice() +
   (nhanh)                                FileReaderSync (chậm)


 ┌─────────────────────────────────────────────────────────────────────────┐
 │ VÌ SAO GỌI LÀ "CHE"                                                     │
 └─────────────────────────────────────────────────────────────────────────┘

   Sau mount, workNode vẫn tồn tại trong cây, vẫn giữ contents cũ,
   nhưng bước 2 luôn chuyển hướng trước nên contents đó không bao giờ
   được xét tới:

        workNode
        ├── mounted ──────► mountObj.root ──► a.vcf (WORKERFS)   ◄── ĐƯỢC THẤY
        └── contents: { x.txt }                                   ◄── BỊ CHE
                       (file ghi vào /work trước khi mount)

   FS.unmount('/work')  →  workNode.mounted = null
                        →  bước 2 rẽ nhánh KHÔNG  →  x.txt hiện lại


 ┌─────────────────────────────────────────────────────────────────────────┐
 │ HỆ QUẢ                                                                  │
 └─────────────────────────────────────────────────────────────────────────┘

   - writeFile('/work/x') sau mount: tra cứu rơi vào gốc WORKERFS,
     backend này chỉ đọc nên lỗi.
   - bcftools không biết nhánh nào: nó chỉ nhận node cuối cùng, và gọi
     stream_ops.read gắn trên node đó. Backend nào tạo node thì dùng
     hàm read của backend đó.
*/
import createBcftools from './bcftools.js';

const BASE = import.meta.env.BASE_URL + 'wasm/bcftools/';

// Ngưỡng
const MAX_FILE_IN_RAM = 500 * 1024 * 1024;  // 500Mb  // 1 file lớn hơn mức này -> WORKERFS
const MAX_TOTAL_IN_RAM = 1 * 1024 * 1024 * 1024;  // 1Gb // tổng file nạp RAM không vượt mức này

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
        const mod = await createBcftools({
            print: (t) => stdout.push(t),
            printErr: (t) => stderr.push(t),
            locateFile: (p) => BASE + p,
        });

        // forceMode: 'ram' | 'mount' | undefined (tự động)
        let { inRam, mounted } = planFiles(files);
        if (forceMode === 'ram') { inRam = files; mounted = []; }
        if (forceMode === 'mount') { inRam = []; mounted = files; }

        const paths = {};   // tên file -> đường dẫn thật trong FS
        /*
            // ============================================================
            // BƯỚC 1: mkdir -> tạo thư mục rỗng /work trong MEMFS
            //         (chỉ là một node object JS trong RAM của worker,
            //          đóng vai trò "điểm gắn" cho bước tiếp theo)
            // ============================================================
            mod.FS.mkdir('/work');


            // ============================================================
            // BƯỚC 2: mount -> gắn WORKERFS lên /work
            //   - Từ đây mọi truy cập dưới /work đi qua driver WORKERFS
            //     (thư mục MEMFS bên dưới bị "che", không còn truy cập được)
            //   - Mỗi File trong `files` trở thành 1 node chỉ-đọc:
            //       /work/<tên file>  ->  tham chiếu tới File gốc
            //   - KHÔNG đọc nội dung lúc mount; dữ liệu vẫn nằm ở File của
            //     trình duyệt (ổ đĩa), chỉ lấy từng đoạn khi bcftools gọi read()
            //     (file.slice + FileReaderSync -> chép vào bộ nhớ WASM)
            //   - Ưu: tiết kiệm RAM, mở ngay. Nhược: chậm nếu đọc nhiều lần nhỏ
            // ============================================================
            mod.FS.mount(mod.WORKERFS, { files }, '/work');

            
        */
        /*
          TRƯỚC mount                      SAU mount(WORKERFS, {files}, '/work')
          ------------                     --------------------------------------
          /  (MEMFS, trong RAM)            /  (MEMFS, trong RAM)
          ├── tmp/   (MEMFS)               ├── tmp/   (MEMFS)
          └── work/  (MEMFS, rỗng)         └── work/  ══► [WORKERFS]  (chỉ đọc)
                                                 └── a.vcf ──┐ chỉ là tham chiếu
                                                             │
          Luồng đọc khi bcftools chạy:                       ▼
          bcftools read(fd) -> FS -> WORKERFS.read -> file.slice(p, p+n)
                ^                                          |
                |                                          v
                └────── chép vào bộ nhớ WASM <── trình duyệt đọc từ ổ đĩa
                                                 (mỗi lần đều tốn chi phí cố định)
        
          So sánh: mkdir + writeFile (MEMFS)
          /work (MEMFS) └── a.vcf = bản sao Uint8Array trong RAM
          bcftools read(fd) -> FS -> MEMFS.read -> đọc thẳng từ RAM (nhanh)
        */

        // ============================================================
        // BƯỚC 1: mkdir -> tạo thư mục /work trong MEMFS (RAM của worker)
        //   - Chỉ là một node object JS, chưa có dữ liệu file
        //   - try/catch: nếu /work đã tồn tại thì mkdir ném lỗi, bỏ qua
        //   - KHÔNG mount gì cả: /work là thư mục MEMFS thường, ghi được
        // ============================================================
        try { mod.FS.mkdir('/work'); } catch { 
            // /work đã tồn tại, không cần làm gì
        }
		// ============================================================
		// BƯỚC 2: copy từng File người dùng chọn vào /work (MEMFS)
		//   - f.arrayBuffer(): đọc TOÀN BỘ file từ ổ đĩa vào RAM, MỘT lần
		//     (đây là lần duy nhất đi qua "ranh giới đắt": ổ đĩa -> trình duyệt)
		//   - FS.writeFile(): tạo node file /work/<tên> trong MEMFS,
		//     giữ nội dung dưới dạng Uint8Array trong heap JS
		//   - Sau đó bcftools read() chỉ là memcpy từ RAM -> nhanh
		//   - Đánh đổi: tốn RAM (~2x dung lượng file lúc chép), phải chờ chép trước
		//   - console.time: đo thời gian chép, xóa khi không cần debug
		// ============================================================
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

        // Cho phép args dùng placeholder {tên file} thay cho đường dẫn cứng (Thay vì phải ghi đầy đủ đường dẫn tới file name trong FS trên args, hỗ trợ truyền mỗi tên file)
        const finalArgs = args.map((a) => {
            const m = /^\{(.+)\}$/.exec(a);
            return m && paths[m[1]] ? paths[m[1]] : a;
        });

		/*
		  TRƯỚC                            SAU mkdir + writeFile
		  ------                           ----------------------------
		  /  (MEMFS, RAM)                  /  (MEMFS, RAM)
		  ├── tmp/                         ├── tmp/
		  └── (chưa có work)               └── work/  (MEMFS, ghi được)
		                                         └── a.vcf = Uint8Array 200MB
		                                             (BẢN SAO nằm trong RAM)
		
		  Ổ đĩa thật           trình duyệt            heap JS (worker)
		  ┌──────────┐  1 lần  ┌─────────┐ arrayBuffer ┌───────────────┐
		  │ a.vcf    │ ──────► │  File   │ ──────────► │ buf (tạm)     │
		  └──────────┘ (đắt)   └─────────┘             └──────┬────────┘
		                                                      │ writeFile
		                                                      ▼
		                                              ┌───────────────┐
		                                              │ MEMFS node    │
		                                              │ /work/a.vcf   │
		                                              └──────┬────────┘
		                                                     │ read() = memcpy (rẻ)
		                                                     ▼
		                                              bộ nhớ WASM (HEAP8)
		                                              bcftools xử lý
		
		  So với mount(WORKERFS): mỗi read() phải quay ra trình duyệt
		  (file.slice + FileReaderSync), còn ở đây chỉ đọc RAM.
		*/
        let code = 0;
        try {
            console.time("bcftools");
            console.log("Start running bcftools")
            code = mod.callMain(finalArgs);
            console.timeEnd("bcftools");
            console.log(`Done running bcftools (exit code: ${code})`)
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