import { useState, useRef, useMemo, useEffect } from "react"
import { PGlite as PGliteDB } from "@electric-sql/pglite";
import * as XLSX from "xlsx";
import Divider from "../../../components/ui/Divider";
import Breadcrumb from "../../../components/ui/Breadcrumb";
import ExcelIcon from "../../../components/icon/ExcelIcon";

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// ---------- Helpers ----------
const qi = (name) => `"${String(name).replace(/"/g, '""')}"`; // quote identifier
const qs = (v) => `'${String(v).replace(/'/g, "''")}'`; // quote string literal
const isNum = (v) => String(v).trim() !== "" && Number.isFinite(Number(v));
// How a list typed/pasted by the user is split into separate values
const SEPARATORS = [
    { value: "auto", label: "Auto  ( ,  ;  tab  new line )" },
    { value: "comma", label: "Comma  ( , )" },
    { value: "newline", label: "New line  (one value per line)" },
    { value: "semicolon", label: "Semicolon  ( ; )" },
    { value: "tab", label: "Tab" },
    { value: "space", label: "Space" },
    { value: "custom", label: "Custom text" },
];
const SPLIT_PATTERNS = {
    auto: /[,;\t\r\n]+/,
    comma: /,/,
    newline: /\r?\n/,
    semicolon: /;/,
    tab: /\t/,
    space: /\s+/,
};
const splitList = (v, sep = "auto", custom = "") => {
    const text = String(v);
    const parts = sep === "custom"
        ? (custom ? text.split(custom) : [text])
        : text.split(SPLIT_PATTERNS[sep] ?? SPLIT_PATTERNS.auto);
    // trim, drop empty items, remove duplicates (keep first occurrence)
    return [...new Set(parts.map((x) => x.trim()).filter(Boolean))];
};

const OPERATORS = [
    { value: "eq", label: "Equals (=)" },
    { value: "ne", label: "Not equals (<>)" },
    { value: "gt", label: "Greater than (>)" },
    { value: "gte", label: "Greater or equal (>=)" },
    { value: "lt", label: "Less than (<)" },
    { value: "lte", label: "Less or equal (<=)" },
    { value: "like", label: "LIKE" },
    { value: "notlike", label: "NOT LIKE" },
    { value: "likeany", label: "LIKE ANY of (a, b, c)" },
    { value: "likeall", label: "LIKE ALL of (a, b, c)" },
    { value: "likenone", label: "LIKE NONE of (a, b, c)" },
    { value: "in", label: "Is one of (a, b, c)" },
    { value: "notin", label: "Is not one of" },
    { value: "between", label: "Between" },
    { value: "null", label: "Is empty (NULL)" },
    { value: "notnull", label: "Is not empty" },
];

// How the typed value is wrapped with % before being used in LIKE
const MATCH_MODES = [
    { value: "contains", label: "Contains  (%value%)" },
    { value: "starts", label: "Starts with  (value%)" },
    { value: "ends", label: "Ends with  (%value)" },
    { value: "exact", label: "Exact text  (value)" },
    { value: "raw", label: "As typed  (I add % and _ myself)" },
];

const NO_VALUE_OPS = ["null", "notnull"];
const LIKE_OPS = ["like", "notlike", "likeany", "likeall", "likenone"];
const LIST_OPS = ["in", "notin", "likeany", "likeall", "likenone"];
const AGG_FUNCS = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

const newCondition = (col) => ({
    id: Math.random(), col, op: "eq", value: "", value2: "",
    asNumber: false, join: "AND",
    match: "contains", ignoreCase: true,
    sep: "auto", sepCustom: "", showMatch: true,
    matchPos: "end", // where the "matched" column goes: "end" | "start" | "after:<column name>"
});
const newAgg = (col) => ({ id: Math.random(), fn: "COUNT", col: col ?? "*" });

// Turn the typed value into a LIKE pattern according to the chosen match mode.
// Except in "raw" mode, % _ and \ typed by the user are escaped so they are matched literally.
const toPattern = (value, match) => {
    if (match === "raw") return String(value);
    const v = String(value).replace(/[\\%_]/g, "\\$&");
    if (match === "contains") return `%${v}%`;
    if (match === "starts") return `${v}%`;
    if (match === "ends") return `%${v}`;
    return v; // exact
};

// ---------- Build SQL from the UI state ----------
function buildSql(s) {
    if (!s.table) return "";

    const lit = (c, v) => (c.asNumber && isNum(v) ? String(Number(v)) : qs(v));

    const whereParts = s.conditions
        .filter((c) => c.col && (NO_VALUE_OPS.includes(c.op) || String(c.value) !== ""))
        .map((c) => {
            const col = c.asNumber ? `${qi(c.col)}::numeric` : qi(c.col);
            const kw = c.ignoreCase ? "ILIKE" : "LIKE";
            let expr;
            let extra = null; // describes an extra "matched" column, if requested
            switch (c.op) {
                case "eq": expr = `${col} = ${lit(c, c.value)}`; break;
                case "ne": expr = `${col} <> ${lit(c, c.value)}`; break;
                case "gt": expr = `${col} > ${lit(c, c.value)}`; break;
                case "gte": expr = `${col} >= ${lit(c, c.value)}`; break;
                case "lt": expr = `${col} < ${lit(c, c.value)}`; break;
                case "lte": expr = `${col} <= ${lit(c, c.value)}`; break;
                case "like": expr = `${col} ${kw} ${qs(toPattern(c.value, c.match))}`; break;
                case "notlike": expr = `${col} NOT ${kw} ${qs(toPattern(c.value, c.match))}`; break;
                case "likeany":
                case "likeall":
                case "likenone": {
                    const items = splitList(c.value, c.sep, c.sepCustom);
                    if (!items.length) return null;
                    const arr = `ARRAY[${items.map((x) => qs(toPattern(x, c.match))).join(", ")}]`;
                    if (c.showMatch && c.op !== "likenone") {
                        // original values + their LIKE patterns, paired by position
                        extra = { col: c.col, vals: `ARRAY[${items.map(qs).join(", ")}]`, pats: arr, kw, pos: c.matchPos };
                    }
                    expr =
                        c.op === "likeany" ? `${col} ${kw} ANY (${arr})`
                        : c.op === "likeall" ? `${col} ${kw} ALL (${arr})`
                        : `${col} NOT ${kw} ALL (${arr})`;
                    break;
                }
                case "in":
                case "notin": {
                    const items = splitList(c.value, c.sep, c.sepCustom);
                    if (!items.length) return null;
                    expr = `${col} ${c.op === "in" ? "IN" : "NOT IN"} (${items.map((x) => lit(c, x)).join(", ")})`;
                    break;
                }
                case "between":
                    if (String(c.value2) === "") return null;
                    expr = `${col} BETWEEN ${lit(c, c.value)} AND ${lit(c, c.value2)}`;
                    break;
                case "null": expr = `${col} IS NULL`; break;
                case "notnull": expr = `${col} IS NOT NULL`; break;
                default: return null;
            }
            return { expr, join: c.join, extra };
        })
        .filter(Boolean);

    const whereSql = whereParts.length
        ? "WHERE " + whereParts.map((p, i) => (i === 0 ? p.expr : `${p.join} ${p.expr}`)).join("\n  ")
        : "";

    // Extra columns that list which value(s) of the typed list matched each row
    const usedAliases = new Set();
    const matchCols = whereParts
        .filter((p) => p.extra)
        .map((p) => {
            const { col, vals, pats, kw, pos } = p.extra;
            let alias = `matched_${col}`;
            let n = 2;
            while (usedAliases.has(alias)) alias = `matched_${col}_${n++}`;
            usedAliases.add(alias);
            const subquery = (
                `(SELECT string_agg(k.v, ', ' ORDER BY k.n)\n` +
                `   FROM unnest(${vals}, ${pats}) WITH ORDINALITY AS k(v, p, n)\n` +
                `   WHERE ${qi(s.table)}.${qi(col)} ${kw} k.p) AS ${qi(alias)}`
            );
            return { pos: pos || "end", subquery };
        });

    let selectList;
    let groupSql = "";
    let orderCols = [];

    if (s.mode === "summary") {
        const groupCols = s.groupBy;
        const aggs = s.aggs.map((a) => {
            const arg = a.col === "*" ? "*" : a.fn === "COUNT" ? qi(a.col) : `${qi(a.col)}::numeric`;
            const alias = `${a.fn.toLowerCase()}_${a.col === "*" ? "all" : a.col}`;
            return { sql: `${a.fn}(${arg}) AS ${qi(alias)}`, alias };
        });
        const parts = [...groupCols.map(qi), ...aggs.map((a) => a.sql)];
        selectList = parts.length ? parts.join(",\n  ") : "COUNT(*) AS \"count_all\"";
        if (groupCols.length) groupSql = `GROUP BY ${groupCols.map(qi).join(", ")}`;
        orderCols = [...groupCols, ...aggs.map((a) => a.alias)];
    } else {
        if (!matchCols.length) {
            selectList = s.columns.length ? s.columns.map(qi).join(", ") : "*";
        } else {
            // Columns that will be shown, in order. "after:<col>" needs an explicit list,
            // so when no column is picked we expand * into every column of the table.
            const shown = s.columns.length ? s.columns : s.allColumns;
            const explicit = s.columns.length > 0 || matchCols.some((m) => m.pos.startsWith("after:"));

            const starts = [];
            const ends = [];
            const afters = {}; // column name -> matched columns to place right after it
            matchCols.forEach((m) => {
                const target = m.pos.startsWith("after:") ? m.pos.slice(6) : null;
                if (m.pos === "start") starts.push(m.subquery);
                else if (target && explicit && shown.includes(target)) (afters[target] = afters[target] || []).push(m.subquery);
                else ends.push(m.subquery); // "end", or the chosen column is no longer shown
            });

            // [text, isSubquery] tokens, so plain columns stay on one line and subqueries get their own
            const tokens = [
                ...starts.map((x) => [x, true]),
                ...(explicit
                    ? shown.flatMap((name) => [[qi(name), false], ...(afters[name] ?? []).map((x) => [x, true])])
                    : [["*", false]]),
                ...ends.map((x) => [x, true]),
            ];
            selectList = tokens.reduce(
                (acc, [text, isSub], i) => (i === 0 ? text : acc + (isSub || tokens[i - 1][1] ? ",\n  " : ", ") + text),
                ""
            );
        }
    }

    const orderSql = s.orderBy && (s.mode === "rows" || orderCols.includes(s.orderBy))
        ? `ORDER BY ${qi(s.orderBy)} ${s.orderDir}`
        : "";
    const limitSql = isNum(s.limit) && Number(s.limit) > 0 ? `LIMIT ${Math.floor(Number(s.limit))}` : "";

    return [
        `SELECT ${s.mode === "rows" && s.distinct ? "DISTINCT " : ""}${selectList}`,
        `FROM ${qi(s.table)}`,
        whereSql,
        groupSql,
        orderSql,
        limitSql,
    ].filter(Boolean).join("\n") + ";";
}

// ---------- Small UI pieces ----------
const box = { border: "1px solid #cfcfcf", borderRadius: "4px", padding: "6px 8px", fontSize: "14px", background: "#fff", boxSizing: "border-box" };
const btn = { ...box, cursor: "pointer", padding: "6px 12px" };
const label = { fontSize: "20px", color: "#000000", fontWeight: 600 };

const Hover = ({ children, disabled, style, ...rest }) => (
    <button
        {...rest}
        disabled={disabled}
        onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = "#f5f5f5"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
        style={{ ...btn, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...style }}
    >
        {children}
    </button>
);

const ColumnSelect = ({ value, onChange, columns, extra = [], placeholder }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} 
        style={{
            padding: "5px 10px", 
            height: "30px",
            borderRadius: "5px",
            fontFamily: "inherit", 
            color: "#555", 
            fontWeight: "600", 
            fontSize: "14px", 
            border: "solid 1px #cfcfcf", 
            boxSizing: "border-box", 
            width: "150px", 
            height: "30px", 
            textAlign: "start", 
            cursor: "pointer"
        }}
    >
        {placeholder && <option value="">{placeholder}</option>}
        {extra.map((x) => <option key={x} value={x}>{x === "*" ? "* (all rows)" : x}</option>)}
        {columns.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
);

// ---------- Component ----------
function QueryBuilder({ tables, activeTable, onInsert, onRun, disabled }) {
    const [open, setOpen] = useState(true);
    const [table, setTable] = useState(activeTable ?? "");
    const [mode, setMode] = useState("rows"); // "rows" | "summary"
    const [columns, setColumns] = useState([]);
    const [distinct, setDistinct] = useState(false);
    const [conditions, setConditions] = useState([]);
    const [groupBy, setGroupBy] = useState([]);
    const [aggs, setAggs] = useState([newAgg("*")]);
    const [orderBy, setOrderBy] = useState("");
    const [orderDir, setOrderDir] = useState("ASC");
    const [limit, setLimit] = useState();

    const tableInfo = tables.find((t) => t.name === table);
    const allColumns = useMemo(() => (tableInfo ? ["id", ...tableInfo.columns] : []), [tableInfo]);
    const [colSearch, setColSearch] = useState("");

    const visibleColumns = useMemo(
        () => allColumns.filter((n) => n.toLowerCase().includes(colSearch.trim().toLowerCase())),
        [allColumns, colSearch]
    );
    // Follow the table the user is previewing
    useEffect(() => {
        if (activeTable) setTable(activeTable);
    }, [activeTable]);

    // Reset table-specific choices when the table changes or is dropped
    useEffect(() => {
        if (table && !tables.some((t) => t.name === table)) setTable(tables[0]?.name ?? "");
        setColumns([]);
        setColSearch("");
        setConditions([]);
        setGroupBy([]);
        setAggs([newAgg("*")]);
        setOrderBy("");
    }, [table, tables.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const sql = useMemo(
        () => buildSql({ table, mode, columns, allColumns, distinct, conditions, groupBy, aggs, orderBy, orderDir, limit }),
        [table, mode, columns, allColumns, distinct, conditions, groupBy, aggs, orderBy, orderDir, limit]
    );

    const toggle = (list, setList, c) => setList(list.includes(c) ? list.filter((x) => x !== c) : [...list, c]);
    const updateCond = (id, patch) => setConditions((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const updateAgg = (id, patch) => setAggs((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));

    const orderOptions = mode === "summary"
        ? [...groupBy, ...aggs.map((a) => `${a.fn.toLowerCase()}_${a.col === "*" ? "all" : a.col}`)]
        : allColumns;

    const chip = (c, selected, onClick) => (
        <button
            key={c}
            onClick={onClick}
            style={{
                ...box,
                cursor: "pointer",
                padding: "3px 10px",
                borderRadius: "999px",
                fontSize: "13px",
                background: selected ? "#555" : "#fff",
                color: selected ? "#fff" : "#333",
                borderColor: selected ? "#555" : "#cfcfcf",
            }}
        >
            {c}
        </button>
    );

    return (
        <div style={{width: "100%", boxSizing: "border-box", fontFamily: "inherit", display: "flex", alignItems: "end", gap: "25px", flexDirection: "row", }}>
            {/* Options - Div trái*/}
            {!tables.length && 
                <span style={{display: "flex", alignItems: "center", justifyContent: "center", height: "40px", color: "#999", fontSize: "15px", width: "100%", backgroundColor: "#F4F6FA", borderRadius: "5px" }}>Import data first</span>
            }
            {tables.length > 0 && (
                <>
                    <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#F4F6FA", gap: "25px", padding: "25px 25px", border: "1px solid #E2E8F0", borderRadius: "5px", width: "65%"}}>
                                {/* 1. Table + mode */}
                        <div 
                            style={{ 
                                display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "start", flexDirection: "column",
                                border: "1px solid #E2E8F0", borderRadius: "5px", padding: "25px 25px", backgroundColor: "#ffff"
                            }}
                        >
                            <span style={label}>Table</span>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 15
                                }}
                            >
                                <select 
                                    value={table} 
                                    onChange={(e) => setTable(e.target.value)} 
                                    style={{
                                        padding: "5px 10px", 
                                        fontSize: "14px", 
                                        border: "solid 1px #cfcfcf",
                                        width: "200px",
                                        height: "30px",
                                        borderRadius: "5px",
                                        color: "#555",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    {tables.map((t) => <option key={t.name} value={t.name}>{t.name}</option>)}
                                </select>
                                {/* <div
                                    style={{ 
                                        display: "flex", 
                                        borderRadius: 5,
                                        width: 300,
                                        background: "#d2e2fc",
                                        padding: "3px 3px",
                                        boxSizing: "border-box",
                                        height: 40
                                    }}
                                >
                                    <button
                                        style={{
                                            padding: "4px 12px", 
                                            fontSize: 12, 
                                            borderRadius: 5,
                                            cursor: "pointer",
                                            background: mode === "rows" ? "#fff" : "#d2e2fc",
                                            border: mode === "rows" ? "1px solid #CBD5E1" : "1px solid #d2e2fc", 
                                            color: mode === "rows"  ? "#2563EB" : "#64748B",
                                            display: 'flex',
                                            alignItems: "center",
                                            gap: "5px",
                                            width: "100px",
                                            fontWeight: 600,
                                            fontFamily: 'inherit',
                                            justifyContent: "center",
                                            boxSizing: "border-box"                                            
                                        }} 
                                        onClick={() => setMode("rows")}                                   
                                    >
                                        Show rows
                                    </button>
                                    <button
                                        style={{
                                            padding: "4px 12px", 
                                            fontSize: 12, 
                                            borderRadius: 5,
                                            cursor: "pointer",
                                            background: mode === "summary" ? "#fff" : "#d2e2fc",
                                            border: mode === "summary" ? "1px solid #CBD5E1" : "1px solid #d2e2fc", 
                                            color: mode === "summary"  ? "#2563EB" : "#64748B",
                                            display: 'flex',
                                            alignItems: "center",
                                            gap: "5px",
                                            width: "200px",
                                            fontWeight: 600,
                                            fontFamily: 'inherit',
                                            justifyContent: "center",
                                            boxSizing: "border-box"                                            
                                        }} 
                                        onClick={() => setMode("summary")}                                   
                                    >
                                        Group & summarize
                                    </button>

                                </div> */}
                            </div>
                        </div>
                        {/* 2. Columns / group + aggregates */}
                        {mode === "rows" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "start", border: "1px solid #E2E8F0", borderRadius: "5px", padding: "25px 25px", backgroundColor: "#ffff"}}>
                                <span style={label}>Columns</span>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 15
                                    }}
                                >
                                    <details style={{ position: "relative", width: "300px" }}>
                                        <summary
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                listStyle: "none",
                                                cursor: "pointer",
                                                height: "30px",
                                                padding: "0 12px",
                                                boxSizing: "border-box",
                                                fontSize: "14px",
                                                fontFamily: "inherit",
                                                color: "#1F2733",
                                                background: "#fff",
                                                border: "1px solid #cfcfcf",
                                                borderRadius: "5px",
                                            }}
                                        >
                                            <span style={{ color: columns.length ? "#1F2733" : "#555" }}>
                                                {columns.length ? "Selected columns" : "All columns"}
                                            </span>
                                            {columns.length > 0 && (
                                                <span style={{ padding: "1px 8px", borderRadius: "999px", background: "#EEF2FF", color: "#3730A3", fontSize: "12px", fontWeight: 600 }}>
                                                    {columns.length}
                                                </span>
                                            )}
                                            <svg style={{ marginLeft: "auto" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6472" strokeWidth="2" strokeLinecap="round">
                                                <path d="M6 9l6 6 6-6" />
                                            </svg>
                                        </summary>

                                        <div
                                            style={{
                                                position: "absolute",
                                                zIndex: 10,
                                                top: "calc(100% + 8px)",
                                                left: 0,
                                                width: "300px",
                                                boxSizing: "border-box",
                                                background: "#fff",
                                                border: "1px solid #E2E8F0",
                                                borderRadius: "12px",
                                                padding: "12px",
                                                boxShadow: "0 12px 32px rgba(15,23,42,0.14)",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "10px",
                                            }}
                                        >
                                            {/* Search */}
                                            <div style={{ position: "relative" }}>
                                                <svg style={{ position: "absolute", left: 10, top: 11 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6472" strokeWidth="2" strokeLinecap="round">
                                                    <circle cx="11" cy="11" r="7" />
                                                    <path d="M20 20l-3.5-3.5" />
                                                </svg>
                                                <input
                                                    value={colSearch}
                                                    onChange={(e) => setColSearch(e.target.value)}
                                                    placeholder="Search columns…"
                                                    style={{
                                                        width: "100%",
                                                        height: "38px",
                                                        boxSizing: "border-box",
                                                        padding: "0 12px 0 34px",
                                                        fontSize: "14px",
                                                        fontFamily: "inherit",
                                                        border: "1px solid #D5DAE3",
                                                        borderRadius: "8px",
                                                        outline: "none",
                                                    }}
                                                />
                                            </div>

                                            {/* Counter + actions */}
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px" }}>
                                                <span style={{ color: "#5B6472" }}>
                                                    {columns.length} / {allColumns.length} selected
                                                </span>
                                                <div style={{ display: "flex", gap: "14px" }}>
                                                    <button
                                                        onClick={() => setColumns(allColumns)}
                                                        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "#4338CA", fontWeight: 600, fontFamily: "inherit", fontSize: "13px" }}
                                                    >
                                                        Select all
                                                    </button>
                                                    <button
                                                        onClick={() => setColumns([])}
                                                        style={{ border: "none", background: "none", padding: 0, cursor: "pointer", color: "#5B6472", fontWeight: 600, fontFamily: "inherit", fontSize: "13px" }}
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            </div>

                                            <Divider />

                                            {/* Column list */}
                                            <div style={{ maxHeight: "240px", overflowY: "auto", scrollbarWidth: "thin", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                {visibleColumns.length === 0 && (
                                                    <span style={{ padding: "12px 8px", fontSize: "13px", color: "#5B6472" }}>No matching columns</span>
                                                )}
                                                {visibleColumns.map((name) => {
                                                    const checked = columns.includes(name);
                                                    return (
                                                        <label
                                                            key={name}
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "10px",
                                                                padding: "8px 10px",
                                                                borderRadius: "8px",
                                                                fontSize: "14px",
                                                                cursor: "pointer",
                                                                color: "#1F2733",
                                                                fontWeight: checked ? 600 : 400,
                                                                background: checked ? "#EEF2FF" : "transparent",
                                                            }}
                                                            onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = "#F4F6FA"; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.background = checked ? "#EEF2FF" : "transparent"; }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggle(columns, setColumns, name)}
                                                                style={{ width: 16, height: 16, accentColor: "#4338CA", margin: 0 }}
                                                            />
                                                            {name}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </details>
                                    <label style={{ fontSize: "13px", color: "#555", display:"flex", flexDirection: "row", alignItems: "center", gap: "5px" }}>
                                        <input type="checkbox" checked={distinct} onChange={(e) => setDistinct(e.target.checked)} /> Remove duplicate rows (DISTINCT)
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <span style={label}>2a. Group by</span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                        {allColumns.map((c) => chip(c, groupBy.includes(c), () => toggle(groupBy, setGroupBy, c)))}
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                    <span style={label}>2b. Calculate</span>
                                    {aggs.map((a) => (
                                        <div key={a.id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                            <select value={a.fn} onChange={(e) => updateAgg(a.id, { fn: e.target.value })} style={box}>
                                                {AGG_FUNCS.map((f) => <option key={f}>{f}</option>)}
                                            </select>
                                            <span style={{ fontSize: "13px" }}>of</span>
                                            <ColumnSelect
                                                value={a.col}
                                                onChange={(v) => updateAgg(a.id, { col: v })}
                                                columns={allColumns}
                                                extra={a.fn === "COUNT" ? ["*"] : []}
                                            />
                                            <Hover onClick={() => setAggs(aggs.filter((x) => x.id !== a.id))}>×</Hover>
                                        </div>
                                    ))}
                                    <Hover style={{ width: "fit-content" }} onClick={() => setAggs([...aggs, newAgg("*")])}>+ Add calculation</Hover>
                                    <span style={{ fontSize: "12px", color: "#888" }}>SUM / AVG / MIN / MAX convert the column to a number (text values will cause an error).</span>
                                </div>
                            </div>
                        )}
                        {/* 3. Filters */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "start", backgroundColor: "#ffffff", border: "1px solid #E2E8F0", borderRadius: "5px", padding: "25px 25px" }}>
                            <span style={label}>Filters</span>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "start", gap: "15px", width: "100%" }}>
                                {conditions.map((c, i) => {
                                    const isLike = LIKE_OPS.includes(c.op);
                                    return (
                                        <div key={c.id} style={{ boxSizing: "border-box", display: "flex", flexDirection: "row", gap: "20px", border: "1px solid #E2E8F0", borderRadius: "5px", padding: "25px 25px", backgroundColor: "#FBFCFE", paddingBottom: "8px", width: "100%" }}>
                                            {i === 0 ? (
                                                <span style={{boxSizing: "border-box", width: "100px", height: "fit-content",fontSize: "13px", color: "#555", textAlign: "center", fontWeight: "600", padding: "5px 5px", borderRadius: "5px", backgroundColor: "#ffffff", border: "1px solid #E2E8F0" }}>WHERE</span>
                                            ) : (
                                                <select value={c.join} onChange={(e) => updateCond(c.id, { join: e.target.value })} style={{boxSizing: "border-box", width: "100px", height: "fit-content",fontSize: "13px", color: "#555", textAlign: "center", fontWeight: "600", padding: "5px 5px", borderRadius: "5px", backgroundColor: "#ffffff", border: "1px solid #E2E8F0"}}>
                                                    <option>AND</option>
                                                    <option>OR</option>
                                                </select>
                                            )}
                                            <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap", width: "100%", flexDirection: "column" }}>
                                                <div
                                                    style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap", width: "100%", boxSizing: "border-box" }}
                                                >
                                                    <ColumnSelect value={c.col} onChange={(v) => updateCond(c.id, { col: v })} columns={allColumns} />
                                                    <select 
                                                        value={c.op} 
                                                        onChange={(e) => updateCond(c.id, { op: e.target.value })} 
                                                        style={{
                                                            padding: "5px 10px", 
                                                            height: "40px",
                                                            borderRadius: "5px",
                                                            fontFamily: "inherit", 
                                                            color: "#555", 
                                                            fontWeight: "600", 
                                                            fontSize: "14px", 
                                                            border: "solid 1px #cfcfcf", 
                                                            boxSizing: "border-box", 
                                                            minWidth: "250px", 
                                                            flex: 1,
                                                            height: "30px", 
                                                            textAlign: "start", 
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                    </select>                                                    
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "start",
                                                        boxSizing: "border-box",
                                                        width: "100%",
                                                        gap: "15px"
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "row",
                                                            alignItems: "center",
                                                            boxSizing: "border-box",
                                                            width: "100%",
                                                            gap: "15px"
                                                        }}
                                                    > 
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                alignItems: "start",
                                                                boxSizing: "border-box",
                                                                minWidth: "150px",
                                                                flex: 1,
                                                                gap: "15px"
                                                            }}                                                        
                                                        >
                                                            {LIST_OPS.includes(c.op) && (
                                                                <textarea
                                                                    value={c.value}
                                                                    onChange={(e) => updateCond(c.id, { value: e.target.value })}
                                                                    placeholder={"A, B, C\nOr paste one value per line"}
                                                                    rows={3}
                                                                    style={{
                                                                        padding: "5px 5px", boxSizing: "border-box", margin: 0, width: "100%", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box"
                                                                    }}
                                                                />
                                                            )}
                                                            {!NO_VALUE_OPS.includes(c.op) && !LIST_OPS.includes(c.op) && (
                                                                <input
                                                                    value={c.value}
                                                                    onChange={(e) => updateCond(c.id, { value: e.target.value })}
                                                                    placeholder={LIST_OPS.includes(c.op) ? "A, B, C" : "value"}
                                                                    style={{ ...box, width: "100%", height: "30px", fontFamily: "inherit", color: "#555" }}
                                                                />
                                                            )}
                                                            {c.op === "between" && (
                                                                <>
                                                                    <span style={{ fontSize: "14px", textAlign: 'center', color: "#555", width: "100%", fontWeight: "500", fontFamily: "inherit" }}>And</span>
                                                                    <input value={c.value2} onChange={(e) => updateCond(c.id, { value2: e.target.value })} placeholder="value" style={{ ...box, width: "100%", height: "30px", }} />
                                                                </>
                                                            )}
                                                        </div>
                                                        {!NO_VALUE_OPS.includes(c.op) && !isLike && (
                                                            <label style={{ fontSize: "13px", color: "#555", display: "flex", flexDirection: "row", alignItems: "center", gap: 5 }} title="All imported columns are TEXT. Tick this to compare as numbers.">
                                                                <input type="checkbox" checked={c.asNumber} onChange={(e) => updateCond(c.id, { asNumber: e.target.checked })} /> as number
                                                            </label>
                                                        )}                                                                                                                  
                                                    </div>                                                   
                                            
                                                    {/* Split options for list operators */}
                                                    {LIST_OPS.includes(c.op) && (
                                                        <div style={{ display: "flex", gap: "15px", alignItems: "center", flexWrap: "wrap"}}>
                                                            <span style={{ fontSize: "14px", color: "#555", width: "50px", fontWeight: "500" }}>Split by</span>
                                                            <select value={c.sep} onChange={(e) => updateCond(c.id, { sep: e.target.value })} 
                                                                style={{
                                                                    padding: "5px 10px", 
                                                                    height: "40px",
                                                                    borderRadius: "5px",
                                                                    fontFamily: "inherit", 
                                                                    color: "#555", 
                                                                    fontWeight: "600", 
                                                                    fontSize: "14px", 
                                                                    border: "solid 1px #cfcfcf", 
                                                                    boxSizing: "border-box", 
                                                                    minWidth: "250px", 
                                                                    flex: 1,
                                                                    height: "30px", 
                                                                    textAlign: "start", 
                                                                    cursor: "pointer"                                                                    
                                                                }}
                                                            >
                                                                {SEPARATORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                            </select>
                                                            {c.sep === "custom" && (
                                                                <input
                                                                    value={c.sepCustom}
                                                                    onChange={(e) => updateCond(c.id, { sepCustom: e.target.value })}
                                                                    placeholder="e.g. | or ::"
                                                                    style={{ ...box, height: "40px", width: "90px" }}
                                                                />
                                                            )}
                                                            <span style={{ fontSize: "13px", color: "#888" }}>
                                                                {splitList(c.value, c.sep, c.sepCustom).length} unique value(s)
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Extra options only for the LIKE family */}
                                                    {isLike && (
                                                        <div style={{ display: "flex", gap: "15px", flexDirection: 'column', alignItems: "start", flexWrap: "wrap"}}>
                                                            <div style={{ display: "flex", gap: "15px", flexDirection: 'row', alignItems: "center"}}>
                                                                <span style={{ fontSize: "14px", color: "#555", width: "50px", fontWeight: "500" }}>Match</span>
                                                                <select value={c.match} onChange={(e) => updateCond(c.id, { match: e.target.value })} 
                                                                    style={{
                                                                        padding: "5px 10px", 
                                                                        height: "40px",
                                                                        borderRadius: "5px",
                                                                        fontFamily: "inherit", 
                                                                        color: "#555", 
                                                                        fontWeight: "600", 
                                                                        fontSize: "14px", 
                                                                        border: "solid 1px #cfcfcf", 
                                                                        boxSizing: "border-box", 
                                                                        minWidth: "250px", 
                                                                        flex: 1,
                                                                        height: "30px", 
                                                                        textAlign: "start", 
                                                                        cursor: "pointer"                                                                        
                                                                    }}
                                                                >
                                                                    {MATCH_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                                                </select>
                                                            </div>
                                                            <label style={{ fontSize: "13px", color: "#555", padding: 0, margin: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: "5px" }} title="Tick = ILIKE (ignore upper/lower case). Untick = LIKE (case-sensitive).">
                                                                <input type="checkbox" checked={c.ignoreCase} onChange={(e) => updateCond(c.id, { ignoreCase: e.target.checked })}/> Ignore case
                                                            </label>
                                                            {(c.op === "likeany" || c.op === "likeall") && mode === "rows" && (
                                                                <label style={{ fontSize: "13px", color: "#555", padding: 0, margin: 0, display: "flex", flexDirection: "row", alignItems: "center", gap: "5px" }} title="Adds a column listing which of your values matched each row.">
                                                                    <input type="checkbox" checked={c.showMatch} onChange={(e) => updateCond(c.id, { showMatch: e.target.checked })} /> Show matched value(s) in a column
                                                                </label>
                                                            )}
                                                            {(c.op === "likeany" || c.op === "likeall") && mode === "rows" && c.showMatch && (
                                                                <span style={{ display: "flex", alignItems: "center", gap: 10}}>
                                                                    <span style={{ fontSize: "14px", color: "#555", width: "55px", fontWeight: "500" }}>Placed</span>
                                                                    <select value={c.matchPos} onChange={(e) => updateCond(c.id, { matchPos: e.target.value })} 
                                                                        style={{
                                                                            padding: "5px 10px", 
                                                                            height: "40px",
                                                                            borderRadius: "5px",
                                                                            fontFamily: "inherit", 
                                                                            color: "#555", 
                                                                            fontWeight: "600", 
                                                                            fontSize: "14px", 
                                                                            border: "solid 1px #cfcfcf", 
                                                                            boxSizing: "border-box", 
                                                                            minWidth: "250px", 
                                                                            flex: 1,
                                                                            height: "30px", 
                                                                            textAlign: "start", 
                                                                            cursor: "pointer"                                                                               
                                                                        }}
                                                                    >
                                                                        <option value="end">At the end</option>
                                                                        <option value="start">At the start</option>
                                                                        {(columns.length ? columns : allColumns).map((name) => (
                                                                            <option key={name} value={`after:${name}`}>After "{name}"</option>
                                                                        ))}
                                                                    </select>
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Hover 
                                                style={{display: "flex", alignItems: "center", fontSize: "20px", fontWeight: "500", color: "#555", fontFamily: "consolas", width: "40px", height: "40px", justifyContent: "center"}} 
                                                onClick={() => setConditions(conditions.filter((x) => x.id !== c.id))}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 18 18" style={{ flexShrink: 0 }} height="20px" width="20px" fill="#555"><path d="M6.06,15L5,13.94L8.94,10L5,6.06L6.06,5L10,8.94L13.94,5L15,6.06L11.06,10L15,13.94L13.94,15L10,11.06L6.06,15Z"/></svg>
                                            </Hover>
                                        </div>
                                    );
                                })}
                                <Hover 
                                    style={{ 
                                        fontSize: "15px", fontWeight: "600", color: "#555", fontFamily: "inherit", width: "fit-content", height: "40px",
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 5,
                                        marginLeft: "auto",
                                        marginRight: "auto"                                        
                                    }} 
                                    onClick={() => setConditions([...conditions, newCondition(allColumns[0])])}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="1 1 18 18" height="20px" width="20px" fill="#555"><path d="M9.25,10.75H5V9.25H9.25V5h1.5V9.25H15v1.5H10.75V15H9.25V10.75Z"/></svg>
                                    Add more filter
                                </Hover>
                                {conditions.some((c, i) => i > 0 && c.join === "OR") && conditions.some((c, i) => i > 0 && c.join === "AND") && (
                                    <span style={{ fontSize: "12px", color: "#b26a00" }}>Mixing AND and OR: AND is evaluated before OR. Edit the SQL by hand to add parentheses.</span>
                                )}
                            </div>
                        </div>
                        {/* 4. Sort + limit */}
                        <div 
                            style={{ 
                                display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "start", flexDirection: "column",
                                border: "1px solid #E2E8F0", borderRadius: "5px", padding: "25px 25px", backgroundColor: "#ffff" 
                            }}
                        >
                            <span style={label}>Sort by</span>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: "10px"
                                }}
                            >
                                <ColumnSelect value={orderBy} onChange={setOrderBy} columns={orderOptions} placeholder="(none)" />
                                <select value={orderDir} onChange={(e) => setOrderDir(e.target.value)} style={box}>
                                    <option value="ASC">Ascending</option>
                                    <option value="DESC">Descending</option>
                                </select>
                                <span style={{ fontSize: "13px", fontWeight: "500", color: "#555"}}>Limit</span>
                                <input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="all" style={{ ...box}} />
                            </div>
                        </div>
                    </div> 
                    {/* Generated SQL - Div phải - Lớp chính*/}
                    <div style={{ position: "relative", display: "flex", boxSizing: "border-box", flexDirection: "column", gap: "15px", border: "1px solid #E2E8F0", width: "35%", padding: "25px 25px", borderRadius: "5px", height: "100%"}}>
                        {/* Lớp phủ đè lên lớp chính để ko tăng size lớp chính khi tràn chiều cao, mục đích để chỉ cho div bên trái có thể quyết định chiều cao div cha */}
                        <div
                            style={{
                                position: "absolute", inset: 0,
                                display: "flex", boxSizing: "border-box", flexDirection: "column", gap: "15px", padding: "25px 25px"
                            }}
                        >
                            <span style={{fontSize: "15px", fontWeight: "500", color: "#555"}}>Generated SQL</span>
                            <pre 
                                style={{ 
                                    lineHeight: "1.2", 
                                    width: "100%",
                                    margin: 0, 
                                    padding: "10px", 
                                    fontFamily: "consolas", 
                                    background: "#fafafa", 
                                    border: "1px dashed #d0d0d0", 
                                    borderRadius: "4px", 
                                    fontSize: "11px", 
                                    whiteSpace: "pre-wrap", 
                                    wordBreak: "break-word",
                                    boxSizing: "border-box",
                                    flex: 1,
                                    overflowY: "auto", scrollbarWidth: "thin"
                                }}
                            >
                                {sql}
                            </pre>
                            <Hover 
                                style={{fontSize: "15px", fontWeight: "600", color: "#555", fontFamily: "inherit", width: "100%", height: "40px"}} 
                                disabled={!sql || disabled} 
                                onClick={() => onRun(sql)}
                            >
                                Run query
                            </Hover>
                        </div>
                    </div> 
                </>
            )}                                
        </div>
    );
}
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// --- Tải bảng về máy: xlsx / csv / tsv ---
const downloadTable = (columns, rows, format, baseName = "export") => {
    // Chuẩn hóa ô: null -> "", object/mảng (JSON) -> chuỗi, bigint -> chuỗi
    const cell = (v) => {
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v;
        if (typeof v === "bigint") return String(v);
        if (typeof v === "object") return JSON.stringify(v);
        return v;
    };

    // Dùng mảng 2 chiều để giữ đúng thứ tự cột (kể cả cột trùng tên)
    const aoa = [columns, ...rows.map((r) => columns.map((c) => cell(r[c])))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const fileName = `${baseName}_${stamp}`;

    if (format === "xlsx") {
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Result");
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        return;
    }

    // csv: phân tách bằng ","  |  tsv: phân tách bằng tab
    const text = XLSX.utils.sheet_to_csv(ws, { FS: format === "tsv" ? "\t" : "," });
    // "\uFEFF" (BOM) giúp Excel đọc đúng tiếng Việt / ký tự Unicode
    const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

function PostgreSQL() {
    const breadcrumbItems = [
        { label: "FORGE Home", path: "/" },
        { label: "Tools", path: "/tools" },
        { label: "PostgreSQL", path: "/tools/postgresql" },
    ];
    const [queryMode, setQueryMode] = useState("sql")
    const [exportFormat, setExportFormat] = useState("xlsx")
    const [resultName, setResultName] = useState("query_result");
    // Tìm các tên bảng (đã import) xuất hiện sau FROM / JOIN trong câu SQL
    const guessTableNames = (text) => {
        const known = new Set(tables.map((t) => t.name));
        const found = [];
        const re = /\b(?:from|join)\s+(?:"([^"]+)"|([a-zA-Z_][\w$]*))/gi;
        let m;
        while ((m = re.exec(text)) !== null) {
            const name = m[1] ?? m[2].toLowerCase();
            if (known.has(name) && !found.includes(name)) found.push(name);
        }
        return found;
    };
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
    const handleRunQuery = async (overrideSql) => {
        const text = typeof overrideSql === "string" ? overrideSql : sql;
        if (!db) {
            setQueryError("No database. Please import XLSX file first");
            return;
        }
        if (!text.trim()) return; 

        setQueryLoading(true);
        setQueryError("");
        setQueryResult(null);
        setCurrentPage(1);  

        try {
            const result = await db.query(text);
            const columns = result.fields?.map((f) => f.name) ?? Object.keys(result.rows[0] ?? {});
            const names = guessTableNames(text);
            setResultName(names.length ? names.slice(0, 3).join("_").slice(0, 60) : (activeTable ?? "query_result"));
            setQueryResult({ columns, rows: result.rows });
        } catch (err) {
            console.error(err);
            setQueryError(err.message);
        } finally {
            setQueryLoading(false);
        }
    };
    const handleExportResult = (format) => {
        if (!queryResult) return;
        downloadTable(queryResult.columns, queryResult.rows, format, `${resultName}_query_result`);
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
                PostgreSQL
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
                A tool for managing and querying structured data with PostgreSQL
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
                    {loading ? "Loading..." : tables.length ? (
                        <span>
                            Add more files
                        </span>
                    ) : (
                        <span>
                            Import files
                        </span>
                    )}
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
                <p style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>SQL query</p>
                <div 
                    style={{ 
                        display: "flex", 
                        borderRadius: 5,
                        width: 300,
                        background: "#d2e2fc",
                        padding: "3px 3px",
                        boxSizing: "border-box"
                    }}
                >
                    {[["sql", "SQL"], ["query_builder", "Query builder"], ].map(([m, label]) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setQueryMode(m)}
                            style={{
                                padding: "4px 12px", 
                                fontSize: 14, 
                                borderRadius: 5,
                                cursor: "pointer",
                                background: queryMode === m ? "#fff" : "#d2e2fc",
                                border: queryMode === m ? "1px solid #CBD5E1" : "1px solid #d2e2fc", 
                                color: queryMode === m  ? "#2563EB" : "#64748B",
                                display: 'flex',
                                alignItems: "center",
                                gap: "5px",
                                width: "50%",
                                fontWeight: 600,
                                fontFamily: 'inherit',
                                justifyContent: "center",
                                boxSizing: "border-box"
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {queryMode === "query_builder" && (
                    <QueryBuilder
                        tables={tables}
                        activeTable={activeTable}
                        disabled={!db}
                        onInsert={setSql}
                        onRun={(s) => { setSql(s); handleRunQuery(s); }}
                    />
                )}
                {queryMode === "sql" && (
                    <>
                        <textarea
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={6}
                            placeholder="SELECT * FROM imported_data;"
                            style={{
                                width: "100%",
                                minWidth: "800px",
                                fontFamily: "consolas",
                                fontSize: "14px",
                                padding: "15px 15px",
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
                                onClick={() => handleRunQuery()}
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
                    </>
                )}       
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    gap: "20px",
                }}
            >
                <span style={{ width: "50px", height: "1px", background: "#D9DDE3", }} />
                <span
                    style={{
                        fontSize: "20px",
                        fontWeight: "500",
                        color: "#000000",
                        whiteSpace: "nowrap",
                    }}
                >
                    Result
                </span>
                <span style={{flex: 1, height: "1px", background: "#D9DDE3",}}/>
            </div>                         
                {queryResult ? (
                    <>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "end",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "10px",
                            }}                        
                        >
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "start", gap: "15px" }}>
                                <span style={{ fontSize: "16px", color: "#555", fontWeight: "600" }}>Export quey result</span>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "15px",
                                    }}   
                                >
                                    <span style={{ fontSize: "13px", color: "#555", fontWeight: "500" }}>
                                        Format
                                    </span>

                                    <select
                                        value={exportFormat}
                                        onChange={(e) => setExportFormat(e.target.value)}
                                        style={{ padding: "4px 8px", fontFamily: "inherit", color: "#555", fontWeight: "600", fontSize: "13px", border: "solid 1px #cfcfcf", boxSizing: "border-box", width: "80px", height: "30px", textAlign: "center", cursor: "pointer"}}                                    
                                    >
                                        <option value={"xlsx"}>XLSX</option>
                                        <option value={"tsv"}>TSV</option>
                                        <option value={"csv"}>CSV</option>
                                    </select>
                                    <button
                                        onClick={() => handleExportResult(exportFormat)}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f5f5f5"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}       
                                        style={{
                                            padding: "4px 12px",
                                            cursor: "pointer",
                                            border: "solid 1px #cfcfcf",
                                            backgroundColor: "#fff",
                                            width: "90px",
                                            height: "40px",
                                            boxSizing: "border-box",
                                            borderRadius: "10px",
                                            display: 'flex',
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "5px"
                                        }}                                 
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} viewBox="1 1 18 18" height="20px" width="20px" fill="#555"><path d="M10,13L6,9L7.06,7.94l2.19,2.19V3h1.5v7.13l2.19-2.19L14,9l-4,4ZM5.49,16q-0.62,0-1.06-0.44T4,14.5V13H5.5v1.5h9V13H16v1.5q0,0.62-0.44,1.06T14.5,16H5.49Z"/></svg>
                                        <span
                                            style={{
                                                fontWeight: "600",
                                                color: "#555",
                                                fontSize: "13px",
                                            }}
                                        >
                                            Export
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
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

export default PostgreSQL;