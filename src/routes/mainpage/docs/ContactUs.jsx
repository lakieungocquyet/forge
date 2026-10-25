function ContactUs () {
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
                Contact us
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                I'd love to hear from you! Whether you have a question, a suggestion, or just
                want to say hi, here are the best ways to reach me.
            </div>
            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Email
            </div>
            
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                For general questions or feedback:{" "}
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
                </a>
            </div> 

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                GitHub
            </div>
            
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                For bugs, feature requests, and discussions about the project, please use{" "}
                <a 
                    href="https://github.com/lakieungocquyet/forge" 
                    target="_blank" rel="noopener noreferrer"
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
                    GitHub
                </a>.
                It helps keep everything in one place so others can benefit too.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Response time
            </div>
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}             
            >
            FORGE is a personal project, so replies may take a few days. Thank you for your patience!
            </div>
        </div>
    )
}
export default ContactUs;