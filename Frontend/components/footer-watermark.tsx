"use client"

import { useState } from "react"

interface TeamMember {
    name: string
}

const teamMembers: TeamMember[] = [
    { name: "Sivansakthi" },
    { name: "Ramkumar" },
    { name: "Siva Ganesh" },
    { name: "Rasim Hussain" },
]

export function FooterWatermark() {
    const [isRevealed, setIsRevealed] = useState(false)

    const handleToggle = () => {
        setIsRevealed(!isRevealed)
    }

    return (
        <footer className="footer-watermark">
            <div className="footer-watermark__content">
                <p className="footer-watermark__text">
                    © 2026 Campus Voice |{" "}
                    <span className="footer-watermark__developed">Developed by </span>
                    <button
                        className="footer-watermark__trigger"
                        onClick={handleToggle}
                        onMouseEnter={() => setIsRevealed(true)}
                        aria-expanded={isRevealed}
                        aria-label="Show team members"
                    >
                        Team R.S
                    </button>
                </p>

                {/* Team Members Reveal Card */}
                <div
                    className={`footer-watermark__team-card ${isRevealed ? "footer-watermark__team-card--visible" : ""
                        }`}
                    onMouseLeave={() => setIsRevealed(false)}
                >
                    <div className="footer-watermark__team-header">
                        <span className="footer-watermark__team-title">Team Members</span>
                        <div className="footer-watermark__team-divider" />
                    </div>
                    <ul className="footer-watermark__team-list">
                        {teamMembers.map((member, index) => (
                            <li
                                key={member.name}
                                className="footer-watermark__team-member"
                                style={{
                                    animationDelay: isRevealed ? `${index * 0.08}s` : "0s",
                                }}
                            >
                                <span className="footer-watermark__member-dot" />
                                {member.name}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </footer>
    )
}

export default FooterWatermark
