import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-zinc-400 mb-8">Last updated: October 30, 2025</p>

        <div className="space-y-8 text-zinc-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Introduction
            </h2>
            <p>
              Band Merch POS ("we", "our", or "us") is a point of sale
              application designed for musicians and bands to track merchandise
              sales during tours. This Privacy Policy explains how we collect,
              use, and protect your information when you use our application.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. Information We Collect
            </h2>
            <h3 className="text-xl font-semibold text-white mb-2">
              2.1 Authentication Information
            </h3>
            <p className="mb-4">
              When you sign in with Google OAuth, we collect:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your email address</li>
              <li>Your name</li>
              <li>Your Google profile picture</li>
              <li>OAuth access and refresh tokens</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-2 mt-4">
              2.2 Sales and Product Data
            </h3>
            <p className="mb-4">
              We store the following data related to your merchandise sales:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Product names, sizes, and prices</li>
              <li>Sales transactions (date, time, amount, payment method)</li>
              <li>Inventory quantities</li>
              <li>Custom payment method settings</li>
              <li>Application preferences (theme, settings)</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-2 mt-4">
              2.3 Technical Information
            </h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Browser type and version</li>
              <li>Device type (for optimizing the interface)</li>
              <li>Session information for maintaining your login state</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. How We Use Your Information
            </h2>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Authenticate your account:</strong> Verify your identity
                and provide secure access to the application
              </li>
              <li>
                <strong>Sync sales data:</strong> Store your sales transactions
                in your own Google Sheets spreadsheet
              </li>
              <li>
                <strong>Enable offline functionality:</strong> Store data
                locally on your device for offline access
              </li>
              <li>
                <strong>Provide analytics:</strong> Display sales insights and
                revenue tracking
              </li>
              <li>
                <strong>Manage inventory:</strong> Track product availability
                and sales
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Data Storage
            </h2>
            <h3 className="text-xl font-semibold text-white mb-2">
              4.1 Local Storage (Your Device)
            </h3>
            <p className="mb-4">
              We use IndexedDB (a browser database) to store sales data locally
              on your device. This enables offline functionality. You can clear
              this data at any time by clearing your browser data or
              reinstalling the app.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              4.2 Google Sheets
            </h3>
            <p className="mb-4">
              Your sales data is synced to{" "}
              <strong>your own Google Sheets spreadsheet</strong> in your Google
              Drive. We do not store your sales data on our servers. The data
              remains in your Google account, under your control.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              4.3 Session Storage
            </h3>
            <p>
              Authentication tokens are stored securely in your browser session
              and are encrypted using Supabase Auth security standards.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Google API Services - Scopes & Usage
            </h2>
            <p className="mb-4">
              Our application uses Google APIs with the following scopes:
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              5.1 Google Sheets API (spreadsheets scope)
            </h3>
            <p className="mb-2">
              <strong>Why we need it:</strong> To read and write sales
              transaction data to your Google Sheets spreadsheet.
            </p>
            <p className="mb-4">
              <strong>What we do with it:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>Create a sales tracking spreadsheet in your Google Drive</li>
              <li>Write sales transactions as they occur</li>
              <li>Read product inventory from your spreadsheet</li>
              <li>Update sales analytics and summaries</li>
            </ul>
            <p className="mb-4">
              <strong>What we DON'T do:</strong> We do not access any
              spreadsheets other than the one created by our app for sales
              tracking. We do not read, modify, or delete your other
              spreadsheets.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              5.2 Google Drive API (drive.file scope)
            </h3>
            <p className="mb-2">
              <strong>Why we need it:</strong> To create and access the sales
              tracking spreadsheet in your Google Drive.
            </p>
            <p className="mb-4">
              <strong>What we do with it:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>Create the initial sales tracking spreadsheet</li>
              <li>Access only files created by our application</li>
              <li>Enable offline synchronization</li>
            </ul>
            <p className="mb-4">
              <strong>What we DON'T do:</strong> The <code>drive.file</code>{" "}
              scope is limited to files created by our app. We cannot see,
              access, or modify any other files in your Google Drive.
            </p>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mt-4">
              <p className="text-sm">
                <strong className="text-yellow-400">Important:</strong> Band
                Merch POS's use and transfer of information received from Google
                APIs adheres to{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  className="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Data Sharing
            </h2>
            <p className="mb-4">
              <strong>
                We do not sell, rent, or share your personal information with
                third parties.
              </strong>
            </p>
            <p className="mb-4">
              Your data is shared only in the following limited circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Google Services:</strong> Your sales data is synced to
                your own Google Sheets. This is the core functionality of the
                app.
              </li>
              <li>
                <strong>Hosting Provider (Vercel):</strong> Our application is
                hosted on Vercel, which may have access to technical logs and
                metadata for infrastructure purposes.
              </li>
              <li>
                <strong>Legal Requirements:</strong> We may disclose information
                if required by law or to protect our rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              7. Your Rights
            </h2>
            <p className="mb-4">
              You have the following rights regarding your data:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>Access:</strong> Your sales data is stored in your own
                Google Sheets, which you can access at any time.
              </li>
              <li>
                <strong>Deletion:</strong> You can delete your Google Sheet to
                remove all sales data. You can also revoke our app's access in
                your Google Account settings.
              </li>
              <li>
                <strong>Export:</strong> You can export your data directly from
                your Google Sheets at any time.
              </li>
              <li>
                <strong>Revoke Access:</strong> You can revoke Band Merch POS's
                access to your Google account at any time via{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  className="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Account Permissions
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Data Security
            </h2>
            <p className="mb-4">We implement security measures including:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Encrypted OAuth tokens using Supabase Auth</li>
              <li>HTTPS encryption for all data transmission</li>
              <li>Secure browser storage using IndexedDB</li>
              <li>Regular security updates and dependency management</li>
              <li>Limited API scopes (minimal necessary permissions)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              9. Data Retention
            </h2>
            <p className="mb-4">
              <strong>Local Data:</strong> Sales data stored locally on your
              device remains until you clear your browser data or uninstall the
              app.
            </p>
            <p className="mb-4">
              <strong>Google Sheets Data:</strong> Your sales data in Google
              Sheets remains in your Google account indefinitely unless you
              delete it.
            </p>
            <p>
              <strong>Authentication Tokens:</strong> OAuth tokens are stored
              for the duration of your session and refreshed as needed. They
              expire automatically based on Google's token expiration policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              10. Children's Privacy
            </h2>
            <p>
              Band Merch POS is not intended for use by children under 13 years
              of age. We do not knowingly collect personal information from
              children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              11. International Users
            </h2>
            <p>
              This application is hosted in the United States. If you are
              accessing the application from outside the United States, please
              be aware that your information may be transferred to, stored, and
              processed in the United States where our servers are located.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              12. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. The "Last
              updated" date at the top of this page indicates when this policy
              was last revised. We encourage you to review this policy
              periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              13. Contact Us
            </h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or how we handle
              your data, please contact us:
            </p>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <p>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:privacy@yourband.com"
                  className="text-blue-400 hover:underline"
                >
                  privacy@yourband.com
                </a>
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                (Update this with your actual contact email)
              </p>
            </div>
          </section>

          <section className="border-t border-zinc-700 pt-8 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Google API Services Disclosure
            </h2>
            <p className="text-sm">
              Band Merch POS's use of information received from Google APIs will
              adhere to{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-700">
          <Link href="/" className="text-blue-400 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
