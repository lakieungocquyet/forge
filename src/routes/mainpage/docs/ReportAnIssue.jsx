function ReportAnIssue () {
    return (
        <div>
            <div
                style={{
                    fontSize: "15px",
                }}
            >
                Support
            </div>
            <div
                style={{
                    fontSize: "40px",
                    padding: "15px 0px",
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
                }}
            >
                The easiest way is to open an issue on GitHub:
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
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