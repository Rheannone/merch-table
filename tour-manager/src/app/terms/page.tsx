import Link from "next/link";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-zinc-400 mb-8">Last updated: October 30, 2025</p>

        <div className="space-y-8 text-zinc-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing or using Band Merch POS ("the Service", "our app", or
              "we"), you agree to be bound by these Terms of Service. If you do
              not agree to these terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. Description of Service
            </h2>
            <p className="mb-4">
              Band Merch POS is a point of sale application designed to help
              musicians, bands, and tour managers track merchandise sales. The
              Service provides:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Product and inventory management</li>
              <li>Sales transaction recording</li>
              <li>Payment method tracking</li>
              <li>Google Sheets integration for data storage</li>
              <li>Offline-first functionality</li>
              <li>Sales analytics and reporting</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. User Accounts
            </h2>
            <h3 className="text-xl font-semibold text-white mb-2">
              3.1 Google Account
            </h3>
            <p className="mb-4">
              To use the Service, you must sign in with a valid Google account.
              You are responsible for maintaining the security of your Google
              account.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              3.2 Account Responsibility
            </h3>
            <p>
              You are responsible for all activity that occurs under your
              account. You agree to notify us immediately of any unauthorized
              use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Acceptable Use
            </h2>
            <p className="mb-4">
              You agree to use the Service only for lawful purposes. You agree
              NOT to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the Service to sell illegal products or services</li>
              <li>
                Violate any laws, regulations, or third-party rights (including
                intellectual property rights)
              </li>
              <li>
                Attempt to interfere with, compromise, or damage the Service's
                systems or security
              </li>
              <li>
                Use the Service to transmit malware, viruses, or harmful code
              </li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
              <li>
                Use automated scripts, bots, or other methods to access the
                Service (except for personal offline sync)
              </li>
              <li>Resell or redistribute the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. Your Data and Content
            </h2>
            <h3 className="text-xl font-semibold text-white mb-2">
              5.1 Ownership
            </h3>
            <p className="mb-4">
              You retain all ownership rights to your sales data, product
              information, and other content you input into the Service. We do
              not claim ownership of your data.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              5.2 Data Storage
            </h3>
            <p className="mb-4">
              Your data is stored in <strong>your own Google Sheets</strong> in
              your Google Drive account. We do not store your sales data on our
              servers. You are responsible for backing up your data.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              5.3 Data Loss
            </h3>
            <p>
              While we strive to provide reliable service, we are not
              responsible for any data loss that may occur. We strongly
              recommend regularly exporting or backing up your Google Sheets
              data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Google API Services
            </h2>
            <p className="mb-4">
              By using the Service, you acknowledge and agree that:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                The Service uses Google APIs to access your Google Sheets and
                Drive
              </li>
              <li>
                You grant the Service permission to access your Google account
                for the purposes described in our{" "}
                <a href="/privacy" className="text-blue-400 hover:underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                You can revoke access at any time through your{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  className="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Account Permissions
                </a>
              </li>
              <li>
                Our use of Google APIs is subject to Google's{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  className="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  API Services User Data Policy
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              7. Service Availability
            </h2>
            <h3 className="text-xl font-semibold text-white mb-2">
              7.1 No Guarantee of Uptime
            </h3>
            <p className="mb-4">
              While we strive to provide reliable service, we do not guarantee
              that the Service will be available 100% of the time. The Service
              may be unavailable due to maintenance, updates, or unforeseen
              technical issues.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              7.2 Offline Functionality
            </h3>
            <p>
              The Service includes offline functionality that allows you to
              record sales without internet connectivity. Offline data will sync
              when you reconnect to the internet.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Payment Processing
            </h2>
            <p className="mb-4">
              <strong>Important:</strong> Band Merch POS is a sales tracking
              tool only. We do NOT:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>Process credit card payments</li>
              <li>Handle or transmit payment information</li>
              <li>Act as a payment processor or merchant of record</li>
              <li>Provide financial services</li>
            </ul>
            <p>
              You are responsible for handling all actual payment processing
              through your own methods (cash, Venmo, credit card terminals,
              etc.). We only track which payment method was used.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              9. Disclaimers and Limitations of Liability
            </h2>
            <h3 className="text-xl font-semibold text-white mb-2">
              9.1 "AS IS" Service
            </h3>
            <p className="mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
              LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              9.2 No Liability
            </h3>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR USE, WHETHER
              ARISING FROM:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mb-4">
              <li>Your use or inability to use the Service</li>
              <li>Data loss or corruption</li>
              <li>Errors or inaccuracies in sales tracking</li>
              <li>Service interruptions or downtime</li>
              <li>Third-party services (including Google APIs)</li>
              <li>Unauthorized access to your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-white mb-2">
              9.3 Financial Decisions
            </h3>
            <p>
              You acknowledge that the Service is a sales tracking tool and
              should not be your only method of tracking financial information.
              You are responsible for maintaining accurate financial records and
              complying with all applicable tax and accounting requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              10. Indemnification
            </h2>
            <p>
              You agree to indemnify, defend, and hold harmless Band Merch POS,
              its developers, and associated parties from any claims, damages,
              losses, liabilities, and expenses (including legal fees) arising
              from:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any laws or third-party rights</li>
              <li>Your sales activities or merchandise</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              11. Termination
            </h2>
            <h3 className="text-xl font-semibold text-white mb-2">
              11.1 By You
            </h3>
            <p className="mb-4">
              You may stop using the Service at any time. To fully terminate
              your account, revoke access through your Google Account
              permissions.
            </p>

            <h3 className="text-xl font-semibold text-white mb-2">
              11.2 By Us
            </h3>
            <p>
              We reserve the right to suspend or terminate your access to the
              Service at any time, with or without cause, including for
              violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              12. Modifications to Service
            </h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the
              Service (or any part thereof) at any time, with or without notice.
              We are not liable to you or any third party for any modification,
              suspension, or discontinuation of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              13. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. The "Last updated"
              date at the top indicates when these Terms were last revised. Your
              continued use of the Service after any changes constitutes
              acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              14. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the United States, without regard to conflict of law
              principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              15. Dispute Resolution
            </h2>
            <p>
              Any disputes arising from these Terms or your use of the Service
              shall be resolved through binding arbitration, except where
              prohibited by law. You waive any right to participate in
              class-action lawsuits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              16. Severability
            </h2>
            <p>
              If any provision of these Terms is found to be invalid or
              unenforceable, the remaining provisions shall remain in full force
              and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              17. Entire Agreement
            </h2>
            <p>
              These Terms, together with our Privacy Policy, constitute the
              entire agreement between you and Band Merch POS regarding the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              18. Contact Information
            </h2>
            <p className="mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
              <p>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:support@yourband.com"
                  className="text-blue-400 hover:underline"
                >
                  support@yourband.com
                </a>
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                (Update this with your actual contact email)
              </p>
            </div>
          </section>

          <section className="border-t border-zinc-700 pt-8 mt-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Acknowledgment
            </h2>
            <p>
              BY USING BAND MERCH POS, YOU ACKNOWLEDGE THAT YOU HAVE READ THESE
              TERMS OF SERVICE AND AGREE TO BE BOUND BY THEM.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-zinc-700 flex gap-6">
          <Link href="/" className="text-blue-400 hover:underline">
            ← Back to Home
          </Link>
          <Link href="/privacy" className="text-blue-400 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
