import { Link } from "wouter";

import { HeaderLogo } from "@/components/header-logo";
export default function TermsOfService() {
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
        <h1 className="font-sora text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-sm opacity-70 mb-2">Last Updated: August 12, 2026</p>
        <p className="text-sm opacity-70 mb-8">
          These Terms of Service govern your use of the <strong>KingVypers Website</strong> (kingvypers.site) and the <strong>KingVypers Discord Bot</strong>.
        </p>

        {/* Section 1 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using KingVypers services — including our website, Discord bot, and any associated
            digital products — you accept and agree to be bound by these Terms of Service. If you do not agree,
            you must immediately stop using all KingVypers services.
          </p>
        </section>

        {/* Section 2 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">2. Description of Services</h2>
          <p>KingVypers provides the following services:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Website (kingvypers.site)</strong> — A platform for purchasing, managing, and validating premium script license keys for Roblox.</li>
            <li><strong>KingVypers Discord Bot</strong> — A bot integrated within our Discord server that provides key redemption, role management, script delivery, order processing, boost rewards, ticket support, and community features.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">3. Use of Service</h2>
          <p>
            Our services must be used responsibly. You agree to the following:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>You will not distribute, resell, or exploit our products for unauthorized commercial gain.</li>
            <li>You will not attempt to reverse-engineer, decompile, or tamper with any scripts, keys, or systems.</li>
            <li>You will not share your license key with other users. Each key is bound to a single user account.</li>
            <li>You will not use our services to engage in harassment, spam, or any activity that violates applicable law.</li>
            <li>Any malicious use of our service that violates third-party terms (including Roblox Terms of Use) is at your own risk.</li>
          </ul>
        </section>

        {/* Section 4 - Discord Bot */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">4. Discord Bot Terms</h2>
          <p>
            The KingVypers Discord Bot operates within our official Discord server and interacts with users
            through slash commands, buttons, modals, and automated events. By interacting with the bot, you agree to:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Abide by <a href="https://discord.com/terms" target="_blank" rel="noopener noreferrer">Discord's Terms of Service</a> and <a href="https://discord.com/guidelines" target="_blank" rel="noopener noreferrer">Community Guidelines</a> at all times.</li>
            <li>Provide accurate information when interacting with bot commands (e.g., key redemption, order creation).</li>
            <li>Not attempt to exploit, spam, or abuse bot commands or rate limits.</li>
            <li>Accept that the bot may assign or remove Discord roles based on your key status or server activity.</li>
          </ul>

          <h3 className="text-xl font-bold mt-6 mb-3">4.1 Discord Privileged Gateway Intents</h3>
          <p>Our bot uses the following Discord Privileged Gateway Intents to function properly:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>
              <strong>Presence Intent</strong> — Used to display accurate member presence and online status for
              community moderation and engagement features.
            </li>
            <li>
              <strong>Server Members Intent (Guild Members)</strong> — Required for detecting server boosts
              (assigning premium key rewards to boosters) and detecting member departures (revoking boost
              reward keys when a user leaves the server). This intent is essential for our automated boost
              reward system and role management.
            </li>
            <li>
              <strong>Message Content Intent</strong> — Used to process contextual messages within support
              tickets and order threads to provide relevant assistance and moderation. Message content is
              only read in specific, designated channels and is never stored permanently or shared externally.
            </li>
          </ul>
          <p className="mt-3">
            All data accessed through these intents is handled in strict accordance with our{" "}
            <Link href="/privacy-policy" className="text-kv-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            and Discord's Developer Terms of Service.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-3">4.2 Bot Features</h3>
          <p>The KingVypers Bot provides the following features:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Key Redemption</strong> — Verify and link premium keys to your Discord account.</li>
            <li><strong>Script Delivery</strong> — Securely deliver loader scripts to verified premium users.</li>
            <li><strong>Role Management</strong> — Automatically assign/remove premium roles based on key validity.</li>
            <li><strong>Boost Rewards</strong> — Generate premium keys as rewards for users who boost the server.</li>
            <li><strong>Order System</strong> — Create and manage premium key orders via private threads.</li>
            <li><strong>Support Tickets</strong> — Create private support threads for customer assistance.</li>
            <li><strong>HWID Reset</strong> — Allow key holders to reset their hardware ID through the bot.</li>
            <li><strong>Key Finder</strong> — Retrieve all keys associated with your Discord account.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">5. Purchases and Refunds</h2>
          <p>
            Due to the digital nature of our products, all sales are final. Refunds are only issued under
            specific conditions as outlined below or at the discretion of the management:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>A key that was never activated and reported within 24 hours of purchase.</li>
            <li>A verifiable technical defect that we are unable to resolve.</li>
            <li>Duplicate purchases made in error (with proof of transaction).</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">6. Key Policies</h2>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Each premium key is bound to a <strong>single Discord account</strong> and a <strong>single hardware ID (HWID)</strong>.</li>
            <li>HWID resets are limited. Excessive resets may result in key blacklisting.</li>
            <li>Keys obtained through boost rewards are subject to automatic revocation if the user stops boosting or leaves the server.</li>
            <li>Sharing, selling, or transferring keys to other users is strictly prohibited and will result in immediate blacklisting.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">7. Termination</h2>
          <p>
            We reserve the right to terminate or suspend access to our services at any time, without notice,
            for conduct that we believe violates these Terms of Service, is harmful to other users, or is
            otherwise objectionable. This includes, but is not limited to:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>Sharing or reselling keys.</li>
            <li>Exploiting or abusing bot commands.</li>
            <li>Violating Discord's Terms of Service within our server.</li>
            <li>Any form of fraud or chargebacks.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">8. Limitation of Liability</h2>
          <p>
            KingVypers services are provided "as is" without warranties of any kind. We are not liable for
            any damages arising from the use or inability to use our services. Use of our scripts with
            third-party platforms (such as Roblox) is entirely at your own risk.
          </p>
        </section>

        {/* Section 9 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be posted on this page
            with an updated "Last Updated" date. Your continued use of our services after changes are posted
            constitutes your acceptance of the revised Terms.
          </p>
        </section>

        {/* Section 10 */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mt-8 mb-4">10. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us through our{" "}
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
