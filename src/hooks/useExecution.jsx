import { useState, useEffect, useRef, useCallback } from "react";

const EMPTY_LOGS = { stdout: "", stderr: "", command: "" };

const initStages = (defs) =>
    defs.map((d) => ({
        id: d.id,
        title: d.title,
        status: "waiting",
        duration: null,
        summary: d.waiting ?? "Waiting", // dòng tóm tắt của stage (không phải detail)
        details: [],                     // chỉ chứa các bước cụ thể tạo bởi sub()
    }));

// Đóng các detail đang chạy (tất cả, hoặc chỉ detail có id = onlyId)
const closeRunning = (details, status, now, onlyId) =>
    details.map((d) =>
        d.status === "running" && (onlyId === undefined || d.id === onlyId)
            ? { ...d, status, duration: (now - d.startedAt) / 1000 }
            : d
    );

/**
 * Hook dùng chung cho mọi tool.
 *
 * @param defs  Danh sách stage: [{ id, title, waiting? }]
 *
 *   const exec = useExecution(MY_STAGES);
 *   await exec.execute(async ({ step, setLog }) => {
 *       const idx = await step("prepare", async ({ sub }) => {
 *           return sub("Generating index", async () => { ... return value; });
 *       }, { running: "Preparing index", done: "Index ready" });
 *   });
 *
 * step(id, fn, { running, done })
 *   - running : dòng tóm tắt của stage lúc đang chạy
 *   - done    : dòng tóm tắt khi stage xong (thay running, KHÔNG phải detail).
 *               Có thể là hàm (result) => string
 *
 * fn nhận { sub }:
 *   - sub(text, asyncFn) : 1 bước cụ thể, tự đo thời gian, trả về kết quả của asyncFn.
 *                          asyncFn ném lỗi => detail đó failed, stage failed, pipeline dừng.
 *                          Gọi nhiều sub liên tiếp hoặc song song (Promise.all) đều được.
 *
 * Mọi detail được giữ nguyên cùng thời gian chạy sau khi stage kết thúc.
 */
export default function useExecution(defs) {
    const defsRef = useRef(defs);
    defsRef.current = defs;

    const [stages, setStages] = useState([]);
    const [status, setStatus] = useState("idle"); // idle | running | success | failed
    const [elapsed, setElapsed] = useState(0);
    const [logs, setLogs] = useState(EMPTY_LOGS);

    const t0 = useRef(0);
    const stageT0 = useRef({});
    const currentStage = useRef(null);
    const detailUid = useRef(0);

    // Tick 200ms khi đang chạy -> panel re-render => đồng hồ từng detail chạy realtime
    useEffect(() => {
        if (status !== "running") return;
        const id = setInterval(() => setElapsed((Date.now() - t0.current) / 1000), 200);
        return () => clearInterval(id);
    }, [status]);

    const update = useCallback(
        (id, fn) => setStages((prev) => prev.map((s) => (s.id === id ? fn(s) : s))),
        []
    );

    const setLog = useCallback((p) => setLogs((prev) => ({ ...prev, ...p })), []);

    const appendStderr = (msg) =>
        setLogs((prev) => ({ ...prev, stderr: prev.stderr ? `${prev.stderr}\n${msg}` : msg }));

    const failStage = useCallback(
        (id, msg) => {
            const now = Date.now();
            const started = stageT0.current[id] ?? now;
            update(id, (s) => ({
                ...s,
                status: "failed",
                duration: (now - started) / 1000,
                summary: msg,
                details: closeRunning(s.details, "failed", now),
            }));
        },
        [update]
    );

    const step = useCallback(
        // id   : id của stage (khớp với mảng defs)
        // fn   : hàm công việc, hook gọi nó và đưa { sub } vào
        // { running, done }: chữ tóm tắt của stage; có giá trị mặc định nếu không truyền
        async (id, fn, { running = "Processing...", done = "Done" } = {}) => {

            // ---------- 1. Chuẩn bị: ghi nhận stage bắt đầu ----------
            const t = Date.now();                 // mốc bắt đầu của cả stage
            currentStage.current = id;            // nhớ stage đang chạy (để execute biết stage nào lỗi nếu có lỗi ngoài sub)
            stageT0.current[id] = t;              // lưu mốc để failStage tính được duration khi lỗi

            // Đưa stage sang "running", đặt dòng tóm tắt = running, xóa detail của lần chạy trước
            update(id, (s) => ({ ...s, status: "running", summary: running, details: [] }));

            // ---------- 2. Tạo hàm sub riêng cho stage này ----------
            // sub(text, subFn): một bước cụ thể, hiện thành 1 dòng detail có đồng hồ riêng
            const sub = async (text, subFn) => {
                const did = ++detailUid.current;  // id duy nhất cho detail này (để đóng đúng cái, kể cả khi chạy song song)
                const startedAt = Date.now();     // mốc bắt đầu của detail, panel dùng để đếm M:S realtime

                // Thêm detail mới vào cuối danh sách, trạng thái "running"
                update(id, (s) => ({
                    ...s,
                    details: [...s.details, { id: did, text, status: "running", startedAt, duration: null }],
                }));

                // Đóng đúng detail này (theo did) với trạng thái st, ghi duration cố định
                const close = (st) => {
                    const now = Date.now();
                    update(id, (s) => ({ ...s, details: closeRunning(s.details, st, now, did) }));
                };

                try {
                    const r = await subFn();      // chạy việc thật
                    close("completed");           // xong: đóng detail, ghi thời gian
                    return r;                     // trả kết quả của subFn cho người gọi
                } catch (e) {
                    close("failed");              // lỗi: detail này đỏ, vẫn ghi thời gian
                    throw e;                      // ném tiếp để step bên dưới xử lý lỗi cả stage
                }
            };

            // ---------- 3. Chạy hàm công việc ----------
            try {
                const result = await fn({ sub }); // hook gọi fn, truyền vào object { sub }
                const now = Date.now();

                // Thành công: stage "completed", ghi tổng thời gian,
                // summary đổi thành `done` (có thể là hàm nhận result), đóng mọi detail còn sót
                update(id, (s) => ({
                    ...s,
                    status: "completed",
                    duration: (now - t) / 1000,
                    summary: typeof done === "function" ? done(result) : done,
                    details: closeRunning(s.details, "completed", now),
                }));
                currentStage.current = null;      // không còn stage nào đang chạy
                return result;                    // trả giá trị fn trả về cho `await step(...)`
            } catch (e) {
                // ---------- 4. Lỗi ----------
                const msg = e?.message ?? String(e);   // lấy thông báo lỗi (an toàn nếu e không phải Error)
                failStage(id, msg);                    // stage "failed", summary = msg, đóng detail đang chạy là failed
                appendStderr(msg);                     // ghi vào tab Stderr
                currentStage.current = null;

                // Ném lỗi tiếp để execute() dừng pipeline; gắn cờ execHandled
                // để execute biết lỗi này đã được xử lý, không ghi lại lần nữa
                throw Object.assign(e instanceof Error ? e : new Error(msg), { execHandled: true });
            }
        },
        [update, failStage]   // dependency của useCallback: hàm step chỉ tạo lại nếu hai hàm này đổi (thực tế không đổi)
    );

    const execute = useCallback(
        async (pipeline) => {
            t0.current = Date.now();
            stageT0.current = {};
            currentStage.current = null;
            setElapsed(0);
            setLogs(EMPTY_LOGS);
            setStages(initStages(defsRef.current));
            setStatus("running");

            try {
                await pipeline({ step, setLog });
                setElapsed((Date.now() - t0.current) / 1000);
                setStatus("success");
                return true;
            } catch (e) {
                if (!e?.execHandled) {
                    const msg = e?.message ?? String(e);
                    if (currentStage.current) failStage(currentStage.current, msg);
                    appendStderr(msg);
                }
                setElapsed((Date.now() - t0.current) / 1000);
                setStatus("failed");
                return false;
            }
        },
        [step, setLog, failStage]
    );

    const reset = useCallback(() => {
        setStatus("idle");
        setStages([]);
        setElapsed(0);
        setLogs(EMPTY_LOGS);
    }, []);

    return { stages, status, elapsed, logs, execute, reset };
}
