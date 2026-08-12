import { Link } from "wouter";

import { HeaderLogo } from "@/components/header-logo";
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-kv-background text-kv-on-surface font-sans antialiased relative selection:bg-kv-primary-container selection:text-kv-on-primary-container">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-kv-primary/10 rounded-full blur-[100px] opacity-40 transform translate-x-1/3 -translate-y-1/3"></div>
      </div>

      <nav className="w-full top-0 sticky z-50 bg-kv-surface/60 backdrop-blur-xl border-b border-kv-outline-variant/10 transition-all duration-300">
        <div className="flex items-center h-20 px-6 max-w-container-max mx-auto">
          <Link href="/" className="flex items-center gap-2 group">
            <HeaderLogo size="sm" className="rounded-lg" />
            <span className="font-sora text-kv-primary text-xl font-black uppercase tracking-tighter group-hover:opacity-80 transition-opacity">
              KING VYPERS
            </span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16 prose prose-invert prose-p:text-kv-on-surface-variant prose-headings:text-kv-on-surface prose-a:text-kv-primary prose-li:text-kv-on-surface-variant prose-strong:text-kv-on-surface">
        <h1 className="font-sora text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm opacity-70 mb-2">Last Updated: August 12, 2026</p>
        <p className="text-sm opacity-70 mb-8">
          This Privacy Policy describes how <strong>KingVypers</strong> ("we", "us", "our") collects, uses,
          stores, and protects your information when you use our website (kingvypers.site) and our Discord bot
          ("KingVypers Bot").
        </p>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
          <p>We collect the following categories of information:</p>

          <h3 className="text-xl font-bold mt-6 mb-3">1.1 Website Data</h3>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Account Information</strong> — Email address, username, and hashed password when you register on our website.</li>
            <li><strong>Order Information</strong> — Transaction details, payment proofs, and package selections when you make a purchase.</li>
            <li><strong>Profile Data</strong> — Optional avatar uploads and display preferences.</li>
            <li><strong>Technical Data</strong> — IP address, browser type, and device information for security and rate limiting.</li>
          </ul>

          <h3 className="text-xl font-bold mt-6 mb-3">1.2 Discord Bot Data</h3>
          <p>When you interact with the KingVypers Discord Bot, we collect and process:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Discord User ID</strong> — Your unique Discord identifier, used to link premium keys to your account and manage role assignments.</li>
            <li><strong>Discord Username / Tag</strong> — Displayed in logs and support interactions for identification purposes only.</li>
            <li><strong>Server Membership Status</strong> — Whether you are a member of our Discord server, used for access control and boost detection.</li>
            <li><strong>Boost Status</strong> — Whether you are actively boosting our server, used exclusively for the boost reward system.</li>
            <li><strong>Command Interactions</strong> — Slash command usage, button clicks, and modal submissions processed in real-time to deliver bot functionality.</li>
          </ul>

          <h3 className="text-xl font-bold mt-6 mb-3">1.3 Key and License Data</h3>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>License Key Codes</strong> — Generated and stored for verification and activation tracking.</li>
            <li><strong>Hardware ID (HWID)</strong> — Collected during script execution to enforce single-device licensing.</li>
            <li><strong>Roblox Username</strong> — Collected during key validation to bind keys to a specific Roblox account.</li>
            <li><strong>Execution Count</strong> — Number of times a script has been executed with a given key.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">2. Discord Privileged Gateway Intents</h2>
          <p>
            Our Discord bot requests the following Privileged Gateway Intents from Discord. Below is a
            transparent explanation of <strong>what each intent does</strong>, <strong>why we need it</strong>,
            and <strong>how the data is handled</strong>:
          </p>

          <div className="bg-kv-surface-container border border-kv-outline-variant/20 rounded-xl p-6 mt-4 mb-4">
            <h3 className="text-lg font-bold mb-2 text-kv-primary">🟢 Presence Intent</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Purpose:</strong> To receive Presence Update events, allowing us to display accurate
                member online/offline status for community engagement and moderation.</li>
              <li><strong>Data accessed:</strong> Online status, activity information (game being played, custom status).</li>
              <li><strong>Storage:</strong> Presence data is <strong>NOT stored</strong>. It is only processed in real-time and never logged or persisted.</li>
              <li><strong>Sharing:</strong> Presence data is never shared with third parties.</li>
            </ul>
          </div>

          <div className="bg-kv-surface-container border border-kv-outline-variant/20 rounded-xl p-6 mt-4 mb-4">
            <h3 className="text-lg font-bold mb-2 text-kv-primary">🟢 Server Members Intent (Guild Members)</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Purpose:</strong> To receive GUILD_MEMBER events, which are <strong>essential</strong> for:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Detecting when a user <strong>boosts</strong> the server → automatically generates a premium key reward.</li>
                  <li>Detecting when a user <strong>leaves</strong> the server → automatically revokes boost reward keys to prevent abuse.</li>
                  <li>Managing <strong>premium role</strong> assignments based on key validity.</li>
                </ul>
              </li>
              <li><strong>Data accessed:</strong> Member join/leave events, boost status changes (premiumSince), role list.</li>
              <li><strong>Storage:</strong> Only the Discord User ID is stored in our database (linked to their premium key). No other member data is persisted.</li>
              <li><strong>Sharing:</strong> Member data is never shared with third parties.</li>
            </ul>
          </div>

          <div className="bg-kv-surface-container border border-kv-outline-variant/20 rounded-xl p-6 mt-4 mb-4">
            <h3 className="text-lg font-bold mb-2 text-kv-primary">🟢 Message Content Intent</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Purpose:</strong> To read message content in specific, designated channels:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Support ticket threads</strong> — To provide contextual assistance and moderation.</li>
                  <li><strong>Order threads</strong> — To process payment confirmations and order-related messages.</li>
                </ul>
              </li>
              <li><strong>Data accessed:</strong> Message text content in designated channels/threads only.</li>
              <li><strong>Storage:</strong> Message content is <strong>NOT stored</strong> in our database. It is processed in real-time only.</li>
              <li><strong>Scope:</strong> The bot does NOT read messages in general chat channels. Access is limited to private threads created by the bot itself (support tickets and order threads).</li>
              <li><strong>Sharing:</strong> Message content is never shared with third parties.</li>
            </ul>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">3. How We Use Your Information</h2>
          <p>We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Service Delivery</strong> — To provide, operate, and maintain our website, Discord bot, and script licensing system.</li>
            <li><strong>Key Management</strong> — To validate, activate, and track license keys; enforce single-device usage; and manage expiration.</li>
            <li><strong>Discord Integration</strong> — To link your Discord identity with your premium keys, manage roles, process orders through bot threads, and deliver boost rewards.</li>
            <li><strong>Security</strong> — To prevent abuse, detect fraud, enforce rate limits, and protect against unauthorized access.</li>
            <li><strong>Support</strong> — To assist you through support tickets and resolve issues related to your account or keys.</li>
            <li><strong>Communication</strong> — To send order confirmations, key information, and service updates via DM or email.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Storage and Security</h2>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>All data is stored in a <strong>PostgreSQL database</strong> hosted on secure, managed infrastructure.</li>
            <li>Passwords are hashed using <strong>bcrypt</strong> and are never stored in plain text.</li>
            <li>Communication between our Discord bot and website API is authenticated using a secret token (<code>BOT_SECRET</code>).</li>
            <li>We implement rate limiting, input validation, and other security best practices to protect your data.</li>
            <li>Real-time data (presence, message content) is processed in memory and <strong>never persisted</strong> to disk.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Data Sharing</h2>
          <p>
            We do <strong>NOT</strong> sell, rent, or share your personal data with third parties, except in
            the following limited circumstances:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Payment Processors</strong> — Order and payment data may be shared with our payment gateway (e.g., QRIS provider) solely to process transactions.</li>
            <li><strong>Legal Requirements</strong> — If required by law, regulation, or legal process.</li>
            <li><strong>Service Infrastructure</strong> — Data is stored on cloud hosting providers (e.g., Railway, Cloudflare R2) under strict data processing agreements.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Data Retention</h2>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Account data</strong> is retained for as long as your account is active.</li>
            <li><strong>Key data</strong> is retained for the lifetime of the key plus 90 days after expiration for dispute resolution.</li>
            <li><strong>Discord User ID linkages</strong> are retained while the key is active and removed upon key expiration or user request.</li>
            <li><strong>Presence and message content</strong> data is processed in real-time and is never stored.</li>
            <li>You may request deletion of your data at any time (see Section 7).</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">7. Your Rights</h2>
          <p>You have the following rights regarding your personal data:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Right to Access</strong> — Request a copy of the personal data we hold about you.</li>
            <li><strong>Right to Rectification</strong> — Request correction of inaccurate data.</li>
            <li><strong>Right to Deletion</strong> — Request deletion of your personal data from our systems.</li>
            <li><strong>Right to Restriction</strong> — Request that we restrict processing of your data.</li>
            <li><strong>Right to Object</strong> — Object to data processing for specific purposes.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact us through our{" "}
            <a href="https://discord.gg/kingvypers" target="_blank" rel="noopener noreferrer">
              official Discord server
            </a>{" "}
            or open a support ticket using the bot.
          </p>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">8. Children's Privacy</h2>
          <p>
            Our services are not intended for children under the age of 13. We do not knowingly collect
            personal information from children under 13. If you believe a child under 13 has provided us
            with personal data, please contact us so we can delete it.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">9. Third-Party Services</h2>
          <p>Our services integrate with the following third-party platforms:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Discord</strong> — For bot functionality, authentication, and community engagement. Subject to <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer">Discord's Privacy Policy</a>.</li>
            <li><strong>Cloudflare</strong> — For CDN, security, and media storage (avatar uploads).</li>
            <li><strong>Payment Gateways</strong> — For processing QRIS payments. Subject to their respective privacy policies.</li>
          </ul>
        </section>

        {/* Section 10 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page with an
            updated "Last Updated" date. Your continued use of our services after changes are posted
            constitutes your acceptance of the revised policy.
          </p>
        </section>

        {/* Section 11 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or wish to exercise your data rights,
            please reach out to us through our{" "}
            <a href="https://discord.gg/kingvypers" target="_blank" rel="noopener noreferrer">
              official Discord server
            </a>.
          </p>
        </section>
      </main>

      <footer className="border-t border-kv-outline-variant/10 py-8 mt-16 text-center text-sm text-kv-on-surface-variant">
        &copy; {new Date().getFullYear()} King Vypers. All rights reserved.
        <div className="mt-2 space-x-4">
          <Link href="/privacy-policy" className="hover:text-kv-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-kv-primary transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
