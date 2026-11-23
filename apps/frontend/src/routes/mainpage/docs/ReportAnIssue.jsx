function ReportAnIssue () {
    return (
        <div>
            <div
                style={{
                    fontSize: "13px",
                }}
            >
                Docs / Support / Report an issue
            </div>
            <div
                style={{
                    fontSize: "36px",
                    padding: "10px 0px",
                    fontWeight: "600"
                }}
            >
                Report an issue
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                Found a bug or something that doesn't work as expected? Thank you for letting me know. Every report helps make FORGE better.
            </div>
            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                How to report
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "5px"
                }}
            >
                <span>
                    The easiest way is to open an issue on GitHub:
                </span>
                <div
                    style={{
                        fontSize: "15px",
                        padding: "5px 0px",
                        lineHeight: "1.5",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "5px"
                    }}
                >
                    <a
                        class="button"
                        href="https://github.com/lakieungocquyet/forge/issues"
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = "none";
                        }}
                        style={{
                            color: "#ff5b20",
                            textDecoration: "none",
                            fontWeight: "600"
                        }}
                    >Open an issue on GitHub</a>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="16px" width="16px" fill="#ff5b20"><path d="M5,21q-0.83,0-1.41-0.59T3,19V5Q3,4.17 3.59,3.59T5,3h7V5H5V19H19V12h2v7q0,0.82-0.59,1.41T19,21H5Zm4.7-5.3L8.3,14.3L17.6,5H14V3h7v7H19V6.4L9.7,15.7Z"/></svg>
                </div>
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                Don't have a GitHub account? Send me an email at{" "}
                <a
                    href="mailto:quyetlakn@gmail.com"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                    }}
                    style={{
                        color: "#ff5b20",
                        textDecoration: "none",
                        fontWeight: "600"
                    }}
                >
                    quyetlakn@gmail.com
                </a> instead.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                What to include
            </div>
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                The more details you share, the faster I can fix it:
            </div>
            <ul
                style={{
                    fontSize: "15px",
                    lineHeight: "1.5",
                }}
            >
                <li>What you were trying to do</li>
                <li>What you expected to happen, and what actually happened</li>
                <li>Steps to reproduce the problem</li>
                <li>Your browser and operating system (for example, Chrome on Windows 11)</li>
                <li>Screenshots or a sample file, if possible (please remove any sensitive data)</li>
            </ul>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Have an idea instead?
            </div>
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                Feature suggestions are just as welcome. Open an issue and describe what you would like to see in FORGE.
            </div>

        </div>
    )
}
export default ReportAnIssue;
