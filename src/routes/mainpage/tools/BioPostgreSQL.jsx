import { useState, useRef, useMemo, useEffect } from "react"
import { PGlite as PGliteDB } from "@electric-sql/pglite";
import * as XLSX from "xlsx";
import Divider from "../../../components/ui/Divider";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import ExcelIcon from "../../../components/icon/ExcelIcon";
import CsvIcon from "../../../components/icon/CsvIcon";

function BioPostgreSQL() {
    const breadcrumbItems = [
        { label: "FORGE Home", path: "/" },
        { label: "Tools", path: "/tools" },
        { label: "BioPostgreSQL", path: "/tools/biopostgresql" },
    ];

    // --- Database: 1 PGlite dùng chung cho tất cả các bảng ---
    const dbRef = useRef(null);
    const [db, setDb] = useState(null);

    // --- Danh sách bảng đã import: [{ name, columns, rowCount, source }] ---
    const [tables, setTables] = useState([]);
    const [activeTable, setActiveTable] = useState(null);

    // --- State cho database ---
    const [toast, setToast] = useState(null); // { message, type: "loading" | "success" | "error" }

    const [loadingMessage, setLoadingMessage] = useState("");
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), toast.type === "error" ? 6000 : 3000);
        return () => clearTimeout(timer);
    }, [toast]);

    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    // --- State cho vùng query ---
    const [sql, setSql] = useState("SELECT * FROM imported_data WHERE gene LIKE ANY (SELECT '%' || unnest(ARRAY['ABCA3', 'ACVRL1', 'AP3B1', 'ASCL1', 'BDNF', 'BLOC1S3']) || '%') ");
    const [queryResult, setQueryResult] = useState(null); // { columns, rows }
    const [queryError, setQueryError] = useState("");
    const [queryLoading, setQueryLoading] = useState(false);

    // --- State cho vùng preview ---
    const [previewPage, setPreviewPage] = useState(1);
    const [previewPageSize, setPreviewPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // --- Chuẩn hóa tên cột ---
    const sanitizeColumnName = (name, index) => {
        const cleaned = String(name) // Ép kiểu thành String
            .trim() // Xóa khoảng trắng đầu và cuối
            .toLowerCase() 
            .replace(/[^a-z0-9_]/g, "_") // Thay tất cả ký tự không phải: a-z; 0-9 hoặc "_" thành "_"
            .replace(/^_+|_+$/g, ""); // Xóa "_" ở đầu và cuối
        return cleaned || `col_${index}`;
    };
    // --- Chuẩn hóa tên bảng ---
    const sanitizeTableName = (name) => {
        let cleaned = String(name)
            .replace(/\.[^.]+$/, "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .replace(/^_+|_+$/g, "");
        if (!cleaned) cleaned = "table";
        if (/^[0-9]/.test(cleaned)) cleaned = `t_${cleaned}`;
        return cleaned;
    };
    // Đảm bảo tên bảng không trùng: gene -> gene_2 -> gene_3 ...
    const makeUniqueName = (base, taken) => {
        if (!taken.has(base)) return base;
        let n = 2;
        while (taken.has(`${base}_${n}`)) n++;
        return `${base}_${n}`;
    };

    // Chuẩn hóa danh sách cột và tránh trùng tên (kể cả với cột "id" tự sinh)
    const buildColumns = (rawColumns) => {
        const seen = new Set(["id"]);
        return rawColumns.map((c, i) => {
            const base = sanitizeColumnName(c, i);
            let finalName = base;
            let n = 2;
            while (seen.has(finalName)) finalName = `${base}_${n++}`;
            seen.add(finalName);
            return finalName;
        });
    };
        // Import 1 sheet thành 1 bảng
    const importSheet = async (database, tableName, rows) => {
        // Lấy tập cột từ TẤT CẢ các dòng (không chỉ dòng đầu)
        const rawColumns = [];
        const seenRaw = new Set();
        for (const row of rows) {
            for (const key of Object.keys(row)) {
                if (!seenRaw.has(key)) {
                    seenRaw.add(key);
                    rawColumns.push(key);
                }
            }
        }
        const columns = buildColumns(rawColumns);

        const columnDefs = columns.map((c) => `"${c}" TEXT`).join(", ");
        await database.exec(`CREATE TABLE "${tableName}" (id SERIAL PRIMARY KEY, ${columnDefs});`);

        const colNamesSql = columns.map((c) => `"${c}"`).join(", ");
        // Chia lô: Postgres giới hạn 65535 tham số / câu lệnh
        const rowsPerBatch = Math.max(1, Math.floor(60000 / columns.length));

        await database.exec("BEGIN;");
        try {
            for (let start = 0; start < rows.length; start += rowsPerBatch) {
                const batch = rows.slice(start, start + rowsPerBatch);
                const values = [];
                const groups = batch.map((row, r) => {
                    const ph = rawColumns.map((rc, c) => {
                        const v = row[rc];
                        values.push(v === undefined || v === null ? null : String(v));
                        return `$${r * rawColumns.length + c + 1}`;
                    });
                    return `(${ph.join(", ")})`;
                });
                await database.query(
                    `INSERT INTO "${tableName}" (${colNamesSql}) VALUES ${groups.join(", ")};`,
                    values
                );
            }
            await database.exec("COMMIT;");
        } catch (err) {
            await database.exec("ROLLBACK;");
            await database.exec(`DROP TABLE IF EXISTS "${tableName}";`);
            throw err;
        }

        return { name: tableName, columns, rowCount: rows.length };
    };

    const loadPreview = async (database, tableName, columns) => {
        const result = await database.query(`SELECT * FROM "${tableName}" ORDER BY id;`);
        setPreview({ columns: ["id", ...columns], rows: result.rows });
        setPreviewPage(1);
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = ""; // cho phép chọn lại cùng 1 file
        if (!files.length) return;

        setLoading(true);
        setQueryResult(null);
        setQueryError("");
        setCurrentPage(1);

        try {
            setLoadingMessage("Initializing database...");
            let database = dbRef.current;
            if (!database) {
                database = new PGliteDB();
                dbRef.current = database;
                setDb(database);
            }

            const taken = new Set(tables.map((t) => t.name));
            const added = [];
            const skipped = [];

            for (const file of files) {
                setToast({ message: `Reading ${file.name}...`, type: "loading" });
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const workbook = XLSX.read(arrayBuffer, { type: "array" });
                    const baseName = sanitizeTableName(file.name);
                    const ext = file.name.split(".").pop().toLowerCase();
                    const multiSheet = workbook.SheetNames.length > 1;

                    for (const sheetName of workbook.SheetNames) {
                        const sheet = workbook.Sheets[sheetName];
                        const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
                        if (!rows.length) {
                            skipped.push(`${file.name}${multiSheet ? ` [${sheetName}]` : ""} (empty)`);
                            continue;
                        }

                        // 1 sheet -> tên file; nhiều sheet -> tên file + tên sheet
                        const desired = multiSheet
                            ? `${baseName}_${sanitizeTableName(sheetName)}`
                            : baseName;
                        const tableName = makeUniqueName(desired, taken);
                        taken.add(tableName);

                        setToast({ message: `Importing ${rows.length} rows into "${tableName}"...`, type: "loading" });
                        const info = await importSheet(database, tableName, rows);
                        added.push({
                            ...info,
                            ext,
                            source: multiSheet ? `${file.name} / ${sheetName}` : file.name,
                        });
                    }
                } catch (err) {
                    console.error(err);
                    skipped.push(`${file.name} (${err.message})`);
                }
            }

            if (added.length) {
                const nextTables = [...tables, ...added];
                setTables(nextTables);

                const first = added[0];
                setActiveTable(first.name);
                await loadPreview(database, first.name, first.columns);

                // Nếu ô query chưa có nội dung thì gợi ý câu lệnh đầu tiên
                setSql((prev) => (prev.trim() ? prev : `SELECT * FROM "${first.name}" LIMIT 100;`));
            }

            if (added.length) {
                let msg = `Imported ${added.length} table${added.length > 1 ? "s" : ""}: ${added.map((t) => `"${t.name}"`).join(", ")}`;
                if (skipped.length) msg += ` — skipped: ${skipped.join("; ")}`;
                setToast({ message: msg, type: "success" });
            } else {
                setToast({
                    message: skipped.length ? `No table was imported — ${skipped.join("; ")}` : "No table was imported",
                    type: "error",
                });
            }
        } catch (err) {
            console.error(err);
            setToast({ message: `Import failed: ${err.message}`, type: "error" });
        } finally {
            setLoading(false);
        }
    };
    const handleSelectTable = async (t) => {
        if (!dbRef.current) return;
        setActiveTable(t.name);
        try {
            await loadPreview(dbRef.current, t.name, t.columns);
        } catch (err) {
            setToast({ message: `Cannot load "${t.name}": ${err.message}`, type: "error" });
        }
    };
        const handleRemoveTable = async (t) => {
        if (!dbRef.current) return;
        try {
            await dbRef.current.exec(`DROP TABLE IF EXISTS "${t.name}";`);
            const next = tables.filter((x) => x.name !== t.name);
            setTables(next);
            setQueryResult(null);
            setQueryError("");
            setToast({ message: `Dropped table "${t.name}"`, type: "success" });

            if (activeTable === t.name) {
                if (next.length) {
                    setActiveTable(next[0].name);
                    await loadPreview(dbRef.current, next[0].name, next[0].columns);
                } else {
                    setActiveTable(null);
                    setPreview(null);
                }
            }
        } catch (err) {
            setToast({ message: `Cannot drop "${t.name}": ${err.message}`, type: "error" });
        }
    };

    
    // --- Hàm chạy query tự do ---
    const handleRunQuery = async () => {
        if (!db) {
            setQueryError("No database. Please import XLSX file first");
            return;
        }
        if (!sql.trim()) return;

        setQueryLoading(true);
        setQueryError("");
        setQueryResult(null);
        setCurrentPage(1);  

        try {
            const result = await db.query(sql);
            const columns = result.fields?.map((f) => f.name) ?? Object.keys(result.rows[0] ?? {});
            setQueryResult({ columns, rows: result.rows });
        } catch (err) {
            console.error(err);
            setQueryError(err.message);
        } finally {
            setQueryLoading(false);
        }
    };

    // Cho phép Ctrl+Enter / Cmd+Enter để chạy query nhanh
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            handleRunQuery();
        }
    };

    // ===== Pagination: PREVIEW =====
    const previewTotalRows = preview?.rows.length ?? 0;
    const previewTotalPages = Math.max(1, Math.ceil(previewTotalRows / previewPageSize));

    const paginatedPreviewRows = useMemo(() => {
        if (!preview) return [];
        const start = (previewPage - 1) * previewPageSize;
        return preview.rows.slice(start, start + previewPageSize);
    }, [preview, previewPage, previewPageSize]);

    const goToPreviewPage = (page) => {
        setPreviewPage(Math.min(Math.max(1, page), previewTotalPages));
    };

    const handlePreviewPageSizeChange = (e) => {
        setPreviewPageSize(Number(e.target.value));
        setPreviewPage(1);
    };

    // ===== Pagination: QUERY RESULT =====
    const totalRows = queryResult?.rows.length ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    const paginatedRows = useMemo(() => {
        if (!queryResult) return [];
        const start = (currentPage - 1) * pageSize;
        return queryResult.rows.slice(start, start + pageSize);
    }, [queryResult, currentPage, pageSize]);

    const goToPage = (page) => {
        setCurrentPage(Math.min(Math.max(1, page), totalPages));
    };

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setCurrentPage(1);
    };

    // Component pagination bar dùng chung cho cả 2 bảng
    const renderPaginationBar = (page, totalPages, onGoToPage) => (
        <div 
            style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "10px", 
                flexWrap: "wrap",
            }}
        >
            <button 
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(1)} 
                disabled={page === 1} 
                style={{ 
                    transition: "transform 0.15s ease",
                    height: "30px", 
                    width: "40px", 
                    padding: "5px 10px", 
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    border: "solid 1px #cfcfcf",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                    }}
                >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#555"><path d="M432-240 192-480l240-240 51 51-189 189 189 189-51 51Zm285 0L477-480l240-240 51 51-189 189 189 189-51 51Z"/></svg>
            </button>
            <button 
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(page - 1)} 
                disabled={page === 1} 
                style={{ 
                    transition: "transform 0.15s ease",
                    height: "30px", 
                    width: "40px", 
                    padding: "5px 10px", 
                    cursor: page === 1 ? "not-allowed" : "pointer", 
                    border: "solid 1px #cfcfcf",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center" 
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="-150 -960 960 960" width="15px" fill="#555"><path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>
            </button>
            <span style={{ fontSize: "14px", color: "#555" }}>Page {page} / {totalPages}</span>
            <button 
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(page + 1)} 
                disabled={page === totalPages} 
                style={{ 
                    transition: "transform 0.15s ease",
                    height: "30px", 
                    width: "40px", 
                    padding: "5px 10px", 
                    cursor: page === totalPages ? "not-allowed" : "pointer", 
                    border: "solid 1px #cfcfcf",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center"
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="#555"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>
            </button>
            <button 
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                }}
                onClick={() => onGoToPage(totalPages)} 
                disabled={page === totalPages} 
                style={{ 
                    transition: "transform 0.15s ease",
                    height: "30px", 
                    width: "40px", 
                    padding: "5px 10px",  
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    border: "solid 1px #cfcfcf",
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center"
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#555"><path d="m242-200 200-280-200-280h98l200 280-200 280h-98Zm238 0 200-280-200-280h98l200 280-200 280h-98Z"/></svg>
            </button>
        </div>
    );

    const EmptyState = ({style, icon, title, description }) => (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                minHeight: "300px",
                border: "1px dashed #d0d0d0",
                borderRadius: "6px",
                background: "#fafafa",
                color: "#888",
                textAlign: "center",
                padding: "20px",
                width: "calc(100vw - 50px * 2)",
                boxSizing: "border-box",
                ...style

            }}
        >
            <div style={{ fontSize: "32px", lineHeight: 1 }}>{icon}</div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 500, color: "#666" }}>{title}</p>
            <p style={{ margin: 0, fontSize: "13px", color: "#999" }}>{description}</p>
        </div>
    );

    const FILE_ICONS = {
        // Excel: ô vuông xanh lá, chữ X trắng
        xlsx: (
            <ExcelIcon size={16} />
        ),
        xls: (
            <ExcelIcon size={16} />
        ),
        // CSV: bảng lưới xanh olive
        csv: (
            <ExcelIcon size={16} />
        ),
        tsv: (
            <ExcelIcon size={16} />
        ),
        // Mặc định: tờ giấy xám
        default: (
            <>
                <path d="M3.5 1.5h5.5L12.5 5v9a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5Z" fill="none" stroke="#888" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M9 1.5V5h3.5" fill="none" stroke="#888" strokeWidth="1.2" strokeLinejoin="round" />
            </>
        ),
    };

    const FileTypeIcon = ({ ext, size = 16 }) => (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            style={{ flexShrink: 0 }}
            aria-hidden="true"
        >
            {FILE_ICONS[ext] ?? FILE_ICONS.default}
        </svg>
    );

    return (
        <div
            id="pglite"
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "start",
                flexDirection: "column",
                gap: "20px",
            }}
        >
            <Breadcrumb items={breadcrumbItems} />
            <p
                id="pglite_title"
                style={{
                    fontSize: "40px",
                    fontWeight: " 200",
                    paddingLeft: "50px",
                    margin: 0,
                }}
            >
                BioPostgreSQL
            </p>
            <p
                id="pglite_description"
                style={{
                    textAlign: "left",
                    fontSize: "20px",
                    fontWeight: 0,
                    paddingLeft: "50px",
                    margin: 0,
                    color: "#555555",
                }}
            >
                A tool for managing and querying structured biological data with PostgreSQL
            </p>
            <Divider margin="50px" />

            {/* --- import file --- */}
            <div 
                style={{ 
                    paddingLeft: "50px", 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "10px" ,
                    paddingRight: "50px",
                    width: "100%",
                    boxSizing: "border-box",
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .tsv"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
                <button
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#ffffff";
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    style={{
                        padding: "10px 20px",
                        fontSize: "15px",
                        cursor: loading ? "not-allowed" : "pointer",
                        width: "fit-content",
                        border: "solid 1px #cfcfcf",
                        backgroundColor: "white"
                    }}
                >
                    {loading ? "Loading..." : tables.length ? "Add more files (.xlsx)" : "Import files (.xlsx)"}
                </button>
                
                <div 
                    id="tables_and_preview"
                    style={{
                        display: "grid",
                        gridTemplateColumns: "250px auto 1fr",
                        gridTemplateAreas: "'left middle right'",
                        columnGap: "20px",
                        width: "100%",
                        boxSizing: "border-box",
                        border: "1px solid #a6a6a6",
                        borderRadius: "6px",
                        padding: "25px 20px"
                    }}
                >
                    <div
                        id="tables"
                        style={{
                            gridArea: "left",
                            width: "250px",
                            position: "relative", // làm mốc cho lớp absolute bên trong
                        }}
                    >
                        {/* Lớp absolute phủ kín cột, không đóng góp vào chiều cao hàng grid */}
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                            }}
                        >
                            {/* ===== PHẦN CỐ ĐỊNH: tiêu đề + số bảng ===== */}
                            <div
                                style={{
                                    flexShrink: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: "500",
                                        boxSizing: "border-box",
                                        backgroundColor: "#f5f5f5",
                                        padding: "5px 10px",
                                        textAlign: "center",
                                        borderRadius: "6px",
                                    }}
                                >
                                    Tables
                                </div>

                                {tables.length > 0 && (
                                    <span style={{ fontSize: "12px", color: "#555" }}>
                                        {tables.length} table{tables.length > 1 ? "s" : ""} loaded — click to preview
                                    </span>
                                )}
                            </div>

                            {/* ===== PHẦN CUỘN: danh sách bảng ===== */}
                            {tables.length > 0 ? (
                                <div
                                    style={{
                                        flex: 1,
                                        minHeight: 0,
                                        overflowY: "auto",
                                        overflowX: "hidden",
                                        display: "flex",
                                        paddingRight: "20px",
                                        flexDirection: "column",
                                        gap: "8px",
                                    }}
                                >
                                    {tables.map((t) => {
                                        const isActive = t.name === activeTable;
                                        return (
                                            <div
                                                key={t.name}
                                                title={`${t.source} — ${t.columns.length} columns`}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderRadius = "999px";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderRadius = "0%"
                                                }}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    border: `solid 1px ${isActive ? "#555" : "#cfcfcf"}`,
                                                    backgroundColor: isActive ? "#f5f5f5" : "#fff",
                                                    width: "100%",
                                                    height: "30px",
                                                    boxSizing: "border-box",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <button
                                                    onClick={() => handleSelectTable(t)}
                                                    style={{
                                                        boxSizing: "border-box",
                                                        display: "flex",
                                                        gap: "5px",
                                                        flex: "1 1 0",
                                                        minWidth: 0,
                                                        padding: "5px 10px",
                                                        fontSize: "13px",
                                                        border: "none",
                                                        background: "transparent",
                                                        cursor: "pointer",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        textAlign: "left",
                                                        alignItems: "center",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    <span style={{ flexShrink: 0, display: "flex" }}>
                                                        <FileTypeIcon ext={t.ext} />
                                                    </span>

                                                    <span
                                                        style={{
                                                            flex: "1 1 0",
                                                            minWidth: 0,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {t.name}
                                                    </span>
                                                    

                                                </button>
                                                <button
                                                    onClick={() => handleRemoveTable(t)}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.backgroundColor = "#c7c7c7";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.backgroundColor = "transparent";
                                                    }}
                                                    title={`Drop table ${t.name}`}
                                                    style={{
                                                        flexShrink: 0,
                                                        backgroundColor: "transparent",
                                                        boxSizing: "border-box",
                                                        fontSize: "15px",
                                                        width: "23px",
                                                        height: "23px",
                                                        margin: "3px 3px",
                                                        border: "none",
                                                        background: "transparent",
                                                        color: "#7b7b7b",
                                                        cursor: "pointer",
                                                        borderRadius : "50%"
                                                    }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    style={{ width: "250px", padding: "12px", flex: 1, minHeight: 0 }}
                                    icon={
                                        <svg width="36px" height="36px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#000000">
                                            <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                                                <g fill="#555" fillRule="nonzero">
                                                    <path d="M17.5,12 C20.5376,12 23,14.4624 23,17.5 C23,20.5376 20.5376,23 17.5,23 C14.4624,23 12,20.5376 12,17.5 C12,14.4624 14.4624,12 17.5,12 Z M17.5,13.9993 C17.2545778,13.9993 17.0504,14.1762086 17.0080571,14.4094355 L17,14.4993 L17.0005,17 L14.4961,17 C14.22,17 13.9961,17.2239 13.9961,17.5 C13.9961,17.7455111 14.1730086,17.9496198 14.4062355,17.9919462 L14.4961,18 L17.0006,18 L17.0011,20.5035 C17.0011,20.7797 17.225,21.0035 17.5011,21.0035 C17.7466111,21.0035 17.9507198,20.8266704 17.9930462,20.5933908 L18.0011,20.5035 L18.0006,18 L20.503,18 C20.7792,18 21.003,17.7762 21.003,17.5 C21.003,17.2545778 20.8261704,17.0504 20.5928908,17.0080571 L20.503,17 L18.0005,17 L18,14.4993 C18,14.2232 17.7761,13.9993 17.5,13.9993 Z M17.75,3 C19.5449,3 21,4.45507 21,6.25 L21,12.0218 C20.5368,11.7253 20.0335,11.4858 19.5,11.3135 L19.5,10 L15.5,10 L15.5,11.3135 C14.9665,11.4858 14.4632,11.7253 14,12.0218 L14,10 L10,10 L10,14 L12.0218,14 C11.7253,14.4632 11.4858,14.9665 11.3135,15.5 L10,15.5 L10,19.5 L11.3135,19.5 C11.4858,20.0335 11.7253,20.5368 12.0218,21 L6.25,21 C4.45507,21 3,19.5449 3,17.75 L3,6.25 C3,4.45507 4.45507,3 6.25,3 L17.75,3 Z M8.5,15.5 L4.5,15.5 L4.5,17.75 C4.5,18.668175 5.20710875,19.4211925 6.10647256,19.4941988 L6.25,19.5 L8.5,19.5 L8.5,15.5 Z M8.5,10 L4.5,10 L4.5,14 L8.5,14 L8.5,10 Z M8.5,4.5 L6.25,4.5 C5.2835,4.5 4.5,5.2835 4.5,6.25 L4.5,8.5 L8.5,8.5 L8.5,4.5 Z M17.75,4.5 L15.5,4.5 L15.5,8.5 L19.5,8.5 L19.5,6.25 C19.5,5.331825 18.7928913,4.5788075 17.8935274,4.50580119 L17.75,4.5 Z M14,4.5 L10,4.5 L10,8.5 L14,8.5 L14,4.5 Z" />
                                                </g>
                                            </g>
                                        </svg>
                                    }
                                    title="No tables yet"
                                    description="Each imported file appears here as a table"
                                />
                            )}
                        </div>
                    </div>
                    <Divider style={{ gridArea: "middle"}} orientation = "vertical"/>
                    <div
                        id="preview"
                        style={{
                            gridArea: "right",
                            padding: "none", 
                            display: "flex", 
                            flexDirection: "column", 
                            gap: "10px",
                            maxWidth: "calc(100vw - 50px * 2 - 250px - 40px - 50px)", 
                            boxSizing: "border-box",
                            gap: "8px"
                        }}
                    >
                        <div
                            style={{
                                fontSize: "20px",
                                fontWeight: "500",
                                boxSizing: "border-box",
                                backgroundColor: "#f5f5f5",
                                padding: "5px 10px",
                                textAlign: "center",
                                borderRadius: "6px",
                            }}
                        >
                            Preview
                        </div>
                        {preview ? (
                            <>
                                <span style={{ color: "#000000", fontSize: "18px", fontWeight: "500" }}> 
                                    Table name: <span style={{ color: "#555", fontSize: "18px", fontWeight: "400"}}> {activeTable} </span>
                                </span> 
                                {/* Thanh điều khiển page size */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                    <span style={{ color: "#555", fontSize: "14px" }}>{previewTotalRows} rows total</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <label style={{ fontSize: "14px", color: "#555" }}>Rows per page:</label>
                                        <select value={previewPageSize} onChange={handlePreviewPageSizeChange} style={{ padding: "4px 8px", fontSize: "14px", border: "solid 1px #cfcfcf", }}>
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>
                                <div 
                                    className="table"
                                    style={{ 
                                        overflowX: "auto", 
                                    }}
                                >
                                    <table style={{ borderCollapse: "collapse", fontSize: "14px" }}>
                                        <thead>
                                            <tr>
                                                {preview.columns.map((col) => (
                                                    <th
                                                        key={col}
                                                        style={{
                                                            border: "1px solid #ccc",
                                                            padding: "6px 10px",
                                                            background: "#f5f5f5",
                                                            textAlign: "left",
                                                        }}
                                                    >
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedPreviewRows.map((row, i) => (
                                                <tr key={i}>
                                                    {preview.columns.map((col) => (
                                                        <td 
                                                            key={col} 
                                                            style={{ 
                                                                border: "1px solid #eee", 
                                                                padding: "6px 10px",
                                                                whiteSpace: "nowrap",     // không cho xuống dòng
                                                            }}>
                                                            {String(row[col] ?? "")}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {/* Dòng trống để trang cuối vẫn đủ chiều cao */}
                                            {Array.from({ length: Math.max(0, previewPageSize - paginatedPreviewRows.length) }).map((_, i) => (
                                                <tr key={`empty-${i}`} aria-hidden="true">
                                                    {preview.columns.map((col) => (
                                                        <td
                                                            key={col}
                                                            style={{
                                                                border: "1px solid #eee",
                                                                padding: "6px 10px",
                                                                whiteSpace: "nowrap",
                                                            }}>
                                                            {"\u00A0"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {renderPaginationBar(previewPage, previewTotalPages, goToPreviewPage)}
                            </>  
                        ) : (
                            <>
                                <EmptyState
                                    style={{
                                        width: "calc(100vw - 50px * 2 - 250px - 40px - 50px)"
                                    }}
                                    icon={
                                        <svg width="50px" height="50px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M13 3L13.7071 2.29289C13.5196 2.10536 13.2652 2 13 2V3ZM14 22C14.5523 22 15 21.5523 15 21C15 20.4477 14.5523 20 14 20V22ZM19 9H20C20 8.73478 19.8946 8.48043 19.7071 8.29289L19 9ZM18 10C18 10.5523 18.4477 11 19 11C19.5523 11 20 10.5523 20 10H18ZM5.21799 19.908L4.32698 20.362H4.32698L5.21799 19.908ZM6.09202 20.782L6.54601 19.891L6.54601 19.891L6.09202 20.782ZM6.09202 3.21799L5.63803 2.32698L5.63803 2.32698L6.09202 3.21799ZM5.21799 4.09202L4.32698 3.63803L4.32698 3.63803L5.21799 4.09202ZM13.109 8.45399L14 8V8L13.109 8.45399ZM13.546 8.89101L14 8L13.546 8.89101ZM17.2299 17.7929C16.8394 18.1834 16.8394 18.8166 17.2299 19.2071C17.6204 19.5976 18.2536 19.5976 18.6441 19.2071L17.2299 17.7929ZM15.0316 15.2507C14.8939 15.7856 15.2159 16.3308 15.7507 16.4684C16.2856 16.6061 16.8308 16.2841 16.9684 15.7493L15.0316 15.2507ZM17.9375 20C17.3852 20 16.9375 20.4477 16.9375 21C16.9375 21.5523 17.3852 22 17.9375 22V20ZM17.9475 22C18.4998 22 18.9475 21.5523 18.9475 21C18.9475 20.4477 18.4998 20 17.9475 20V22ZM13 2H8.2V4H13V2ZM4 6.2V17.8H6V6.2H4ZM8.2 22H14V20H8.2V22ZM19.7071 8.29289L13.7071 2.29289L12.2929 3.70711L18.2929 9.70711L19.7071 8.29289ZM20 10V9H18V10H20ZM4 17.8C4 18.3436 3.99922 18.8114 4.03057 19.195C4.06287 19.5904 4.13419 19.9836 4.32698 20.362L6.10899 19.454C6.0838 19.4045 6.04612 19.3038 6.02393 19.0322C6.00078 18.7488 6 18.3766 6 17.8H4ZM8.2 20C7.62345 20 7.25117 19.9992 6.96784 19.9761C6.69617 19.9539 6.59545 19.9162 6.54601 19.891L5.63803 21.673C6.01641 21.8658 6.40963 21.9371 6.80497 21.9694C7.18864 22.0008 7.65645 22 8.2 22V20ZM4.32698 20.362C4.6146 20.9265 5.07354 21.3854 5.63803 21.673L6.54601 19.891C6.35785 19.7951 6.20487 19.6422 6.10899 19.454L4.32698 20.362ZM8.2 2C7.65645 2 7.18864 1.99922 6.80497 2.03057C6.40963 2.06287 6.01641 2.13419 5.63803 2.32698L6.54601 4.10899C6.59545 4.0838 6.69617 4.04612 6.96784 4.02393C7.25117 4.00078 7.62345 4 8.2 4V2ZM6 6.2C6 5.62345 6.00078 5.25117 6.02393 4.96784C6.04612 4.69617 6.0838 4.59545 6.10899 4.54601L4.32698 3.63803C4.13419 4.01641 4.06287 4.40963 4.03057 4.80497C3.99922 5.18864 4 5.65645 4 6.2H6ZM5.63803 2.32698C5.07354 2.6146 4.6146 3.07354 4.32698 3.63803L6.10899 4.54601C6.20487 4.35785 6.35785 4.20487 6.54601 4.10899L5.63803 2.32698ZM12 3V7.4H14V3H12ZM14.6 10H19V8H14.6V10ZM12 7.4C12 7.66353 11.9992 7.92131 12.0169 8.13823C12.0356 8.36682 12.0797 8.63656 12.218 8.90798L14 8C14.0293 8.05751 14.0189 8.08028 14.0103 7.97537C14.0008 7.85878 14 7.69653 14 7.4H12ZM14.6 8C14.3035 8 14.1412 7.99922 14.0246 7.9897C13.9197 7.98113 13.9425 7.9707 14 8L13.092 9.78201C13.3634 9.92031 13.6332 9.96438 13.8618 9.98305C14.0787 10.0008 14.3365 10 14.6 10V8ZM12.218 8.90798C12.4097 9.2843 12.7157 9.59027 13.092 9.78201L14 8V8L12.218 8.90798ZM18.937 16C18.937 16.1732 18.8915 16.3053 18.6175 16.5697C18.4638 16.718 18.2828 16.8653 18.0319 17.074C17.7936 17.2723 17.5141 17.5087 17.2299 17.7929L18.6441 19.2071C18.86 18.9913 19.0805 18.8033 19.3109 18.6116C19.5287 18.4305 19.7852 18.2223 20.0065 18.0087C20.4825 17.5493 20.937 16.9314 20.937 16H18.937ZM17.937 15C18.4893 15 18.937 15.4477 18.937 16H20.937C20.937 14.3431 19.5938 13 17.937 13V15ZM16.9684 15.7493C17.0795 15.3177 17.4724 15 17.937 15V13C16.5377 13 15.3645 13.957 15.0316 15.2507L16.9684 15.7493ZM17.9375 22H17.9475V20H17.9375V22Z" fill="#555"></path> </g></svg>
                                    }
                                    title="No data yet"
                                    description="Import an Excel (.xlsx) file to see a preview here"
                                />
                            </>
                        )
                        }
                    </div>
                </div>
            </div>
            <Divider margin="50px" />

            {/* --- Khu vực viết query --- */}
            <div style={{ paddingLeft: "50px", paddingRight: "50px", display: "flex", flexDirection: "column", gap: "12px", width: "100%", boxSizing: "border-box" }}>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>Write SQL query</p>

                <textarea
                    value={sql}
                    onChange={(e) => setSql(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={6}
                    placeholder="SELECT * FROM imported_data;"
                    style={{
                        width: "100%",
                        maxWidth: "800px",
                        fontFamily: "monospace",
                        fontSize: "14px",
                        padding: "10px",
                        boxSizing: "border-box",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        resize: "vertical",
                    }}
                />

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#ffffff";
                        }}
                        onClick={handleRunQuery}
                        disabled={queryLoading || !db}
                        style={{
                            padding: "10px 20px",
                            textAlign: "center",
                            fontSize: "15px",
                            transition: "transform 0.15s ease",
                            cursor: queryLoading || !db ? "not-allowed" : "pointer",
                            width: "fit-content",
                            border: "solid 1px #cfcfcf",
                            backgroundColor: "white"
                        }}
                    >
                        {queryLoading ? "Running..." : "Run query (Ctrl+Enter)"}
                    </button>
                    {!db && <span style={{ color: "#999", fontSize: "14px" }}>Import data first</span>}
                </div>

                {queryResult ? (
                    <>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "10px",
                            }}
                        >
                            <span style={{ color: "#555", fontSize: "14px" }}>
                                {totalRows} rows total
                            </span>

                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <label style={{ fontSize: "14px", color: "#555" }}>Rows per page:</label>
                                <select
                                    value={pageSize}
                                    onChange={handlePageSizeChange}
                                    style={{ padding: "4px 8px", fontSize: "14px", border: "solid 1px #cfcfcf",}}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                        {/* ----- Table ----- */}
                        <div 
                            className="table"
                            style={{ 
                                overflowX: "auto", 
                                maxWidth: "calc(100vw - 50px * 2)" 
                            }}
                        >
                            <table style={{ borderCollapse: "collapse", fontSize: "14px" }}>
                                <thead>
                                    <tr>
                                        {queryResult.columns.map((col) => (
                                            <th
                                                key={col}
                                                style={{
                                                    border: "1px solid #ccc",
                                                    padding: "6px 10px",
                                                    background: "#f5f5f5",
                                                    textAlign: "left",
                                                }}
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedRows.map((row, i) => (
                                        <tr key={i}>
                                            {queryResult.columns.map((col) => (
                                                <td 
                                                    key={col} 
                                                    style={{ 
                                                        border: "1px solid #eee", 
                                                        padding: "6px 10px",
                                                        whiteSpace: "nowrap", 
                                                    }}>
                                                    {String(row[col] ?? "")}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {/* Dòng trống để trang cuối vẫn đủ chiều cao */}
                                    {Array.from({ length: Math.max(0, pageSize - paginatedRows.length) }).map((_, i) => (
                                        <tr key={`empty-${i}`} aria-hidden="true">
                                            {queryResult.columns.map((col) => (
                                                <td
                                                    key={col}
                                                    style={{
                                                        border: "1px solid #eee",
                                                        padding: "6px 10px",
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                    {"\u00A0"}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {renderPaginationBar(currentPage, totalPages, goToPage)}
                    </>
                ) : queryError ? (
                    <EmptyState
                        icon={
                            <svg fill="#555" height="50px" width="50px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 212.715 212.715" xml:space="preserve"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M211.436,187.771L112.843,17.002c-1.34-2.32-3.815-3.75-6.495-3.75c-2.68,0-5.155,1.43-6.495,3.75L1.005,188.213 c-1.34,2.32-1.34,5.18,0,7.5c1.34,2.32,3.816,3.75,6.495,3.75h197.695c0.007,0,0.015,0,0.02,0c4.143,0,7.5-3.357,7.5-7.5 C212.715,190.41,212.243,188.968,211.436,187.771z M20.49,184.463l85.857-148.711l85.857,148.711H20.49z"></path> <path d="M98.848,76.58v63.879c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5V76.58c0-4.143-3.357-7.5-7.5-7.5 S98.848,72.438,98.848,76.58z"></path> <circle cx="106.348" cy="164.007" r="9.328"></circle> </g> </g></svg>
                        }
                        title="Query failed"
                        description={queryError}
                    />
                ) : (
                    <EmptyState
                        icon={
                            <svg fill="#555" width="50px" height="50px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M10.035,18.069a7.981,7.981,0,0,0,3.938-1.035l3.332,3.332a2.164,2.164,0,0,0,3.061-3.061l-3.332-3.332A8.032,8.032,0,0,0,4.354,4.354a8.034,8.034,0,0,0,5.681,13.715ZM5.768,5.768A6.033,6.033,0,1,1,4,10.035,5.989,5.989,0,0,1,5.768,5.768Z"></path></g></svg>
                        }
                        title="No results yet"
                        description={db ? "Write a query above and click Run to see results here" : "Import data first, then run a query"}
                    />
                )
            }
            </div>

            {toast && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "20px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        maxWidth: "360px",
                        padding: "10px 14px",
                        background: "#fff",
                        border: "1px solid #cfcfcf",
                        borderLeft: `4px solid ${toast.type === "error" ? "#c62828" : toast.type === "success" ? "#2e7d32" : "#555"}`,
                        borderRadius: "6px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                        fontSize: "14px",
                        color: "#333",
                    }}
                >
                    {toast.type === "success" && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                    {toast.type === "error" && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                        </svg>
                    )}
                    <span style={{ wordBreak: "break-word" }}>{toast.message}</span>
                </div>
            )}
            {loading && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 2000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.7)",
                        backdropFilter: "blur(2px)",
                    }}
                >
                    <div
                        role="status"
                        aria-live="polite"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "14px",
                            width: "320px",
                            boxSizing: "border-box",
                            padding: "28px 24px",
                            background: "#fff",
                            border: "1px solid #cfcfcf",
                            borderRadius: "8px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                            textAlign: "center",
                        }}
                    >
                        <svg width="44" height="44" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="9" fill="none" stroke="#e5e5e5" strokeWidth="3" />
                            <circle cx="12" cy="12" r="9" fill="none" stroke="#555" strokeWidth="3" strokeLinecap="round" strokeDasharray="28 100">
                                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
                            </circle>
                        </svg>
                        <p style={{ margin: 0, fontSize: "16px", fontWeight: 500, color: "#333" }}>Importing data</p>
                        <p style={{ margin: 0, fontSize: "13px", color: "#777", wordBreak: "break-word" }}>{loadingMessage}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BioPostgreSQL;