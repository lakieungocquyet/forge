import { useState, useEffect } from "react";
function FlipCell({ 
    tick,
    front, 
    back, 
    interval = 5000, 
    delay = 0,
    rotate = true,
    // frontColor = "#ffffff",
    frontColor = "transparent",
    backColor = "#FF7F50", 
}) {
  	const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        if (!rotate) return;

        const time = tick * 100; // tick = 100ms
        if (time < delay) return;

        const elapsed = time - delay;

        if (elapsed % interval === 0) {
            setFlipped(f => !f);
        }

    }, [tick]);

  return (
    <div className="cell" style={{ animationDelay: `${delay}ms` }}>
      <div className={`cell_inner ${flipped ? "show-back" : ""}`}>
        <div 
			className="front" 
			style={{ backgroundColor: frontColor}}
		>
			{front}
		</div>
        <div 
			className="back"
			style={{ backgroundColor: backColor}}
		>
			{back}
		</div>
      </div>
    </div>
  );
}
export default FlipCell;
