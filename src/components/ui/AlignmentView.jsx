import { useMemo, useState } from "react";

const tabBtn = (on) => ({
    padding: "4px 12px", fontSize: 13, borderRadius: 5, cursor: "pointer",
    border: "1px solid #CBD5E1", background: on ? "#d2e2fc" : "#fff", color: "#000",
});

export default function AlignmentView({ items }) {
	const list = useMemo(
		() => (
			items || []).filter((it) => it.text
		), [items]
	);
	const [tab, setTab] = useState(0);
	if (!list.length) return null;

  	return (
		<div style={{
			width: "100%", boxSizing: "border-box", border: "1px solid #E2E8F0", borderRadius: 12,
			padding: 16, background: "#fff", display: "flex", flexDirection: "column", gap: 12,
		}}>
			<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
				{list.map((it, k) => (
					<button key={k} type="button" onClick={() => setTab(k)} style={tabBtn(tab === k)}>
						{it.label}
					</button>
				))}
			</div>
			<pre style={{
				margin: 0, 
				padding: 12, 
				background: "#F1F5F9", 
				borderRadius: 8, 
				overflowX: "auto",
				fontFamily: "Consolas, monospace", 
				fontSize: 13, 
				lineHeight: "20px", 
				color: "#334155",
			}}>
				{list[tab].text.trim()} {/* xóa khoảng trắng ở cuối và đầu (eg. "  Hello  " -> "Hello") */}
			</pre>
    	</div>
  	);
}