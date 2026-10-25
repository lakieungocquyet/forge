function FAQ () {
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
                FAQ
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                What is FORGE?
            </div>
            
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                FORGE (Focused Repository for Genomic Exploration) is a free, open-source project that aims to make genomic analysis easier, right in your browser.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Is FORGE free to use?
            </div>
            
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                Yes. FORGE is completely free and open source, released under the GPL-3.0 license.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Do I need to install anything?
            </div>
            
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                No. FORGE runs in your web browser, so there's nothing to download or set up.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Is my data uploaded to a server?
            </div>
            
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                No. FORGE is built on WebAssembly (WASM), which allows the analysis code to
                run directly inside your browser. When you open a file, it is read and
                processed locally on your own device. Nothing is uploaded, stored, or sent
                to any server. Once the page has loaded, most tools keep working even
                without an internet connection.
            </div>
        </div>
    )
}
export default FAQ;