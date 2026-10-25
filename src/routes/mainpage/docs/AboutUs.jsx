function AboutUs () {
    return (
        <div>
            <div
                style={{
                    fontSize: "15px",
                }}
            >
                Introduction
            </div>
            <div
                style={{
                    fontSize: "40px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                About us
            </div>
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}             
            >
                Hi there! 👋 I'm Quyết, the maintainer of FORGE.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                How it started
            </div>
            
            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                I started FORGE in June 2026. While learning bioinformatics, I noticed that
                even a simple analysis often meant installing several programs, setting up
                environments, and figuring out command-line tools before I could look at a
                single result. For beginners, that first barrier can be discouraging. I kept
                thinking: it shouldn't have to be this hard to explore genomic data.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Where it is today
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                I want to be honest with you: FORGE is still quite small. It's a personal
                project, built and maintained by one person in his spare time, so there's a
                lot it can't do yet, and you may run into rough edges along the way.
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                But I'm working on it, and I'm improving it little by little, every day.
                New ideas, fixes, and small upgrades keep coming, and every step makes it a
                bit better than yesterday.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                What I'm aiming for
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                My long-term vision is to grow FORGE into a reliable, easy-to-use platform
                for genomic exploration. That means more tools, support for more file
                formats, a smoother experience, and clearer documentation. I'd also love for
                it to become a project that others can learn from and contribute to.
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}            
            >
                FORGE will always be free and open source, released under the GPL-3.0
                license, because I believe good scientific tools should be open to everyone.
            </div>

            <div
                style={{
                    fontSize: "20px",
                    padding: "15px 0px",
                    fontWeight: "600"
                }}
            >
                Be part of it
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                I'd really love to hear from you. If you have an idea, found a bug, or just
                want to say hi, feel free to reach out or open an issue. Every piece of
                feedback, big or small, helps shape where FORGE goes next.
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                You can follow the project and its progress on{" "} 
                <a 
                    href="https://github.com/lakieungocquyet/forge" 
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
                >
                    GitHub
                </a>. 
                If FORGE is useful to you, a ⭐ on the repository would mean a lot!
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "5px 0px",
                    lineHeight: "1.5",
                }}
            >
                Thanks for being here, and I hope FORGE helps you in some way.
            </div>

            <div
                style={{
                    fontSize: "15px",
                    padding: "20px 0px",
                    lineHeight: "1.5",
                    color: "#666",
                }}
            > 
                La Kieu Ngoc Quyet <br/>
                The maintainer of FORGE
            </div>
        </div>
    )
}
export default AboutUs;